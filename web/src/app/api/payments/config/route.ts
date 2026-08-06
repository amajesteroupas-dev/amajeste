import { NextResponse } from "next/server";
import { getPaymentSettings } from "@/lib/payment-settings";
import { ensurePagSeguroPublicKey } from "@/lib/payments-pagseguro";

/** Chaves públicas para tokenização no checkout (MP + PagBank). */
export async function GET() {
  const s = await getPaymentSettings();

  let pagseguroPublicKey = s.pagseguro.publicKey || "";
  if (s.pagseguro.enabled && s.pagseguro.token && !pagseguroPublicKey) {
    try {
      pagseguroPublicKey = await ensurePagSeguroPublicKey();
    } catch (e) {
      console.warn(
        "[payments/config] chave pública PagBank:",
        e instanceof Error ? e.message : e
      );
    }
  }

  return NextResponse.json({
    publicKey: s.mercadopago.publicKey || "",
    enabled: s.mercadopago.enabled && Boolean(s.mercadopago.accessToken),
    pagseguroPublicKey,
    pagseguroEnabled: s.pagseguro.enabled && Boolean(s.pagseguro.token),
    pagseguroSandbox: s.pagseguro.sandbox,
  });
}
