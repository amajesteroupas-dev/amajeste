import { NextRequest, NextResponse } from "next/server";
import {
  normalizePagSeguroToken,
  pagSeguroApiBase,
} from "@/lib/payments-pagseguro";
import { getPaymentSettings } from "@/lib/payment-settings";

export const dynamic = "force-dynamic";

type Plan = {
  installments: number;
  installmentValue: number;
  totalAmount: number;
  interestFree: boolean;
  interestTotal: number;
  /** Juros em centavos (valor exato da API PagBank). */
  interestTotalCents: number;
  /**
   * Parcelas COM juros no objeto fees (PagBank).
   * Ex.: 8x totais com 4 sem juros → interestInstallments = 4.
   */
  interestInstallments: number;
};

function fromCents(cents: number) {
  return Math.round(Number(cents) || 0) / 100;
}

/**
 * Opções de parcelamento PagBank:
 * - até maxInterestFree → sem juros (loja assume)
 * - acima → com juros (repasse ao comprador)
 */
export async function GET(req: NextRequest) {
  const value = Number(req.nextUrl.searchParams.get("value") || 0);
  const maxInstallments = Math.min(
    12,
    Math.max(1, Number(req.nextUrl.searchParams.get("maxInstallments") || 12))
  );
  // Parcelas sem juros que a loja assume. Na API PagBank o valor 1 é rejeitado;
  // usamos 0 quando a loja só quer 1x à vista (à vista já é sem juros).
  const storeFree = Math.min(
    12,
    Math.max(0, Number(req.nextUrl.searchParams.get("maxInterestFree") || 1))
  );
  const apiNoInterest = storeFree <= 1 ? 0 : storeFree;

  const creditCardBin = String(req.nextUrl.searchParams.get("bin") || "")
    .replace(/\D/g, "")
    .slice(0, 6);

  if (!Number.isFinite(value) || value < 100) {
    return NextResponse.json({ error: "Valor inválido" }, { status: 400 });
  }

  const originalReais = fromCents(value);
  const s = await getPaymentSettings();
  const token = normalizePagSeguroToken(s.pagseguro.token);
  if (!token) {
    return NextResponse.json({ options: [], reason: "no_token" });
  }

  try {
    const base = pagSeguroApiBase(s.pagseguro.sandbox);
    const url =
      `${base}/charges/fees/calculate` +
      `?payment_methods=CREDIT_CARD` +
      `&value=${Math.round(value)}` +
      `&max_installments=${maxInstallments}` +
      `&max_installments_no_interest=${apiNoInterest}` +
      (creditCardBin.length >= 6 ? `&credit_card_bin=${creditCardBin}` : "");

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    const data = (await res.json().catch(() => ({}))) as {
      payment_methods?: {
        credit_card?: Record<
          string,
          {
            installment_plans?: {
              installments?: number;
              installment_value?: number;
              interest_free?: boolean;
              amount?: {
                value?: number;
                fees?: {
                  buyer?: {
                    interest?: { total?: number; installments?: number };
                  };
                };
              };
            }[];
          }
        >;
      };
      error_messages?: { description?: string; parameter_name?: string }[];
    };

    if (!res.ok) {
      console.error(
        "[pagseguro installments]",
        res.status,
        JSON.stringify(data).slice(0, 800)
      );
      return NextResponse.json({
        options: [],
        status: res.status,
        error: data.error_messages?.[0]?.description || "fees_failed",
      });
    }

    const cards = data.payment_methods?.credit_card || {};
    const byN = new Map<number, Plan>();

    for (const brand of Object.values(cards)) {
      for (const plan of brand.installment_plans || []) {
        const n = Number(plan.installments) || 0;
        if (n < 1 || n > maxInstallments) continue;

        const interestFree = n <= Math.max(1, storeFree);
        let totalAmount = fromCents(Number(plan.amount?.value) || value);
        let installmentValue = fromCents(Number(plan.installment_value) || 0);
        let interestTotalCents = Math.max(
          0,
          Math.round(Number(plan.amount?.fees?.buyer?.interest?.total) || 0)
        );
        let interestTotal = fromCents(interestTotalCents);
        // PagBank: fees.interest.installments = qtd de parcelas COM juros
        // (não o total de parcelas do cartão).
        let interestInstallments = Math.max(
          0,
          Number(plan.amount?.fees?.buyer?.interest?.installments) || 0
        );

        if (interestFree) {
          totalAmount = originalReais;
          installmentValue = Math.round((originalReais / n) * 100) / 100;
          interestTotal = 0;
          interestTotalCents = 0;
          interestInstallments = 0;
        } else {
          if (interestTotalCents <= 0 && totalAmount > originalReais) {
            interestTotalCents = Math.round(
              (totalAmount - originalReais) * 100
            );
            interestTotal = fromCents(interestTotalCents);
          }
          if (installmentValue <= 0 && n > 0) {
            installmentValue = Math.round((totalAmount / n) * 100) / 100;
          }
          if (interestInstallments <= 0) {
            interestInstallments = Math.max(1, n - apiNoInterest);
          }
          // Sem juros embutidos reais → ignora este plano
          if (
            interestTotalCents <= 0 &&
            totalAmount <= originalReais + 0.009
          ) {
            continue;
          }
        }

        const prev = byN.get(n);
        if (
          !prev ||
          (interestFree && !prev.interestFree) ||
          (interestFree === prev.interestFree &&
            totalAmount < prev.totalAmount)
        ) {
          byN.set(n, {
            installments: n,
            installmentValue,
            totalAmount,
            interestFree,
            interestTotal,
            interestTotalCents,
            interestInstallments,
          });
        }
      }
    }

    // Garante 1..storeFree (mín. 1x) mesmo se a API omitir
    const ensureFree = Math.max(1, storeFree);
    for (let n = 1; n <= ensureFree; n++) {
      if (byN.has(n)) continue;
      byN.set(n, {
        installments: n,
        installmentValue: Math.round((originalReais / n) * 100) / 100,
        totalAmount: originalReais,
        interestFree: true,
        interestTotal: 0,
        interestTotalCents: 0,
        interestInstallments: 0,
      });
    }

    const options = [...byN.values()].sort(
      (a, b) => a.installments - b.installments
    );

    if (options.length > 1) {
      return NextResponse.json({ options });
    }

    // Fallback: exibe 1x–12x mesmo se a API PagBank não retornar planos com juros.
    const estimated: Plan[] = [];
    for (let n = 1; n <= maxInstallments; n++) {
      const interestFree = n <= Math.max(1, storeFree);
      estimated.push({
        installments: n,
        installmentValue: Math.round((originalReais / n) * 100) / 100,
        totalAmount: originalReais,
        interestFree,
        interestTotal: 0,
        interestTotalCents: 0,
        interestInstallments: interestFree ? 0 : Math.max(1, n - apiNoInterest),
      });
    }
    return NextResponse.json({ options: estimated, warning: "estimated" });
  } catch (e) {
    console.error("[pagseguro installments]", e);
    return NextResponse.json({ options: [], error: "exception" });
  }
}
