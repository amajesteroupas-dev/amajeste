import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const note = await prisma.customerNote.create({
    data: {
      customerId: body.customerId,
      channel: body.channel,
      content: body.content,
      createdBy: session.user.email || undefined,
    },
  });
  return NextResponse.json(note);
}
