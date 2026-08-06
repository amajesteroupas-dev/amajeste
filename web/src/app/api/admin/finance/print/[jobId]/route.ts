import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

type Ctx = { params: Promise<{ jobId: string }> };

/** Marca job como impresso (após print do browser / agente local). */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const { jobId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const status = String(body.status || "PRINTED").toUpperCase();

  const job = await prisma.printJob.update({
    where: { id: jobId },
    data: {
      status: status === "FAILED" ? "FAILED" : "PRINTED",
      error: body.error ? String(body.error) : null,
    },
  });

  await prisma.order.update({
    where: { id: job.orderId },
    data: {
      printStatus: status === "FAILED" ? "ERROR" : "PRINTED",
      printedAt: status === "FAILED" ? undefined : new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
