import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  getTrafficIntegrationsPublic,
  saveTrafficIntegrations,
} from "@/lib/traffic-ads-settings";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

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
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const integrations = await getTrafficIntegrationsPublic();
  return NextResponse.json({ integrations });
}

export async function PUT(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const integrations = await saveTrafficIntegrations({
    metaPixelId:
      body.metaPixelId !== undefined ? String(body.metaPixelId) : undefined,
    metaCapiToken:
      body.metaCapiToken !== undefined ? String(body.metaCapiToken) : undefined,
    metaAdsToken:
      body.metaAdsToken !== undefined ? String(body.metaAdsToken) : undefined,
    metaAdAccountId:
      body.metaAdAccountId !== undefined
        ? String(body.metaAdAccountId)
        : undefined,
    metaPageId:
      body.metaPageId !== undefined ? String(body.metaPageId) : undefined,
    clearMetaCapiToken: Boolean(body.clearMetaCapiToken),
    clearMetaAdsToken: Boolean(body.clearMetaAdsToken),
    googleCustomerId:
      body.googleCustomerId !== undefined
        ? String(body.googleCustomerId)
        : undefined,
    googleDeveloperToken:
      body.googleDeveloperToken !== undefined
        ? String(body.googleDeveloperToken)
        : undefined,
    googleClientId:
      body.googleClientId !== undefined
        ? String(body.googleClientId)
        : undefined,
    googleClientSecret:
      body.googleClientSecret !== undefined
        ? String(body.googleClientSecret)
        : undefined,
    googleRefreshToken:
      body.googleRefreshToken !== undefined
        ? String(body.googleRefreshToken)
        : undefined,
    clearGoogleSecrets: Boolean(body.clearGoogleSecrets),
    tiktokPixelId:
      body.tiktokPixelId !== undefined ? String(body.tiktokPixelId) : undefined,
    tiktokAccessToken:
      body.tiktokAccessToken !== undefined
        ? String(body.tiktokAccessToken)
        : undefined,
    clearTiktokToken: Boolean(body.clearTiktokToken),
    pinterestAdAccountId:
      body.pinterestAdAccountId !== undefined
        ? String(body.pinterestAdAccountId)
        : undefined,
    pinterestAccessToken:
      body.pinterestAccessToken !== undefined
        ? String(body.pinterestAccessToken)
        : undefined,
    clearPinterestToken: Boolean(body.clearPinterestToken),
    instagramUserId:
      body.instagramUserId !== undefined
        ? String(body.instagramUserId)
        : undefined,
    instagramAccessToken:
      body.instagramAccessToken !== undefined
        ? String(body.instagramAccessToken)
        : undefined,
    clearInstagramToken: Boolean(body.clearInstagramToken),
  });

  void writeAuditLog({
    category: "marketing",
    action: "update",
    summary: "Integrações de tráfego (Pixel / Ads / CAPI) atualizadas",
    entityType: "SiteSetting",
    entityId: "trafficIntegrations",
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({ integrations });
}
