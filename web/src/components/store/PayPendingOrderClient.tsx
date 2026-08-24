"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PagBankCardForm } from "@/components/store/PagBankCardForm";
import { PixPaymentTimer } from "@/components/store/PixPaymentTimer";
import { formatBRL } from "@/lib/utils";

type Props = {
  orderNumber: string;
  amount: number;
  publicKey: string;
  maxInterestFree: number;
  defaultHolder: string;
  defaultTaxId: string;
  accessToken?: string;
};

export function PayPendingOrderClient({
  orderNumber,
  amount,
  publicKey,
  maxInterestFree,
  defaultHolder,
  defaultTaxId,
  accessToken,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [pixCode, setPixCode] = useState("");
  const [pixExpiresAt, setPixExpiresAt] = useState<string | null>(null);

  async function payCard(data: {
    encryptedCard: string;
    installments: number;
    holderName: string;
    holderTaxId: string;
    interestTotal?: number;
    interestTotalCents?: number;
    interestInstallments?: number;
    cardBin?: string;
  }) {
    setError("");
    setBusy(true);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payType: "CREDIT_CARD",
            accessToken,
            maxInterestFree,
            ...data,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Falha no pagamento");
      }
      if (json.redirectUrl) {
        window.location.href = json.redirectUrl;
        return;
      }
      router.push(`/checkout/sucesso?order=${orderNumber}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no pagamento");
      throw e;
    } finally {
      setBusy(false);
    }
  }

  async function payPix() {
    setError("");
    setBusy(true);
    setPixCode("");
    setPixExpiresAt(null);
    try {
      const res = await fetch(
        `/api/orders/${encodeURIComponent(orderNumber)}/pay`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            payType: "PIX",
            accessToken,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Falha ao gerar Pix");
      }
      if (json.pixCopyPaste || json.pixQrCode) {
        setPixCode(String(json.pixCopyPaste || json.pixQrCode));
        if (json.reservedUntil) {
          setPixExpiresAt(String(json.reservedUntil));
        } else if (json.reserveSeconds) {
          setPixExpiresAt(
            new Date(
              Date.now() + Number(json.reserveSeconds) * 1000
            ).toISOString()
          );
        }
        return;
      }
      if (json.redirectUrl) {
        window.location.href = json.redirectUrl;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro no Pix");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-sm text-[#5c534c]">
        Total a pagar:{" "}
        <span className="font-semibold text-[#2a2420]">{formatBRL(amount)}</span>
      </div>

      {error ? (
        <p className="text-sm text-red-700 bg-red-50 border border-red-200 px-3 py-2">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        <h3
          className="text-lg text-[#2a2420]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cartão
        </h3>
        {publicKey ? (
          <PagBankCardForm
            publicKey={publicKey}
            amount={amount}
            maxInterestFree={maxInterestFree}
            busy={busy}
            defaultHolder={defaultHolder}
            defaultTaxId={defaultTaxId}
            onPay={payCard}
          />
        ) : (
          <p className="text-sm text-[#8a7468]">
            Pagamento com cartão indisponível no momento. Use Pix.
          </p>
        )}
      </div>

      <div className="border-t border-[#2a2420]/10 pt-5 space-y-3">
        <h3
          className="text-lg text-[#2a2420]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Pix
        </h3>
        <button
          type="button"
          disabled={busy}
          onClick={payPix}
          className="w-full bg-[#2a2420] text-[#faf7f3] py-3 text-sm tracking-wide disabled:opacity-50"
        >
          {busy ? "Gerando…" : "GERAR PIX"}
        </button>
        {pixCode ? (
          <div className="space-y-3 text-sm">
            {pixExpiresAt ? (
              <PixPaymentTimer expiresAt={pixExpiresAt} />
            ) : (
              <p className="text-xs text-[#5c534c] leading-relaxed">
                Pague em até <strong>5 minutos</strong>. Se não for pago, o
                pedido é cancelado e o produto volta para o estoque.
              </p>
            )}
            <p className="text-[#5c534c]">
              Copie o código Pix e pague no app do banco:
            </p>
            <textarea
              readOnly
              className="w-full border border-[#2a2420]/15 bg-white p-3 text-xs font-mono min-h-[100px]"
              value={pixCode}
            />
            <button
              type="button"
              className="underline text-[#95752c] text-xs"
              onClick={() => navigator.clipboard.writeText(pixCode)}
            >
              Copiar código
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
