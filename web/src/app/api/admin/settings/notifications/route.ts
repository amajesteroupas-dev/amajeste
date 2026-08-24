import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getNotifyConfig,
  maskSecret,
  setNotifyConfig,
  type WhatsappProvider,
} from "@/lib/notify-settings";
import { isMailConfigured, sendMarketingEmail } from "@/lib/mail";
import { sendWhatsappText } from "@/lib/whatsapp-send";

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

async function requirePassword(password: string) {
  if (!password) {
    return { ok: false as const, error: "Digite sua senha de admin", status: 403 };
  }
  const session = await adminAuth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { passwordHash: true },
      })
    : null;
  if (!user?.passwordHash) {
    return { ok: false as const, error: "Não autorizado", status: 401 };
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return { ok: false as const, error: "Senha incorreta", status: 403 };
  }
  return { ok: true as const };
}

function publicConfig() {
  return getNotifyConfig().then((cfg) => ({
    emailOnOrder: cfg.emailOnOrder,
    whatsappOnOrder: cfg.whatsappOnOrder,
    mailConfigured: cfg.mailConfigured,
    provider: cfg.provider,
    whatsappReady: cfg.whatsappReady,
    zapiInstanceMasked: cfg.zapiInstance ? maskSecret(cfg.zapiInstance) : "",
    zapiTokenMasked: cfg.zapiToken ? maskSecret(cfg.zapiToken) : "",
    zapiClientTokenMasked: cfg.zapiClientToken
      ? maskSecret(cfg.zapiClientToken)
      : "",
    hasZapi: Boolean(cfg.zapiInstance && cfg.zapiToken),
    evolutionUrl: cfg.evolutionUrl,
    evolutionInstance: cfg.evolutionInstance,
    evolutionKeyMasked: cfg.evolutionKey ? maskSecret(cfg.evolutionKey) : "",
    hasEvolution: Boolean(
      cfg.evolutionUrl && cfg.evolutionKey && cfg.evolutionInstance
    ),
  }));
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(await publicConfig());
}

export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const changingSecrets = Boolean(
    body.zapiInstance ||
      body.zapiToken ||
      body.zapiClientToken ||
      body.evolutionKey ||
      body.clearZapi ||
      body.clearEvolution
  );
  if (changingSecrets) {
    const authz = await requirePassword(String(body.password || ""));
    if (!authz.ok) {
      return NextResponse.json({ error: authz.error }, { status: authz.status });
    }
  }

  const provider =
    body.provider === "evolution" || body.provider === "zapi"
      ? (body.provider as WhatsappProvider)
      : undefined;

  await setNotifyConfig({
    emailOnOrder:
      typeof body.emailOnOrder === "boolean" ? body.emailOnOrder : undefined,
    whatsappOnOrder:
      typeof body.whatsappOnOrder === "boolean"
        ? body.whatsappOnOrder
        : undefined,
    provider,
    zapiInstance: body.zapiInstance,
    zapiToken: body.zapiToken,
    zapiClientToken: body.zapiClientToken,
    evolutionUrl: body.evolutionUrl,
    evolutionKey: body.evolutionKey,
    evolutionInstance: body.evolutionInstance,
    clearZapi: Boolean(body.clearZapi),
    clearEvolution: Boolean(body.clearEvolution),
  });

  return NextResponse.json(await publicConfig());
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const channel = String(body.channel || "");
  const to = String(body.to || "").trim();

  if (channel === "email") {
    if (!isMailConfigured()) {
      return NextResponse.json(
        {
          error:
            "SMTP do Gmail não configurado. No servidor: SMTP_HOST, SMTP_USER e SMTP_PASS (senha de app).",
        },
        { status: 400 }
      );
    }
    if (!to || !to.includes("@")) {
      return NextResponse.json({ error: "Informe um e-mail de teste" }, { status: 400 });
    }
    await sendMarketingEmail({
      to,
      subject: "Majesté — teste de e-mail de pedido",
      html: `<p>Olá! Se você recebeu este e-mail, o SMTP da loja está ok para o agradecimento automático de pedido.</p>`,
    });
    return NextResponse.json({ ok: true, channel: "email" });
  }

  if (channel === "whatsapp") {
    const sent = await sendWhatsappText({
      phone: to,
      message:
        "Olá! Este é um teste da Majesté. Se chegou, o WhatsApp automático da loja está funcionando. 💛",
      force: true,
    });
    if (!sent.ok) {
      return NextResponse.json({ error: sent.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, channel: "whatsapp" });
  }

  return NextResponse.json({ error: "Canal inválido" }, { status: 400 });
}
