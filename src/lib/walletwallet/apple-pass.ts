export function decodeApplePass(encodedPass: string) {
  const base64 = encodedPass.replace(/^data:application\/vnd\.apple\.pkpass;base64,/, "");
  const bytes = Buffer.from(base64, "base64");

  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error("The Apple Wallet pass data is invalid.");
  }

  return new Uint8Array(bytes);
}
