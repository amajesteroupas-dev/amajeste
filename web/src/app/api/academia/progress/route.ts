import { NextRequest, NextResponse } from "next/server";
import { requireCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { processAndSaveImage } from "@/lib/images";

export async function GET() {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const items = await prisma.fitnessProgress.findMany({
    where: { customerId: customer.id },
    orderBy: { recordedAt: "desc" },
  });
  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const contentType = req.headers.get("content-type") || "";
  let data: {
    weightKg?: number | null;
    bodyFatPct?: number | null;
    notes?: string | null;
    photoUrl?: string | null;
    recordedAt?: string;
    measurements?: unknown;
  } = {};

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    data.weightKg = form.get("weightKg")
      ? Number(form.get("weightKg"))
      : null;
    data.bodyFatPct = form.get("bodyFatPct")
      ? Number(form.get("bodyFatPct"))
      : null;
    data.notes = form.get("notes") ? String(form.get("notes")) : null;
    data.recordedAt = form.get("recordedAt")
      ? String(form.get("recordedAt"))
      : undefined;
    const file = form.get("file");
    if (file instanceof File && file.size > 0) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const saved = await processAndSaveImage(
        buffer,
        file.name || "progress.jpg",
        "progress"
      );
      data.photoUrl = saved.url;
    }
  } else {
    data = await req.json();
  }

  const item = await prisma.fitnessProgress.create({
    data: {
      customerId: customer.id,
      weightKg: data.weightKg ?? null,
      bodyFatPct: data.bodyFatPct ?? null,
      notes: data.notes ?? null,
      photoUrl: data.photoUrl ?? null,
      measurements: data.measurements ?? undefined,
      recordedAt: data.recordedAt ? new Date(data.recordedAt) : new Date(),
    },
  });
  return NextResponse.json(item);
}

export async function DELETE(req: NextRequest) {
  const customer = await requireCustomer();
  if (!customer) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id" }, { status: 400 });
  await prisma.fitnessProgress.deleteMany({
    where: { id, customerId: customer.id },
  });
  return NextResponse.json({ ok: true });
}
