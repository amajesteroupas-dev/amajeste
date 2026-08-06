import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  getDayChecklist,
  toggleChecklistItem,
  type ChecklistItemId,
} from "@/lib/sales-hub";

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

const IDS: ChecklistItemId[] = [
  "stock",
  "story",
  "reel",
  "ads",
  "orders",
  "diagnose",
];

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const checklist = await getDayChecklist();
  return NextResponse.json({ checklist });
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const id = String(body.id || "") as ChecklistItemId;
  if (!IDS.includes(id)) {
    return NextResponse.json({ error: "Item inválido" }, { status: 400 });
  }
  const done =
    body.done === undefined ? undefined : Boolean(body.done);
  const checklist = await toggleChecklistItem(id, done);
  return NextResponse.json({ checklist });
}
