import { getRequiredEnv } from "@/lib/config";

interface WalletPassInput {
  barcodeValue: string;
  fullName: string;
}

interface WalletWalletResponse {
  serialNumber: string;
  googleSaveUrl: string;
  applePass: string;
  shareUrl: string;
}

export function isWalletWalletConfigured() {
  return Boolean(process.env.WALLETWALLET_API_KEY);
}

export async function createWalletPass(input: WalletPassInput): Promise<WalletWalletResponse> {
  const response = await fetch("https://api.walletwallet.dev/api/passes", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getRequiredEnv("WALLETWALLET_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Passion2Serve Membership",
      organizationName: "Passion2Serve",
      logoText: "Passion2Serve",
      description: "Passion2Serve participant membership pass",
      barcodeFormat: "QR",
      barcodeValue: input.barcodeValue,
      colorPreset: "green",
      primaryFields: [{ label: "MEMBER", value: input.fullName }],
      secondaryFields: [{ label: "STATUS", value: "Active participant" }],
      backFields: [
        { label: "USE", value: "Present this pass after completing an event to record attendance." },
      ],
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`WalletWallet pass creation failed with status ${response.status}.`);
  }

  return (await response.json()) as WalletWalletResponse;
}

