// Uses Web Crypto API (available in both Edge Runtime and Node.js 18+)
export const COOKIE_NAME = "tb_auth";

const TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

const enc = new TextEncoder();

function getAppSecret(): string {
  const s = process.env.APP_SECRET;
  if (!s) throw new Error("APP_SECRET env var is required");
  if (s.length < 32) throw new Error("APP_SECRET must be at least 32 characters");
  return s;
}

async function getKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function hmacHex(payload: string, secret: string): Promise<string> {
  const key = await getKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAuthToken(): Promise<string> {
  const secret = getAppSecret();
  const payload = `traceback:${Date.now()}`;
  const sig = await hmacHex(payload, secret);
  return btoa(`${payload}:${sig}`).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function verifyAuthToken(token: string): Promise<boolean> {
  try {
    const secret = getAppSecret();
    const decoded = atob(token.replace(/-/g, "+").replace(/_/g, "/"));
    const lastColon = decoded.lastIndexOf(":");
    const payload = decoded.slice(0, lastColon);
    const sig = decoded.slice(lastColon + 1);

    // Validate token age before HMAC to fail fast on expired tokens
    const issuedAt = parseInt(payload.split(":")[1], 10);
    if (!issuedAt || Date.now() - issuedAt > TOKEN_TTL_MS) return false;

    const expected = await hmacHex(payload, secret);
    // Constant-time comparison
    if (sig.length !== expected.length) return false;
    let diff = 0;
    for (let i = 0; i < sig.length; i++) {
      diff |= sig.charCodeAt(i) ^ expected.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}
