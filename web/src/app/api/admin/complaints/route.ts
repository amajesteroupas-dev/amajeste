import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await adminAuth();
  if (!session?.user || (session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const complaint = await prisma.complaint.create({
    data: {
      customerId: body.customerId,
      orderId: body.orderId || null,
      type: body.type,
      subject: body.subject,
      description: body.description,
    },
  });
  return NextResponse.json(complaint);
}
