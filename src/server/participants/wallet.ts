import { escapeEmailHtml, isMailjetConfigured, sendEmail } from "@/lib/mailjet/client";
import { signMembershipToken } from "@/lib/qr/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWalletPass, isWalletWalletConfigured } from "@/lib/walletwallet/client";

interface IssuePassInput {
  participantId: string;
  fullName: string;
  email: string;
}

export type WalletDeliveryResult =
  | { status: "sent"; shareUrl: string }
  | { status: "pending"; reason: string };

export async function issueAndEmailMembershipPass(input: IssuePassInput): Promise<WalletDeliveryResult> {
  const admin = createAdminClient();
  const passResult = await admin
    .from("membership_passes")
    .select("id, participant_id, token_version, status, share_url")
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
      .select("id, participant_id, token_version, status, share_url")
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
  if (!shareUrl) {
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
        google_save_url: walletPass.googleSaveUrl,
        share_url: walletPass.shareUrl,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", pass.id);
    if (updated.error) {
      throw new Error("The wallet pass was created but could not be saved.");
    }
    shareUrl = walletPass.shareUrl;
  }

  if (!isMailjetConfigured()) {
    return { status: "pending", reason: "Mailjet is not configured." };
  }

  await sendEmail({
    toEmail: input.email,
    toName: input.fullName,
    subject: "Your Passion2Serve membership pass is ready",
    text: `Welcome to Passion2Serve. Add your membership pass to Apple Wallet or Google Wallet: ${shareUrl}`,
    html: `<p>Welcome to Passion2Serve, ${escapeEmailHtml(input.fullName)}.</p><p>Your membership pass is ready for Apple Wallet and Google Wallet.</p><p><a href="${escapeEmailHtml(shareUrl)}">Add your membership pass</a></p><p>You can also retrieve the QR pass from your Passion2Serve profile at any time.</p>`,
  });

  return { status: "sent", shareUrl };
}
