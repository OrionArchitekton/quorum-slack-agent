import { describe, it, expect } from "vitest";
import crypto from "node:crypto";
import { verifySlackSignature } from "./verify.js";

function sign(secret: string, ts: string, body: string) {
  const base = `v0:${ts}:${body}`;
  return "v0=" + crypto.createHmac("sha256", secret).update(base).digest("hex");
}

it("accepts a valid signature", () => {
  const secret = "s3cr3t", ts = String(Math.floor(Date.now() / 1000)), body = "a=1";
  expect(verifySlackSignature({ secret, ts, body, sig: sign(secret, ts, body) })).toBe(true);
});
it("rejects a bad signature", () => {
  const ts = String(Math.floor(Date.now() / 1000));
  expect(verifySlackSignature({ secret: "x", ts, body: "a=1", sig: "v0=deadbeef" })).toBe(false);
});
it("rejects an old timestamp (>5 min)", () => {
  const secret = "s", ts = String(Math.floor(Date.now() / 1000) - 600), body = "a=1";
  expect(verifySlackSignature({ secret, ts, body, sig: sign(secret, ts, body) })).toBe(false);
});
