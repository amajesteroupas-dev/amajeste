import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

type Ctx = { params: Promise<{ id: string }> };

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

function normalizeTime(raw: unknown): string | null {
  if (raw == null || raw === "") return null;
  const s = String(raw).trim();
  const m = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function normalizeCategory(raw: unknown): string | null {
  if (raw == null) return null;
  const s = String(raw).trim().slice(0, 40);
  return s || null;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};

  if (body.title !== undefined) {
    const title = String(body.title).trim();
    if (!title) {
      return NextResponse.json({ error: "Título inválido" }, { status: 400 });
    }
    data.title = title;
  }
  if (body.notes !== undefined) {
    data.notes = body.notes ? String(body.notes).trim() : null;
  }
  if (body.status !== undefined) {
    const status = String(body.status).toUpperCase();
    if (!["TODO", "DONE", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }
    data.status = status;
  }
  if (body.priority !== undefined) {
    data.priority = Math.min(2, Math.max(0, Number(body.priority) || 0));
  }
  if (body.dueDate !== undefined) {
    const dueRaw = String(body.dueDate).slice(0, 10);
    data.dueDate = startOfDay(new Date(`${dueRaw}T12:00:00`));
  }
  if (body.dueTime !== undefined) {
    if (body.dueTime === null || body.dueTime === "") {
      data.dueTime = null;
    } else {
      const dueTime = normalizeTime(body.dueTime);
      if (!dueTime) {
        return NextResponse.json(
          { error: "Horário inválido. Use HH:mm (ex.: 09:30)" },
          { status: 400 }
        );
      }
      data.dueTime = dueTime;
    }
  }
  if (body.category !== undefined) {
    data.category = normalizeCategory(body.category);
  }

  const task = await prisma.adminTask.update({ where: { id }, data });
  return NextResponse.json({ ok: true, task });
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { id } = await ctx.params;
  await prisma.adminTask.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
