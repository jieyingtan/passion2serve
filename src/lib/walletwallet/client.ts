import { getRequiredEnv } from "@/lib/config";
import { walletPassArtwork } from "@/lib/walletwallet/artwork";

interface WalletPassInput {
  barcodeValue: string;
  fullName: string;
}

interface AttendanceWalletUpdateInput extends WalletPassInput {
  eventName: string;
  eventDate: string;
}

interface WalletWalletResponse {
  serialNumber: string;
  googleSaveUrl: string;
  applePass: string;
  shareUrl: string;
}

export interface WalletWalletUpdateResponse {
  serialNumber: string;
  lastUpdated: number;
  notifiedDevices: number;
  unchanged: boolean;
}

export function isWalletWalletConfigured() {
  return Boolean(process.env.WALLETWALLET_API_KEY);
}

export function buildWalletPassPayload(input: WalletPassInput) {
  return {
    barcodeValue: input.barcodeValue,
    barcodeFormat: "QR",
    logoText: "Passion2Serve",
    organizationName: "Passion2Serve",
    colorPreset: "blue",
    color: "#c8e8ee",
    ...walletPassArtwork,
    primaryFields: [{ label: "PARTICIPANT", value: input.fullName }],
    secondaryFields: [{ label: "STATUS", value: "Active" }],
    backFields: [
      { label: "USE", value: "Present this pass after completing an event to record attendance." },
    ],
  };
}

export function buildAttendanceWalletPassPayload(input: AttendanceWalletUpdateInput) {
  const base = buildWalletPassPayload(input);
  return {
    ...base,
    backFields: [
      ...base.backFields,
      {
        label: "LATEST ATTENDANCE",
        value: input.eventName,
        changeMessage: "Attendance confirmed for %@. Thank you for participating!",
      },
    ],
  };
}

export async function createWalletPass(input: WalletPassInput): Promise<WalletWalletResponse> {
  const response = await fetch("https://api.walletwallet.dev/api/passes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRequiredEnv("WALLETWALLET_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildWalletPassPayload(input)),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WalletWallet pass creation failed with status ${response.status}.`);
  }

  return (await response.json()) as WalletWalletResponse;
}

export async function updateWalletPassAfterAttendance(
  serialNumber: string,
  input: AttendanceWalletUpdateInput,
): Promise<WalletWalletUpdateResponse> {
  const response = await fetch(`https://api.walletwallet.dev/api/passes/${encodeURIComponent(serialNumber)}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${getRequiredEnv("WALLETWALLET_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildAttendanceWalletPassPayload(input)),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WalletWallet attendance update failed with status ${response.status}.`);
  }

  return (await response.json()) as WalletWalletUpdateResponse;
}
