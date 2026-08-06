import { prisma } from "@/lib/prisma";

export const AUDIT_CATEGORIES = [
  { id: "products", label: "Produtos" },
  { id: "inventory", label: "Estoque" },
  { id: "orders", label: "Pedidos" },
  { id: "finance", label: "Financeiro" },
  { id: "categories", label: "Categorias" },
  { id: "marketing", label: "Marketing" },
  { id: "promotions", label: "Promoções" },
  { id: "shipping", label: "Frete" },
  { id: "customers", label: "Clientes" },
  { id: "settings", label: "Configurações" },
  { id: "media", label: "Mídias" },
  { id: "system", label: "Sistema" },
] as const;

export type AuditCategory = (typeof AUDIT_CATEGORIES)[number]["id"];

export const AUDIT_ACTIONS = [
  { id: "create", label: "Criação" },
  { id: "update", label: "Alteração" },
  { id: "delete", label: "Exclusão" },
  { id: "restore", label: "Restauração" },
  { id: "launch", label: "Lançamento" },
  { id: "adjust", label: "Ajuste" },
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number]["id"];

export type AuditActor = {
  actorId?: string | null;
  actorEmail?: string | null;
  actorName?: string | null;
};

export type WriteAuditLogInput = {
  category: AuditCategory | string;
  action: AuditAction | string;
  summary: string;
  entityType?: string;
  entityId?: string;
  detail?: unknown;
  actor?: AuditActor | null;
  ip?: string | null;
  source?: "admin" | "store" | "webhook" | "system";
};

export function categoryLabel(id: string) {
  return AUDIT_CATEGORIES.find((c) => c.id === id)?.label || id;
}

export function actionLabel(id: string) {
  return AUDIT_ACTIONS.find((a) => a.id === id)?.label || id;
}

export function actorFromSession(session: {
  user?: {
    id?: string | null;
    email?: string | null;
    name?: string | null;
  } | null;
} | null): AuditActor {
  return {
    actorId: session?.user?.id || null,
    actorEmail: session?.user?.email || null,
    actorName: session?.user?.name || null,
  };
}

export function requestIp(req: Request | { headers: Headers }): string | null {
  try {
    const h = req.headers;
    const fwd = h.get("x-forwarded-for");
    if (fwd) return fwd.split(",")[0]?.trim() || null;
    return h.get("x-real-ip");
  } catch {
    return null;
  }
}

/** Grava log sem interromper a operação principal. */
export async function writeAuditLog(input: WriteAuditLogInput) {
  try {
    const detail =
      input.detail === undefined || input.detail === null
        ? null
        : typeof input.detail === "string"
          ? input.detail
          : JSON.stringify(input.detail);

    await prisma.auditLog.create({
      data: {
        category: String(input.category || "system").slice(0, 64),
        action: String(input.action || "update").slice(0, 32),
        summary: String(input.summary || "Ação").slice(0, 500),
        entityType: input.entityType
          ? String(input.entityType).slice(0, 64)
          : null,
        entityId: input.entityId ? String(input.entityId).slice(0, 64) : null,
        detail: detail ? detail.slice(0, 8000) : null,
        actorId: input.actor?.actorId || null,
        actorEmail: input.actor?.actorEmail || null,
        actorName: input.actor?.actorName || null,
        ip: input.ip || null,
        source: input.source || "admin",
      },
    });
  } catch (err) {
    console.error("[audit-log]", err);
  }
}
