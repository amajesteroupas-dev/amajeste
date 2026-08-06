import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { AuditLogClient } from "@/components/admin/AuditLogClient";

export const dynamic = "force-dynamic";

type Search = {
  category?: string;
  action?: string;
  q?: string;
};

export default async function AdminLogsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const sp = await searchParams;
  const category = (sp.category || "").trim();
  const action = (sp.action || "").trim();
  const q = (sp.q || "").trim();

  const where: {
    category?: string;
    action?: string;
    OR?: Array<
      | { summary: { contains: string; mode: "insensitive" } }
      | { actorEmail: { contains: string; mode: "insensitive" } }
      | { actorName: { contains: string; mode: "insensitive" } }
      | { entityId: { contains: string; mode: "insensitive" } }
    >;
  } = {};

  if (category && category !== "all") where.category = category;
  if (action && action !== "all") where.action = action;
  if (q) {
    where.OR = [
      { summary: { contains: q, mode: "insensitive" } },
      { actorEmail: { contains: q, mode: "insensitive" } },
      { actorName: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
    ];
  }

  let rows: Awaited<ReturnType<typeof prisma.auditLog.findMany>> = [];
  let total = 0;
  try {
    [rows, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: 200,
      }),
      prisma.auditLog.count({ where }),
    ]);
  } catch {
    rows = [];
    total = 0;
  }

  return (
    <div>
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Log do sistema
      </h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Registro de criações, alterações, exclusões e lançamentos. Filtre por
        categoria para acompanhar o que mudou na loja.
      </p>

      <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
        <AuditLogClient
          category={category || "all"}
          action={action || "all"}
          q={q}
          total={total}
          rows={rows.map((r) => ({
            id: r.id,
            createdAt: r.createdAt.toISOString(),
            category: r.category,
            action: r.action,
            entityType: r.entityType,
            entityId: r.entityId,
            summary: r.summary,
            detail: r.detail,
            actorEmail: r.actorEmail,
            actorName: r.actorName,
            source: r.source,
          }))}
        />
      </Suspense>
    </div>
  );
}
