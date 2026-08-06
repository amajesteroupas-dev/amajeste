import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  clearOauthCookie,
  exchangeCodeForTokens,
  readOauthCookie,
  saveRefreshToken,
} from "@/lib/canva";

function siteBase() {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "") ||
    "https://amajeste.com.br"
  );
}

export async function GET(req: NextRequest) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.redirect(`${siteBase()}/admin/login`);
  }

  const url = req.nextUrl;
  const err = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const returnTo = `${siteBase()}/admin/banners`;

  if (err) {
    await clearOauthCookie();
    return NextResponse.redirect(
      `${returnTo}?canva=error&msg=${encodeURIComponent(err)}`
    );
  }

  const oauth = await readOauthCookie();
  if (!code || !state || !oauth || oauth.state !== state) {
    await clearOauthCookie();
    return NextResponse.redirect(`${returnTo}?canva=error&msg=estado_invalido`);
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      verifier: oauth.verifier,
    });
    if (tokens.refresh_token) {
      await saveRefreshToken(tokens.refresh_token);
    }
    await clearOauthCookie();
    return NextResponse.redirect(`${returnTo}?canva=connected`);
  } catch (e) {
    await clearOauthCookie();
    const msg = e instanceof Error ? e.message : "falha_token";
    return NextResponse.redirect(
      `${returnTo}?canva=error&msg=${encodeURIComponent(msg)}`
    );
  }
}
