import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";
import { TRAFFIC_PLATFORMS } from "@/lib/traffic-guides";

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

function platformOk(p: string) {
  return TRAFFIC_PLATFORMS.some((x) => x.id === p);
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const items = await prisma.trafficCampaign.findMany({
    orderBy: [{ active: "desc" }, { startedAt: "desc" }],
    take: 100,
  });
  return NextResponse.json({
    items: items.map((c) => ({
      ...c,
      spend: Number(c.spend),
      revenue: Number(c.revenue),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const name = String(body.name || "").trim();
  const platform = String(body.platform || "meta");
  const kind = body.kind === "organic" ? "organic" : "paid";
  if (!name) {
    return NextResponse.json({ error: "Informe o nome da campanha" }, { status: 400 });
  }
  if (!platformOk(platform)) {
    return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
  }

  const campaign = await prisma.trafficCampaign.create({
    data: {
      name,
      platform,
      kind,
      objective: body.objective ? String(body.objective).slice(0, 200) : null,
      spend: Number(body.spend) || 0,
      revenue: Number(body.revenue) || 0,
      clicks: Math.max(0, Math.floor(Number(body.clicks) || 0)),
      leads: Math.max(0, Math.floor(Number(body.leads) || 0)),
      orders: Math.max(0, Math.floor(Number(body.orders) || 0)),
      notes: body.notes ? String(body.notes).slice(0, 2000) : null,
      startedAt: body.startedAt ? new Date(body.startedAt) : new Date(),
      endedAt: body.endedAt ? new Date(body.endedAt) : null,
      active: body.active !== false,
    },
  });

  void writeAuditLog({
    category: "marketing",
    action: "create",
    summary: `Campanha de tráfego: ${name} (${platform})`,
    entityType: "TrafficCampaign",
    entityId: campaign.id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({
    item: {
      ...campaign,
      spend: Number(campaign.spend),
      revenue: Number(campaign.revenue),
    },
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

  const data: Record<string, unknown> = {};
  if (body.name !== undefined) data.name = String(body.name).trim();
  if (body.platform !== undefined) {
    if (!platformOk(String(body.platform))) {
      return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
    }
    data.platform = String(body.platform);
  }
  if (body.kind !== undefined) {
    data.kind = body.kind === "organic" ? "organic" : "paid";
  }
  if (body.objective !== undefined) {
    data.objective = body.objective ? String(body.objective).slice(0, 200) : null;
  }
  if (body.spend !== undefined) data.spend = Number(body.spend) || 0;
  if (body.revenue !== undefined) data.revenue = Number(body.revenue) || 0;
  if (body.clicks !== undefined) data.clicks = Math.max(0, Math.floor(Number(body.clicks) || 0));
  if (body.leads !== undefined) data.leads = Math.max(0, Math.floor(Number(body.leads) || 0));
  if (body.orders !== undefined) data.orders = Math.max(0, Math.floor(Number(body.orders) || 0));
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).slice(0, 2000) : null;
  }
  if (body.active !== undefined) data.active = Boolean(body.active);
  if (body.startedAt !== undefined) data.startedAt = new Date(body.startedAt);
  if (body.endedAt !== undefined) {
    data.endedAt = body.endedAt ? new Date(body.endedAt) : null;
  }

  const campaign = await prisma.trafficCampaign.update({
    where: { id },
    data,
  });

  void writeAuditLog({
    category: "marketing",
    action: "update",
    summary: `Campanha de tráfego atualizada: ${campaign.name}`,
    entityType: "TrafficCampaign",
    entityId: campaign.id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({
    item: {
      ...campaign,
      spend: Number(campaign.spend),
      revenue: Number(campaign.revenue),
    },
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
  await prisma.trafficCampaign.delete({ where: { id } });
  void writeAuditLog({
    category: "marketing",
    action: "delete",
    summary: "Campanha de tráfego excluída",
    entityType: "TrafficCampaign",
    entityId: id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });
  return NextResponse.json({ ok: true });
}
