import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import {
  getMandaBemConfig,
  maskChave,
  setMandaBemConfig,
} from "@/lib/manda-bem-settings";
import { mandaBemQuoteService } from "@/lib/manda-bem-api";
import { DEFAULT_SHIPPING_DIMS, quoteShipping } from "@/lib/shipping";
import { getMelhorEnvioConfig } from "@/lib/melhor-envio-settings";

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

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const cfg = await getMandaBemConfig();
  const enabledRow = await prisma.siteSetting.findUnique({
    where: { key: "mandaBemEnabled" },
  });
  const enabledFlag =
    enabledRow?.value === "true" ||
    enabledRow?.value === "1" ||
    process.env.MANDABEM_ENABLED === "true" ||
    process.env.MANDABEM_ENABLED === "1";

  return NextResponse.json({
    hasId: Boolean(cfg.plataformaId),
    hasChave: Boolean(cfg.plataformaChave),
    idMasked: cfg.plataformaId ? maskChave(cfg.plataformaId) : "",
    chaveMasked: cfg.plataformaChave ? maskChave(cfg.plataformaChave) : "",
    idFromPanel: cfg.idFromPanel,
    chaveFromPanel: cfg.chaveFromPanel,
    enabled: cfg.enabled,
    enabledFlag,
    cepOrigem: cfg.cepOrigem,
    docsUrl: "https://site.mandabem.com.br/api/",
    panelUrl: "https://mandabem.com.br/",
  });
}

export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const clearChave = Boolean(body.clearChave);
  const idRaw =
    body.plataformaId !== undefined && body.plataformaId !== null
      ? String(body.plataformaId)
      : undefined;
  const chaveRaw =
    body.plataformaChave !== undefined && body.plataformaChave !== null
      ? String(body.plataformaChave)
      : undefined;

  const looksMasked = (v?: string) =>
    Boolean(
      v && (v.includes("…") || v.includes("•") || v.includes("..."))
    );

  const wantsSecretChange =
    clearChave ||
    (Boolean(idRaw?.trim()) && !looksMasked(idRaw)) ||
    (Boolean(chaveRaw?.trim()) && !looksMasked(chaveRaw));

  if (wantsSecretChange) {
    const check = await requirePassword(String(body.password || ""));
    if (!check.ok) {
      return NextResponse.json(
        { error: check.error },
        { status: check.status }
      );
    }
  }

  await setMandaBemConfig({
    plataformaId:
      !idRaw?.trim() || looksMasked(idRaw) ? undefined : idRaw,
    clearChave: wantsSecretChange ? clearChave : false,
    plataformaChave:
      !wantsSecretChange || clearChave || looksMasked(chaveRaw) || !chaveRaw?.trim()
        ? undefined
        : chaveRaw,
    enabled: body.enabled !== undefined ? Boolean(body.enabled) : undefined,
    cepOrigem:
      body.cepOrigem !== undefined ? String(body.cepOrigem) : undefined,
  });

  return GET();
}

/** Testa cotação Manda Bem (e opcionalmente o aggregator do checkout). */
export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const toZip = String(body.toZip || "").replace(/\D/g, "");
  if (toZip.length !== 8) {
    return NextResponse.json(
      { error: "Informe um CEP de destino com 8 dígitos" },
      { status: 400 }
    );
  }

  const cfg = await getMandaBemConfig();
  if (!cfg.plataformaId || !cfg.plataformaChave) {
    return NextResponse.json(
      { error: "Cadastre plataforma_id e plataforma_chave antes de testar" },
      { status: 400 }
    );
  }

  const dims = {
    peso: DEFAULT_SHIPPING_DIMS.weightKg,
    altura: DEFAULT_SHIPPING_DIMS.heightCm,
    largura: DEFAULT_SHIPPING_DIMS.widthCm,
    comprimento: DEFAULT_SHIPPING_DIMS.lengthCm,
  };

  const [pac, sedex] = await Promise.all([
    mandaBemQuoteService({
      plataformaId: cfg.plataformaId,
      plataformaChave: cfg.plataformaChave,
      cepOrigem: cfg.cepOrigem,
      cepDestino: toZip,
      servico: "PAC",
      ...dims,
    }),
    mandaBemQuoteService({
      plataformaId: cfg.plataformaId,
      plataformaChave: cfg.plataformaChave,
      cepOrigem: cfg.cepOrigem,
      cepDestino: toZip,
      servico: "SEDEX",
      ...dims,
    }),
  ]);

  const meCfg = await getMelhorEnvioConfig();
  let checkoutQuotes = null;
  try {
    checkoutQuotes = await quoteShipping({
      fromZip: cfg.cepOrigem || meCfg.storeZip,
      toZip,
      products: [{ id: "1", ...DEFAULT_SHIPPING_DIMS, quantity: 1 }],
    });
  } catch (e) {
    checkoutQuotes = {
      error: e instanceof Error ? e.message : "Falha no aggregator",
    };
  }

  return NextResponse.json({
    cepOrigem: cfg.cepOrigem,
    toZip,
    pac,
    sedex,
    checkoutQuotes,
  });
}
