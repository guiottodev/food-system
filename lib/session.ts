import crypto from "crypto";

const SESSION_TTL_SECONDS = 60 * 60 * 12;

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET ?? "";
  if (!secret) {
    throw new Error("SESSION_SECRET não configurado.");
  }
  return secret;
}

function signPayload(payload: string, secret: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createSessionValue(username: string) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const payload = `${username}.${issuedAt}`;
  const signature = signPayload(payload, getSessionSecret());
  return `${payload}.${signature}`;
}

export function verifySessionValue(value: string) {
  let secret: string;
  try {
    secret = getSessionSecret();
  } catch {
    return null;
  }

  const parts = value.split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [username, issuedAtRaw, signature] = parts;
  const issuedAt = Number(issuedAtRaw);
  if (!username || !issuedAt || Number.isNaN(issuedAt)) {
    return null;
  }

  const payload = `${username}.${issuedAt}`;
  const expected = signPayload(payload, secret);
  const isValid =
    expected.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!isValid) {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (now - issuedAt > SESSION_TTL_SECONDS) {
    return null;
  }

  return { username, issuedAt };
}

export function getSessionMaxAge() {
  return SESSION_TTL_SECONDS;
}
