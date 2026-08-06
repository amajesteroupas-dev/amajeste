import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  createSitePromotion,
  deleteSitePromotion,
  isPromoLive,
  listSitePromotions,
  setSitePromotionEnabled,
  updateSitePromotion,
  type PromoPaymentScope,
} from "@/lib/promotion-settings";
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

function parseOptionalIso(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === "" || value == null) return null;
  return String(value);
}

function scheduleError(startsAt: string | null, endsAt: string | null) {
  if (!startsAt || !endsAt) return null;
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return "Datas inválidas";
  }
  if (start.getTime() >= end.getTime()) {
    return "A data de início deve ser anterior à data de fim";
  }
  return null;
}

/** Parcelas sem juros (1 = à vista). Vale para promoções all/card. */
function parseCardInstallmentsMax(
  scope: PromoPaymentScope,
  body: Record<string, unknown>
): number | null {
  if (scope === "pix") return null;

  if (body.cardOneShot === true) return 1;
  if (body.cardOneShot === false && body.cardInstallmentsMax == null) {
    return null;
  }

  const raw =
    body.cardInstallmentsMax !== undefined
      ? body.cardInstallmentsMax
      : body.interestFreeInstallments;
  if (raw === undefined || raw === null || raw === "") return null;

  const n = Math.max(1, Math.min(12, Number(raw) || 1));
  return Number.isFinite(n) ? n : null;
}

function withStatus(list: Awaited<ReturnType<typeof listSitePromotions>>) {
  const now = new Date();
  return list.map((p) => ({
    ...p,
    currentlyActive: isPromoLive(p, now),
  }));
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const items = withStatus(await listSitePromotions());
  return NextResponse.json({
    items,
    activeCount: items.filter((i) => i.currentlyActive).length,
  });
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const scope = body.scope as PromoPaymentScope;
  if (scope !== "all" && scope !== "pix" && scope !== "card") {
    return NextResponse.json(
      { error: "Escolha o tipo: todo o site, Pix ou cartão" },
      { status: 400 }
    );
  }
  const percent = Number(body.percent);
  if (!Number.isFinite(percent) || percent <= 0 || percent > 90) {
    return NextResponse.json(
      { error: "Informe um percentual entre 1 e 90" },
      { status: 400 }
    );
  }
  const startsAt = parseOptionalIso(body.startsAt) ?? null;
  const endsAt = parseOptionalIso(body.endsAt) ?? null;
  const schedErr = scheduleError(startsAt, endsAt);
  if (schedErr) {
    return NextResponse.json({ error: schedErr }, { status: 400 });
  }
  const promo = await createSitePromotion({
    label: body.label,
    enabled: body.enabled !== false,
    percent,
    startsAt,
    endsAt,
    scope,
    cardInstallmentsMax: parseCardInstallmentsMax(scope, body),
  });
  void writeAuditLog({
    category: "promotions",
    action: "create",
    summary: `Promoção criada: ${promo.label || `${percent}% (${scope})`}`,
    entityType: "SitePromotion",
    entityId: promo.id,
    detail: { percent, scope, enabled: promo.enabled, startsAt, endsAt },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json({
    item: { ...promo, currentlyActive: isPromoLive(promo) },
  });
}

export async function PUT(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "");
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }

  if (typeof body.enabled === "boolean" && body.onlyToggle) {
    const updated = await setSitePromotionEnabled(id, body.enabled);
    if (!updated) {
      return NextResponse.json({ error: "Promoção não encontrada" }, { status: 404 });
    }
    void writeAuditLog({
      category: "promotions",
      action: "update",
      summary: `Promoção ${body.enabled ? "ativada" : "desativada"}: ${updated.label || id}`,
      entityType: "SitePromotion",
      entityId: updated.id,
      actor: actorFromSession(session),
      ip: requestIp(req),
    });
    return NextResponse.json({
      item: { ...updated, currentlyActive: isPromoLive(updated) },
    });
  }

  const scope = body.scope as PromoPaymentScope | undefined;
  const startsAt = parseOptionalIso(body.startsAt);
  const endsAt = parseOptionalIso(body.endsAt);

  if (startsAt !== undefined || endsAt !== undefined) {
    const list = await listSitePromotions();
    const current = list.find((p) => p.id === id);
    if (!current) {
      return NextResponse.json({ error: "Promoção não encontrada" }, { status: 404 });
    }
    const nextStart = startsAt !== undefined ? startsAt : current.startsAt;
    const nextEnd = endsAt !== undefined ? endsAt : current.endsAt;
    const schedErr = scheduleError(nextStart, nextEnd);
    if (schedErr) {
      return NextResponse.json({ error: schedErr }, { status: 400 });
    }
  }

  const listForScope = await listSitePromotions();
  const currentScope =
    (scope as PromoPaymentScope | undefined) ||
    listForScope.find((p) => p.id === id)?.scope ||
    "all";
  const shouldUpdateInstallments =
    body.cardOneShot !== undefined ||
    body.cardInstallmentsMax !== undefined ||
    body.interestFreeInstallments !== undefined ||
    scope !== undefined;

  const updated = await updateSitePromotion(id, {
    label: body.label,
    enabled: body.enabled,
    percent: body.percent,
    startsAt,
    endsAt,
    scope,
    cardInstallmentsMax: shouldUpdateInstallments
      ? parseCardInstallmentsMax(currentScope, body)
      : undefined,
  });
  if (!updated) {
    return NextResponse.json({ error: "Promoção não encontrada" }, { status: 404 });
  }
  void writeAuditLog({
    category: "promotions",
    action: "update",
    summary: `Promoção alterada: ${updated.label || id}`,
    entityType: "SitePromotion",
    entityId: updated.id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json({
    item: { ...updated, currentlyActive: isPromoLive(updated) },
  });
}

export async function DELETE(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id") || "";
  if (!id) {
    return NextResponse.json({ error: "ID obrigatório" }, { status: 400 });
  }
  const ok = await deleteSitePromotion(id);
  if (!ok) {
    return NextResponse.json({ error: "Promoção não encontrada" }, { status: 404 });
  }
  void writeAuditLog({
    category: "promotions",
    action: "delete",
    summary: `Promoção excluída`,
    entityType: "SitePromotion",
    entityId: id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json({ ok: true });
}
