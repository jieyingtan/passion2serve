import { signMembershipToken } from "@/lib/qr/token";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  isWalletWalletConfigured,
  updateWalletPassAfterAttendance,
} from "@/lib/walletwallet/client";

interface AttendanceWalletNotificationInput {
  participantId: string;
  eventId: string;
  participantName: string;
  eventName: string;
  eventDate: string;
}

export type AttendanceWalletNotificationResult = {
  status: "sent" | "skipped" | "failed";
  notifiedDevices: number;
  error?: string;
};

export async function sendAttendanceWalletNotification(
  input: AttendanceWalletNotificationInput,
): Promise<AttendanceWalletNotificationResult> {
  if (!isWalletWalletConfigured()) {
    return { status: "skipped", notifiedDevices: 0 };
  }

  const admin = createAdminClient();
  const idempotencyKey = `attendance_ack:${input.eventId}:${input.participantId}:wallet`;
  const { data: existing } = await admin
    .from("notification_deliveries")
    .select("status,payload")
    .eq("idempotency_key", idempotencyKey)
    .maybeSingle();

  if (existing && ["sent", "delivered", "read"].includes(existing.status)) {
    const payload = existing.payload && typeof existing.payload === "object"
      ? existing.payload as Record<string, unknown>
      : {};
    return {
      status: "sent",
      notifiedDevices: typeof payload.notifiedDevices === "number" ? payload.notifiedDevices : 0,
    };
  }

  const { data: pass, error: passError } = await admin
    .from("membership_passes")
    .select("id,participant_id,token_version,status,walletwallet_serial")
    .eq("participant_id", input.participantId)
    .maybeSingle();

  if (passError || !pass || pass.status !== "active" || !pass.walletwallet_serial) {
    return { status: "skipped", notifiedDevices: 0 };
  }

  const { data: delivery, error: deliveryError } = await admin
    .from("notification_deliveries")
    .upsert({
      participant_id: input.participantId,
      event_id: input.eventId,
      channel: "wallet",
      notification_type: "attendance_acknowledgement",
      idempotency_key: idempotencyKey,
      recipient: pass.walletwallet_serial,
      provider: "walletwallet",
      status: "pending",
      error: null,
      payload: { eventName: input.eventName, eventDate: input.eventDate },
    }, { onConflict: "idempotency_key" })
    .select("id")
    .single();

  if (deliveryError || !delivery) {
    return {
      status: "failed",
      notifiedDevices: 0,
      error: deliveryError?.message ?? "Wallet notification delivery could not be created.",
    };
  }

  try {
    const barcodeValue = signMembershipToken({
      v: 1,
      passId: pass.id,
      participantId: pass.participant_id,
      tokenVersion: pass.token_version,
    });
    const result = await updateWalletPassAfterAttendance(pass.walletwallet_serial, {
      barcodeValue,
      fullName: input.participantName,
      eventName: input.eventName,
      eventDate: input.eventDate,
    });
    const sentAt = new Date().toISOString();
    await Promise.all([
      admin.from("membership_passes").update({ last_synced_at: sentAt }).eq("id", pass.id),
      admin.from("notification_deliveries").update({
        status: "sent",
        provider_message_id: result.serialNumber,
        sent_at: sentAt,
        payload: {
          eventName: input.eventName,
          eventDate: input.eventDate,
          notifiedDevices: result.notifiedDevices,
          unchanged: result.unchanged,
        },
      }).eq("id", delivery.id),
    ]);
    return { status: "sent", notifiedDevices: result.notifiedDevices };
  } catch (error) {
    const message = error instanceof Error ? error.message : "WalletWallet delivery failed.";
    await admin.from("notification_deliveries").update({ status: "failed", error: message }).eq("id", delivery.id);
    return { status: "failed", notifiedDevices: 0, error: message };
  }
}
