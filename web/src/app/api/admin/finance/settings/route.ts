import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  getFinanceOpsSettings,
  maskSecret,
  setFinanceOpsSettings,
} from "@/lib/finance-settings";
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

function publicView(s: Awaited<ReturnType<typeof getFinanceOpsSettings>>) {
  return {
    costs: s.costs,
    margin: s.margin,
    nfe: {
      enabled: s.nfe.enabled,
      autoEmitOnPaid: s.nfe.autoEmitOnPaid,
      provider: s.nfe.provider,
      environment: s.nfe.environment,
      companyCnpj: s.nfe.companyCnpj,
      companyId: s.nfe.companyId,
      hasToken: Boolean(s.nfe.apiToken),
      tokenMasked: s.nfe.apiToken ? maskSecret(s.nfe.apiToken) : "",
    },
    print: {
      enabled: s.print.enabled,
      autoOnPaid: s.print.autoOnPaid,
      provider: s.print.provider,
      printNodePrinterId: s.print.printNodePrinterId,
      hasApiKey: Boolean(s.print.printNodeApiKey),
      apiKeyMasked: s.print.printNodeApiKey
        ? maskSecret(s.print.printNodeApiKey)
        : "",
    },
  };
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(publicView(await getFinanceOpsSettings()));
}

export async function PUT(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const looksMasked = (v?: string) =>
    Boolean(v && (v.includes("…") || v.includes("•") || v.includes("...")));

  await setFinanceOpsSettings({
    costs: body.costs,
    margin: body.margin,
    nfe: body.nfe
      ? {
          ...body.nfe,
          apiToken: looksMasked(body.nfe.apiToken)
            ? undefined
            : body.nfe.apiToken,
          clearToken: Boolean(body.nfe.clearToken),
        }
      : undefined,
    print: body.print
      ? {
          ...body.print,
          printNodeApiKey: looksMasked(body.print.printNodeApiKey)
            ? undefined
            : body.print.printNodeApiKey,
          clearApiKey: Boolean(body.print.clearApiKey),
        }
      : undefined,
  });

  void writeAuditLog({
    category: "finance",
    action: "update",
    summary: "Configurações financeiras atualizadas",
    entityType: "FinanceSettings",
    detail: {
      costs: Boolean(body.costs),
      margin: Boolean(body.margin),
      nfe: Boolean(body.nfe),
      print: Boolean(body.print),
    },
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json({
    ok: true,
    ...publicView(await getFinanceOpsSettings()),
  });
}
