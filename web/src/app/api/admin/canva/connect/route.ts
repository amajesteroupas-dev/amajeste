import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  buildAuthorizeUrl,
  canvaConfigured,
  createPkce,
  setOauthCookie,
} from "@/lib/canva";

async function requireStaff() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canvaConfigured()) {
    return NextResponse.json(
      {
        error:
          "Canva não configurado. Defina CANVA_CLIENT_ID e CANVA_CLIENT_SECRET.",
      },
      { status: 400 }
    );
  }

  const { verifier, challenge, state } = createPkce();
  await setOauthCookie({ verifier, state });
  const url = buildAuthorizeUrl({ challenge, state });
  return NextResponse.redirect(url);
}
