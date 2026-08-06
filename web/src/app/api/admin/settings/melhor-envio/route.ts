import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getMelhorEnvioConfig,
  maskToken,
  setMelhorEnvioConfig,
} from "@/lib/melhor-envio-settings";
import {
  fetchMelhorEnvioAccount,
  getStoreSender,
  setStoreSender,
} from "@/lib/melhor-envio-api";
import { DEFAULT_SHIPPING_DIMS, quoteShipping } from "@/lib/shipping";

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
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const cfg = await getMelhorEnvioConfig();
  const sender = await getStoreSender(cfg);
  const account = cfg.token
    ? await fetchMelhorEnvioAccount()
    : { ok: false, sandbox: cfg.sandbox, error: "Sem token" };

  return NextResponse.json({
    hasToken: Boolean(cfg.token),
    tokenMasked: cfg.token ? maskToken(cfg.token) : "",
    tokenFromPanel: cfg.tokenFromPanel,
    sandbox: cfg.sandbox,
    userAgent: cfg.userAgent,
    storeZip: cfg.storeZip,
    usingMock: !cfg.token,
    account,
    sender: {
      name: sender.name,
      phone: sender.phone,
      email: sender.email,
      document: sender.document,
      address: sender.address,
      number: sender.number,
      complement: sender.complement,
      district: sender.district,
      city: sender.city,
      state: sender.state,
    },
  });
}

export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clearToken = Boolean(body.clearToken);
  const tokenRaw =
    body.token !== undefined && body.token !== null
      ? String(body.token)
      : undefined;

  const looksMasked =
    tokenRaw !== undefined &&
    (tokenRaw.includes("…") ||
      tokenRaw.includes("•") ||
      tokenRaw.includes("..."));

  const wantsTokenChange =
    clearToken || (Boolean(tokenRaw?.trim()) && !looksMasked);

  if (wantsTokenChange) {
    const password = String(body.tokenPassword || "");
    if (!password) {
      return NextResponse.json(
        { error: "Digite sua senha para alterar o token Melhor Envio" },
        { status: 403 }
      );
    }
    const session = await adminAuth();
    const user = session?.user?.id
      ? await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { passwordHash: true },
        })
      : null;
    if (!user?.passwordHash) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: "Senha incorreta" }, { status: 403 });
    }
  }

  await setMelhorEnvioConfig({
    clearToken: wantsTokenChange ? clearToken : false,
    token:
      !wantsTokenChange || clearToken || looksMasked || !tokenRaw?.trim()
        ? undefined
        : tokenRaw,
    sandbox: body.sandbox !== undefined ? Boolean(body.sandbox) : undefined,
    userAgent:
      body.userAgent !== undefined ? String(body.userAgent) : undefined,
    storeZip: body.storeZip !== undefined ? String(body.storeZip) : undefined,
  });

  if (body.sender && typeof body.sender === "object") {
    await setStoreSender(body.sender);
  }

  const cfg = await getMelhorEnvioConfig();
  const sender = await getStoreSender(cfg);
  const account = cfg.token
    ? await fetchMelhorEnvioAccount()
    : { ok: false, sandbox: cfg.sandbox, error: "Sem token" };

  return NextResponse.json({
    ok: true,
    hasToken: Boolean(cfg.token),
    tokenMasked: cfg.token ? maskToken(cfg.token) : "",
    tokenFromPanel: cfg.tokenFromPanel,
    sandbox: cfg.sandbox,
    userAgent: cfg.userAgent,
    storeZip: cfg.storeZip,
    usingMock: !cfg.token,
    account,
    sender: {
      name: sender.name,
      phone: sender.phone,
      email: sender.email,
      document: sender.document,
      address: sender.address,
      number: sender.number,
      complement: sender.complement,
      district: sender.district,
      city: sender.city,
      state: sender.state,
    },
  });
}

/** Testa cotação com CEP de destino. */
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const toZip = String(body.toZip || "").replace(/\D/g, "");
  if (toZip.length < 8) {
    return NextResponse.json({ error: "Informe um CEP válido" }, { status: 400 });
  }

  const cfg = await getMelhorEnvioConfig();
  try {
    const quotes = await quoteShipping({
      fromZip: cfg.storeZip,
      toZip,
      products: [
        {
          id: "test",
          ...DEFAULT_SHIPPING_DIMS,
          insuranceValue: 100,
          quantity: 1,
        },
      ],
    });
    return NextResponse.json({
      ok: true,
      usingMock: !cfg.token,
      fromZip: cfg.storeZip,
      toZip,
      quotes,
      account: cfg.token ? await fetchMelhorEnvioAccount() : null,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? e.message
            : "Falha ao testar cotação no Melhor Envio",
      },
      { status: 502 }
    );
  }
}
