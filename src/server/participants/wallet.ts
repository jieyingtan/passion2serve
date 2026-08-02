import { escapeEmailHtml, isMailjetConfigured, sendEmail } from "@/lib/mailjet/client";
import { getAppUrl } from "@/lib/config";
import { signMembershipToken } from "@/lib/qr/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWalletPass, isWalletWalletConfigured } from "@/lib/walletwallet/client";

interface IssuePassInput {
  participantId: string;
  fullName: string;
  email: string;
  forceReissue?: boolean;
  sendReadyEmail?: boolean;
}

export const CURRENT_WALLET_PASS_FORMAT_SINCE = "2026-08-02T02:24:00.000Z";

export type WalletDeliveryResult =
  | { status: "sent"; shareUrl: string }
  | { status: "pending"; reason: string };

export async function issueAndEmailMembershipPass(input: IssuePassInput): Promise<WalletDeliveryResult> {
  const admin = createAdminClient();
  const passResult = await admin
    .from("membership_passes")
    .select("id, participant_id, token_version, status, share_url, apple_storage_path, google_save_url")
    .eq("participant_id", input.participantId)
    .maybeSingle();
  let pass = passResult.data;

  if (passResult.error) {
    throw new Error("Unable to read the participant membership pass.");
  }

  if (!pass) {
    const created = await admin
      .from("membership_passes")
      .insert({ participant_id: input.participantId })
      .select("id, participant_id, token_version, status, share_url, apple_storage_path, google_save_url")
      .single();
    if (created.error || !created.data) {
      throw new Error("Unable to create the participant membership pass.");
    }
    pass = created.data;
  }

  if (pass.status !== "active") {
    throw new Error("The participant membership pass is not active.");
  }

  let shareUrl = pass.share_url as string | null;
  let applePassUrl = pass.apple_storage_path as string | null;
  let googleSaveUrl = pass.google_save_url as string | null;
  if (input.forceReissue || !shareUrl || !applePassUrl || !googleSaveUrl) {
    if (!isWalletWalletConfigured()) {
      return { status: "pending", reason: "WalletWallet is not configured." };
    }

    const barcodeValue = signMembershipToken({
      v: 1,
      passId: pass.id,
      participantId: pass.participant_id,
      tokenVersion: pass.token_version,
    });
    const walletPass = await createWalletPass({ barcodeValue, fullName: input.fullName });
    const updated = await admin
      .from("membership_passes")
      .update({
        walletwallet_serial: walletPass.serialNumber,
        apple_storage_path: walletPass.applePass,
        google_save_url: walletPass.googleSaveUrl,
        share_url: walletPass.shareUrl,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", pass.id);
    if (updated.error) {
      throw new Error("The wallet pass was created but could not be saved.");
    }
    shareUrl = walletPass.shareUrl;
    applePassUrl = walletPass.applePass;
    googleSaveUrl = walletPass.googleSaveUrl;
  }

  if (input.sendReadyEmail === false) {
    return { status: "sent", shareUrl };
  }

  if (!isMailjetConfigured()) {
    return { status: "pending", reason: "Mailjet is not configured." };
  }

  await sendEmail({
    toEmail: input.email,
    toName: input.fullName,
    subject: "Your Passion2Serve membership pass is ready",
    text: `Welcome to Passion2Serve. Sign in to add your Apple Wallet pass: ${getAppUrl()}/participant/pass. Google Wallet: ${googleSaveUrl}.`,
    html: `<p>Welcome to Passion2Serve, ${escapeEmailHtml(input.fullName)}.</p><p>Your membership pass is ready.</p><p><a href="${escapeEmailHtml(`${getAppUrl()}/participant/pass`)}">Sign in to add to Apple Wallet</a></p><p><a href="${escapeEmailHtml(googleSaveUrl)}">Add to Google Wallet</a></p><p>You can also retrieve the QR pass from your Passion2Serve profile at any time.</p>`,
  });

  return { status: "sent", shareUrl };
}
