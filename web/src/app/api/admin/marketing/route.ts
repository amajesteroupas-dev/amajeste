import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { getUnifiedMarketingContacts } from "@/lib/marketing-contacts";
import {
  actorFromSession,
  requestIp,
  writeAuditLog,
} from "@/lib/audit-log";

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

export async function GET() {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const [contacts, creatives, newsletterCount, customerCount] =
    await Promise.all([
      getUnifiedMarketingContacts(),
      prisma.marketingCreative.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      prisma.newsletterSubscriber.count({ where: { active: true } }),
      prisma.customer.count(),
    ]);

  return NextResponse.json({
    contacts,
    creatives,
    stats: {
      unique: contacts.length,
      newsletter: newsletterCount,
      cadastro: customerCount,
    },
  });
}

export async function POST(req: NextRequest) {
  const session = await requireStaff();
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const title = String(body.title || "").trim();
  const channel = body.channel === "INSTAGRAM" ? "INSTAGRAM" : "EMAIL";

  if (!title) {
    return NextResponse.json({ error: "Informe o título" }, { status: 400 });
  }

  const creative = await prisma.marketingCreative.create({
    data: {
      title,
      channel,
      format:
        channel === "INSTAGRAM"
          ? String(body.format || "IG_STORY")
          : "EMAIL",
      subject: body.subject ? String(body.subject) : null,
      body: body.body ? String(body.body) : null,
      imageUrl: body.imageUrl ? String(body.imageUrl) : null,
      ctaLabel: body.ctaLabel ? String(body.ctaLabel) : null,
      ctaHref: body.ctaHref ? String(body.ctaHref) : null,
      hashtags: body.hashtags ? String(body.hashtags) : null,
      status: "READY",
    },
  });

  void writeAuditLog({
    category: "marketing",
    action: "create",
    summary: `Criativo marketing: ${title} (${channel})`,
    entityType: "MarketingCreative",
    entityId: creative.id,
    actor: actorFromSession(session),
    ip: requestIp(req),
  });

  return NextResponse.json(creative);
}
