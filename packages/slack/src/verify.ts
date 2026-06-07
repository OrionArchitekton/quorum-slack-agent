import crypto from "node:crypto";

export function verifySlackSignature(p: {
  secret: string; ts: string; body: string; sig: string;
}): boolean {
  const age = Math.abs(Date.now() / 1000 - Number(p.ts));
  if (!Number.isFinite(age) || age > 300) return false;
  const base = `v0:${p.ts}:${p.body}`;
  const expected = "v0=" + crypto.createHmac("sha256", p.secret).update(base).digest("hex");
  const a = Buffer.from(expected), b = Buffer.from(p.sig);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
