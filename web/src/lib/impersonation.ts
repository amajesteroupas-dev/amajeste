import { SignJWT, jwtVerify } from "jose";
import { createHash, randomBytes } from "crypto";

const PURPOSE = "admin_impersonate_customer";
const TTL = "2m";

function secretKey() {
  const raw =
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.ADMIN_AUTH_SECRET;
  if (!raw) {
    throw new Error("AUTH_SECRET não configurado");
  }
  return new TextEncoder().encode(raw);
}

/** Token de uso único (curto) para admin entrar como cliente na loja. */
export async function createImpersonationToken(opts: {
  userId: string;
  adminId: string;
  customerId: string;
}) {
  const jti = randomBytes(16).toString("hex");
  const token = await new SignJWT({
    purpose: PURPOSE,
    adminId: opts.adminId,
    customerId: opts.customerId,
    jti,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(opts.userId)
    .setIssuedAt()
    .setExpirationTime(TTL)
    .sign(secretKey());

  return { token, jti };
}

export async function verifyImpersonationToken(raw: string): Promise<{
  userId: string;
  adminId: string;
  customerId: string;
  jti: string;
} | null> {
  try {
    const { payload } = await jwtVerify(String(raw || ""), secretKey(), {
      algorithms: ["HS256"],
    });
    if (payload.purpose !== PURPOSE) return null;
    const userId = String(payload.sub || "");
    const adminId = String(payload.adminId || "");
    const customerId = String(payload.customerId || "");
    const jti = String(payload.jti || "");
    if (!userId || !adminId || !customerId || !jti) return null;
    return { userId, adminId, customerId, jti };
  } catch {
    return null;
  }
}

/** Hash do jti para invalidar reuso em memória/processo (best-effort). */
const usedJtis = new Map<string, number>();

export function consumeImpersonationJti(jti: string) {
  const now = Date.now();
  for (const [k, exp] of usedJtis) {
    if (exp < now) usedJtis.delete(k);
  }
  if (usedJtis.has(jti)) return false;
  usedJtis.set(jti, now + 5 * 60 * 1000);
  return true;
}

export function hashJti(jti: string) {
  return createHash("sha256").update(jti).digest("hex").slice(0, 16);
}
