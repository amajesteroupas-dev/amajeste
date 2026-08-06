import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { endOfDay, startOfDay } from "date-fns";

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

/** Lista tarefas — ?from=YYYY-MM-DD&to=YYYY-MM-DD ou ?date=YYYY-MM-DD */
export async function GET(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const date = sp.get("date");
  const from = sp.get("from");
  const to = sp.get("to");

  let where: { dueDate?: { gte: Date; lte: Date } } = {};
  if (date) {
    const d = new Date(`${date}T12:00:00`);
    where = { dueDate: { gte: startOfDay(d), lte: endOfDay(d) } };
  } else if (from && to) {
    where = {
      dueDate: {
        gte: startOfDay(new Date(`${from}T12:00:00`)),
        lte: endOfDay(new Date(`${to}T12:00:00`)),
      },
    };
  }

  const tasks = await prisma.adminTask.findMany({
    where,
    orderBy: [{ dueDate: "asc" }, { priority: "desc" }, { createdAt: "asc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title || "").trim();
  if (!title) {
    return NextResponse.json({ error: "Informe o título" }, { status: 400 });
  }

  const dueRaw = String(body.dueDate || "").slice(0, 10);
  const dueDate = dueRaw
    ? startOfDay(new Date(`${dueRaw}T12:00:00`))
    : startOfDay(new Date());

  const dueTime = normalizeTime(body.dueTime);
  if (body.dueTime && !dueTime) {
    return NextResponse.json(
      { error: "Horário inválido. Use HH:mm (ex.: 09:30)" },
      { status: 400 }
    );
  }

  const task = await prisma.adminTask.create({
    data: {
      title,
      notes: body.notes ? String(body.notes).trim() : null,
      dueDate,
      dueTime,
      category: normalizeCategory(body.category),
      priority: Math.min(2, Math.max(0, Number(body.priority) || 0)),
      createdBy: session.user.email || session.user.name || null,
    },
  });

  return NextResponse.json({ ok: true, task });
}
