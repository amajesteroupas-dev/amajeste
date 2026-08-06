import { SignJWT, jwtVerify } from "jose";
import { headers } from "next/headers";

const MOBILE_AUD = "majeste-mobile";
const MOBILE_ISS = "majeste-api";

function secretKey() {
  const secret =
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.MOBILE_JWT_SECRET;
  if (!secret) {
    throw new Error("NEXTAUTH_SECRET (ou AUTH_SECRET) não configurado");
  }
  return new TextEncoder().encode(secret);
}

export type MobileTokenPayload = {
  sub: string;
  email: string;
  name?: string | null;
  role: string;
};

export async function signMobileToken(
  payload: MobileTokenPayload,
  expiresIn = "30d"
) {
  return new SignJWT({
    email: payload.email,
    name: payload.name,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(payload.sub)
    .setIssuer(MOBILE_ISS)
    .setAudience(MOBILE_AUD)
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifyMobileToken(
  token: string
): Promise<MobileTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      issuer: MOBILE_ISS,
      audience: MOBILE_AUD,
    });
    if (!payload.sub || typeof payload.email !== "string") return null;
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : null,
      role: typeof payload.role === "string" ? payload.role : "CUSTOMER",
    };
  } catch {
    return null;
  }
}

/** Lê Authorization: Bearer do request atual. */
export async function getBearerToken(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("authorization") || h.get("Authorization");
  if (!raw) return null;
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}

export async function getMobileAuthUser(): Promise<MobileTokenPayload | null> {
  const token = await getBearerToken();
  if (!token) return null;
  return verifyMobileToken(token);
}
