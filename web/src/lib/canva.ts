import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const AUTH_BASE =
  process.env.BASE_CANVA_CONNECT_AUTH_URL?.trim() ||
  "https://www.canva.com/api";
const API_BASE =
  process.env.BASE_CANVA_CONNECT_API_URL?.trim() ||
  "https://api.canva.com/rest";

const TOKEN_KEY = "canvaRefreshToken";
const OAUTH_COOKIE = "canva_oauth";

export const CANVA_SCOPES = [
  "design:content:write",
  "design:content:read",
  "design:meta:read",
  "asset:read",
  "asset:write",
  "profile:read",
].join(" ");

export function canvaConfigured() {
  return Boolean(
    process.env.CANVA_CLIENT_ID?.trim() &&
      process.env.CANVA_CLIENT_SECRET?.trim()
  );
}

export function canvaClientId() {
  return process.env.CANVA_CLIENT_ID?.trim() || "";
}

export function canvaClientSecret() {
  return process.env.CANVA_CLIENT_SECRET?.trim() || "";
}

export function canvaRedirectUri() {
  const explicit = process.env.CANVA_REDIRECT_URI?.trim();
  if (explicit) return explicit;
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://amajeste.com.br";
  return `${site.replace(/\/$/, "")}/api/admin/canva/callback`;
}

function basicAuthHeader() {
  const raw = `${canvaClientId()}:${canvaClientSecret()}`;
  return `Basic ${Buffer.from(raw).toString("base64")}`;
}

function base64Url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function createPkce() {
  const verifier = base64Url(randomBytes(32));
  const challenge = base64Url(
    createHash("sha256").update(verifier).digest()
  );
  const state = base64Url(randomBytes(16));
  return { verifier, challenge, state };
}

export async function setOauthCookie(data: {
  verifier: string;
  state: string;
}) {
  const jar = await cookies();
  jar.set(OAUTH_COOKIE, JSON.stringify(data), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 15,
  });
}

export async function readOauthCookie(): Promise<{
  verifier: string;
  state: string;
} | null> {
  const jar = await cookies();
  const raw = jar.get(OAUTH_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as { verifier?: string; state?: string };
    if (!parsed.verifier || !parsed.state) return null;
    return { verifier: parsed.verifier, state: parsed.state };
  } catch {
    return null;
  }
}

export async function clearOauthCookie() {
  const jar = await cookies();
  jar.delete(OAUTH_COOKIE);
}

export function buildAuthorizeUrl(params: {
  challenge: string;
  state: string;
}) {
  const url = new URL(`${AUTH_BASE}/oauth/authorize`);
  url.searchParams.set("code_challenge_method", "s256");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", canvaClientId());
  url.searchParams.set("redirect_uri", canvaRedirectUri());
  url.searchParams.set("scope", CANVA_SCOPES);
  url.searchParams.set("code_challenge", params.challenge);
  url.searchParams.set("state", params.state);
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

async function exchangeToken(body: URLSearchParams): Promise<TokenResponse> {
  const res = await fetch(`${API_BASE}/v1/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });
  const data = (await res.json().catch(() => ({}))) as TokenResponse & {
    message?: string;
    code?: string;
  };
  if (!res.ok || !data.access_token) {
    throw new Error(
      data.message || data.code || `Falha no token Canva (${res.status})`
    );
  }
  return data;
}

export async function exchangeCodeForTokens(params: {
  code: string;
  verifier: string;
}) {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code_verifier: params.verifier,
    code: params.code,
    redirect_uri: canvaRedirectUri(),
  });
  return exchangeToken(body);
}

export async function refreshAccessToken(refreshToken: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
  });
  return exchangeToken(body);
}

export async function saveRefreshToken(token: string) {
  await prisma.siteSetting.upsert({
    where: { key: TOKEN_KEY },
    create: { key: TOKEN_KEY, value: token },
    update: { value: token },
  });
}

export async function getStoredRefreshToken(): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: TOKEN_KEY },
    });
    return row?.value?.trim() || null;
  } catch {
    return null;
  }
}

export async function clearStoredRefreshToken() {
  try {
    await prisma.siteSetting.delete({ where: { key: TOKEN_KEY } });
  } catch {
    /* ignore */
  }
}

export async function getValidAccessToken(): Promise<string | null> {
  const refresh = await getStoredRefreshToken();
  if (!refresh) return null;
  try {
    const tokens = await refreshAccessToken(refresh);
    if (tokens.refresh_token) {
      await saveRefreshToken(tokens.refresh_token);
    }
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function createCustomDesign(params: {
  accessToken: string;
  width: number;
  height: number;
  title: string;
}) {
  const res = await fetch(`${API_BASE}/v1/designs`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${params.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      design_type: {
        type: "custom",
        width: params.width,
        height: params.height,
      },
      title: params.title.slice(0, 255),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    design?: {
      id?: string;
      urls?: { edit_url?: string; view_url?: string };
    };
    message?: string;
  };
  if (!res.ok || !data.design?.urls?.edit_url) {
    throw new Error(
      data.message || `Não foi possível criar o design (${res.status})`
    );
  }
  return {
    id: data.design.id || "",
    editUrl: data.design.urls.edit_url,
    viewUrl: data.design.urls.view_url || "",
  };
}
