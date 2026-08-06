import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  dayKey,
  deviceFromUserAgent,
  hashIp,
  ipPrefix,
  requestClientIp,
  shouldTrackPath,
} from "@/lib/site-visit";
import { parseAttributionPayload } from "@/lib/traffic-attribution";

export const runtime = "nodejs";

/**
 * Beacon de visita da loja.
 * Dedupe: mesmo ipHash + path + sessionId no mesmo dia UTC.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const path = String(body.path || "/").split("?")[0].slice(0, 300);
  if (!shouldTrackPath(path)) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const sessionId = String(body.sessionId || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64) || null;
  const ua = (req.headers.get("user-agent") || String(body.userAgent || "")).slice(
    0,
    800
  );
  const ip = requestClientIp(req);
  const ipHash = hashIp(ip);
  const deviceType = deviceFromUserAgent(ua);
  const attr = parseAttributionPayload(body.attribution || body);

  const since = new Date(`${dayKey()}T00:00:00.000Z`);

  try {
    const existing = await prisma.siteVisit.findFirst({
      where: {
        ipHash,
        path,
        createdAt: { gte: since },
        ...(sessionId ? { sessionId } : {}),
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ ok: true, deduped: true });
    }

    await prisma.siteVisit.create({
      data: {
        path,
        ipHash,
        ipPrefix: ipPrefix(ip),
        userAgent: ua || null,
        deviceType,
        sessionId,
        utmSource: attr?.utmSource || null,
        utmMedium: attr?.utmMedium || null,
        utmCampaign: attr?.utmCampaign || null,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[analytics/visit]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
