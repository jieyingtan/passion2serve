import { describe, expect, it } from "vitest";

import { decodeApplePass } from "@/lib/walletwallet/apple-pass";

describe("decodeApplePass", () => {
  const pkpassBytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x01, 0x02]);

  it("decodes WalletWallet's raw Base64 pkpass response", () => {
    expect(Array.from(decodeApplePass(pkpassBytes.toString("base64")))).toEqual(Array.from(pkpassBytes));
  });

  it("decodes a pkpass data URI", () => {
    const value = `data:application/vnd.apple.pkpass;base64,${pkpassBytes.toString("base64")}`;
    expect(Array.from(decodeApplePass(value))).toEqual(Array.from(pkpassBytes));
  });

  it("rejects content that is not a pkpass ZIP archive", () => {
    expect(() => decodeApplePass(Buffer.from("not a pass").toString("base64"))).toThrow("invalid");
  });
});
