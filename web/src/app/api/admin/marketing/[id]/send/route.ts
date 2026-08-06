import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getUnifiedMarketingContacts } from "@/lib/marketing-contacts";
import {
  buildCampaignHtml,
  isMailConfigured,
  sendMarketingEmail,
} from "@/lib/mail";

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

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const creative = await prisma.marketingCreative.findUnique({ where: { id } });
  if (!creative) {
    return NextResponse.json({ error: "Arte não encontrada" }, { status: 404 });
  }
  if (creative.channel !== "EMAIL") {
    return NextResponse.json(
      { error: "Só artes de e-mail podem ser enviadas em massa" },
      { status: 400 }
    );
  }

  if (!isMailConfigured()) {
    return NextResponse.json(
      {
        error:
          "SMTP do Gmail não configurado. No servidor, defina SMTP_HOST=smtp.gmail.com, SMTP_USER=Josianesantosmajeste@gmail.com, SMTP_PASS=(Senha de app) e SMTP_FROM.",
        configured: false,
      },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const testOnly = Boolean(body.testOnly);
  const testTo = body.testTo ? String(body.testTo).trim().toLowerCase() : null;

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://equilibra.tech";
  const html = buildCampaignHtml({
    title: creative.title,
    body: creative.body,
    imageUrl: creative.imageUrl,
    ctaLabel: creative.ctaLabel,
    ctaHref: creative.ctaHref,
    siteUrl,
  });
  const subject = creative.subject || creative.title;

  if (testOnly) {
    const to = testTo || session.user.email;
    if (!to) {
      return NextResponse.json(
        { error: "Informe o e-mail de teste" },
        { status: 400 }
      );
    }
    await sendMarketingEmail({ to, subject: `[TESTE] ${subject}`, html });
    return NextResponse.json({ ok: true, sent: 1, test: true });
  }

  const contacts = await getUnifiedMarketingContacts();
  if (contacts.length === 0) {
    return NextResponse.json(
      { error: "Nenhum contato na lista" },
      { status: 400 }
    );
  }

  let sent = 0;
  const errors: string[] = [];
  for (const c of contacts) {
    try {
      await sendMarketingEmail({ to: c.email, subject, html });
      sent += 1;
    } catch (e) {
      errors.push(
        `${c.email}: ${e instanceof Error ? e.message : "falha"}`
      );
      if (errors.length > 20) break;
    }
  }

  await prisma.marketingCreative.update({
    where: { id },
    data: {
      status: "SENT",
      sentAt: new Date(),
      sentCount: sent,
    },
  });

  return NextResponse.json({
    ok: true,
    sent,
    total: contacts.length,
    errors: errors.slice(0, 10),
  });
}
