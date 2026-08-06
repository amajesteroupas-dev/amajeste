import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import {
  getPaymentSettings,
  maskSecret,
  setPaymentSettings,
} from "@/lib/payment-settings";

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

function publicView(s: Awaited<ReturnType<typeof getPaymentSettings>>) {
  return {
    mercadopago: {
      enabled: s.mercadopago.enabled,
      pixEnabled: s.mercadopago.pixEnabled,
      boletoEnabled: s.mercadopago.boletoEnabled,
      whatsappEnabled: s.mercadopago.whatsappEnabled,
      hasToken: Boolean(s.mercadopago.accessToken),
      tokenMasked: s.mercadopago.accessToken
        ? maskSecret(s.mercadopago.accessToken)
        : "",
      tokenFromPanel: s.mercadopago.tokenFromPanel,
      publicKey: s.mercadopago.publicKey,
    },
    pagseguro: {
      enabled: s.pagseguro.enabled,
      sandbox: s.pagseguro.sandbox,
      hasToken: Boolean(s.pagseguro.token),
      tokenMasked: s.pagseguro.token ? maskSecret(s.pagseguro.token) : "",
      tokenFromPanel: s.pagseguro.tokenFromPanel,
      publicKey: s.pagseguro.publicKey,
      hasPublicKey: Boolean(s.pagseguro.publicKey),
    },
    infinitypay: {
      enabled: s.infinitypay.enabled,
      handle: s.infinitypay.handle,
      handleFromPanel: s.infinitypay.handleFromPanel,
      hasHandle: Boolean(s.infinitypay.handle),
    },
  };
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  return NextResponse.json(publicView(await getPaymentSettings()));
}

export async function PUT(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const looksMasked = (v?: string) =>
    Boolean(v && (v.includes("…") || v.includes("•") || v.includes("...")));

  await setPaymentSettings({
    mercadopago: body.mercadopago
      ? {
          enabled: body.mercadopago.enabled,
          pixEnabled: body.mercadopago.pixEnabled,
          boletoEnabled: body.mercadopago.boletoEnabled,
          whatsappEnabled: body.mercadopago.whatsappEnabled,
          clearToken: Boolean(body.mercadopago.clearToken),
          accessToken: looksMasked(body.mercadopago.accessToken)
            ? undefined
            : body.mercadopago.accessToken,
          publicKey: body.mercadopago.publicKey,
        }
      : undefined,
    pagseguro: body.pagseguro
      ? {
          enabled: body.pagseguro.enabled,
          sandbox: body.pagseguro.sandbox,
          clearToken: Boolean(body.pagseguro.clearToken),
          token: looksMasked(body.pagseguro.token)
            ? undefined
            : body.pagseguro.token,
          publicKey: body.pagseguro.publicKey,
        }
      : undefined,
    infinitypay: body.infinitypay
      ? {
          enabled: body.infinitypay.enabled,
          clearHandle: Boolean(body.infinitypay.clearHandle),
          handle: body.infinitypay.handle,
        }
      : undefined,
  });

  return NextResponse.json({
    ok: true,
    ...publicView(await getPaymentSettings()),
  });
}
