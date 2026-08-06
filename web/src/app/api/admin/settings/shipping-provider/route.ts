import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  getShippingQuoteProvider,
  setShippingQuoteProvider,
  shippingProviderLabel,
  type ShippingQuoteProvider,
} from "@/lib/shipping-provider";
import { setMandaBemConfig, getMandaBemConfig } from "@/lib/manda-bem-settings";
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

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const [provider, me, mb] = await Promise.all([
    getShippingQuoteProvider(),
    getMelhorEnvioConfig(),
    getMandaBemConfig(),
  ]);
  return NextResponse.json({
    provider,
    label: shippingProviderLabel(provider),
    melhorEnvioReady: Boolean(me.token),
    mandaBemReady: Boolean(mb.plataformaId && mb.plataformaChave),
  });
}

export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const body = await req.json().catch(() => ({}));
  const provider = String(body.provider || "") as ShippingQuoteProvider;
  if (!["melhor_envio", "manda_bem", "both"].includes(provider)) {
    return NextResponse.json({ error: "Provider inválido" }, { status: 400 });
  }

  if (provider === "manda_bem" || provider === "both") {
    const mb = await getMandaBemConfig();
    if (!mb.plataformaId || !mb.plataformaChave) {
      return NextResponse.json(
        {
          error:
            "Cadastre plataforma_id e chave em Frete / Manda Bem antes de ativar.",
        },
        { status: 400 }
      );
    }
    await setMandaBemConfig({ enabled: true });
  }

  if (provider === "melhor_envio") {
    const me = await getMelhorEnvioConfig();
    if (!me.token) {
      return NextResponse.json(
        {
          error:
            "Cadastre o token em Frete / Melhor Envio antes de ativar só o Melhor Envio.",
        },
        { status: 400 }
      );
    }
  }

  await setShippingQuoteProvider(provider);
  return GET();
}
