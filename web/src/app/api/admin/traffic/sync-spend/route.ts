import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { syncAllAdSpend } from "@/lib/traffic-ads-sync";
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

/** Puxa gasto de Meta / Google Ads e atualiza campanhas do painel. */
export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const days = Math.min(90, Math.max(1, Number(body.days) || 7));

  const result = await syncAllAdSpend(days);

  void writeAuditLog({
    category: "marketing",
    action: "adjust",
    summary: `Sync de gasto Ads (${days} dias): Meta ${result.meta.updated}, Google ${result.google.updated}`,
    entityType: "TrafficCampaign",
    detail: result,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json(result);
}
