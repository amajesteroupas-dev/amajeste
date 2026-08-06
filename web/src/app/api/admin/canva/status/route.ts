import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  canvaConfigured,
  getStoredRefreshToken,
  getValidAccessToken,
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

  const configured = canvaConfigured();
  const hasRefresh = Boolean(await getStoredRefreshToken());
  let connected = false;
  if (configured && hasRefresh) {
    connected = Boolean(await getValidAccessToken());
  }

  return NextResponse.json({
    configured,
    connected,
    redirectUri: process.env.CANVA_REDIRECT_URI?.trim() || null,
  });
}
