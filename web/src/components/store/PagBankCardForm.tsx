"use client";

import { FormEvent, useEffect, useState } from "react";
import { PaymentFlagsRow } from "@/components/store/PaymentFlags";
import { formatBRL } from "@/lib/utils";

declare global {
  interface Window {
    PagSeguro?: {
      encryptCard: (input: {
        publicKey: string;
        holder: string;
        number: string;
        expMonth: string;
        expYear: string;
        securityCode: string;
      }) => {
        encryptedCard?: string;
        hasErrors?: boolean;
        errors?: { code?: string; message?: string }[];
      };
    };
  }
}

const SDK_SRC =
  "https://assets.pagseguro.com.br/checkout-sdk-js/rc/dist/browser/pagseguro.min.js";

type Props = {
  publicKey: string;
  /** Total da loja (já com/sem promoção conforme parcelas). */
  amount?: number;
  busy?: boolean;
  defaultHolder?: string;
  defaultTaxId?: string;
  /** Avisa o checkout na hora em que a cliente muda as parcelas (para atualizar promo/total). */
  onInstallmentsChange?: (installments: number) => void;
  onPay: (data: {
    encryptedCard: string;
    installments: number;
    holderName: string;
    holderTaxId: string;
  }) => Promise<void>;
};

function onlyDigits(v: string) {
  return v.replace(/\D/g, "");
}

function formatCardNumber(v: string) {
  const d = onlyDigits(v).slice(0, 19);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

function formatExp(v: string) {
  const d = onlyDigits(v).slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}/${d.slice(2)}`;
}

function formatCpf(v: string) {
  const d = onlyDigits(v).slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function loadSdk(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.PagSeguro?.encryptCard) return Promise.resolve();
  const existing = document.querySelector<HTMLScriptElement>(
    `script[src="${SDK_SRC}"]`
  );
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () =>
        reject(new Error("Falha ao carregar SDK PagBank"))
      );
      if (window.PagSeguro?.encryptCard) resolve();
    });
  }
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Falha ao carregar SDK PagBank"));
    document.head.appendChild(s);
  });
}

export function PagBankCardForm({
  publicKey,
  amount = 0,
  busy,
  defaultHolder = "",
  defaultTaxId = "",
  onInstallmentsChange,
  onPay,
}: Props) {
  const [sdkReady, setSdkReady] = useState(false);
  const [sdkError, setSdkError] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [exp, setExp] = useState("");
  const [cvv, setCvv] = useState("");
  const [holder, setHolder] = useState(defaultHolder);
  const [taxId, setTaxId] = useState(formatCpf(defaultTaxId));
  const [installments, setInstallments] = useState(1);
  const [localError, setLocalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function changeInstallments(n: number) {
    const next = Math.min(12, Math.max(1, n || 1));
    setInstallments(next);
    onInstallmentsChange?.(next);
  }

  useEffect(() => {
    setHolder((h) => h || defaultHolder);
  }, [defaultHolder]);

  useEffect(() => {
    if (defaultTaxId) setTaxId(formatCpf(defaultTaxId));
  }, [defaultTaxId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await loadSdk();
        if (!cancelled) {
          setSdkReady(Boolean(window.PagSeguro?.encryptCard));
          if (!window.PagSeguro?.encryptCard) {
            setSdkError("SDK PagBank não disponível neste navegador.");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setSdkError(
            e instanceof Error ? e.message : "Não foi possível carregar o SDK"
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLocalError("");
    if (!publicKey) {
      setLocalError("Chave pública PagBank ausente. Configure em Admin → Pagamentos.");
      return;
    }
    if (!window.PagSeguro?.encryptCard) {
      setLocalError("SDK PagBank ainda não carregou. Tente novamente.");
      return;
    }

    const number = onlyDigits(cardNumber);
    const expDigits = onlyDigits(exp);
    const securityCode = onlyDigits(cvv);
    const holderName = holder.trim();
    const holderTaxId = onlyDigits(taxId);

    if (number.length < 13) {
      setLocalError("Informe um número de cartão válido.");
      return;
    }
    if (expDigits.length !== 4) {
      setLocalError("Informe a validade no formato mm/aa.");
      return;
    }
    if (securityCode.length < 3) {
      setLocalError("Informe o código de segurança.");
      return;
    }
    if (holderName.length < 3) {
      setLocalError("Informe o nome do titular.");
      return;
    }
    if (holderTaxId.length !== 11) {
      setLocalError("Informe o CPF do titular.");
      return;
    }

    const expMonth = expDigits.slice(0, 2);
    const yy = expDigits.slice(2);
    const expYear = yy.length === 2 ? `20${yy}` : yy;

    const encrypted = window.PagSeguro.encryptCard({
      publicKey,
      holder: holderName,
      number,
      expMonth,
      expYear,
      securityCode,
    });

    if (encrypted.hasErrors || !encrypted.encryptedCard) {
      const msg =
        encrypted.errors?.map((x) => x.message).filter(Boolean).join(" · ") ||
        "Não foi possível criptografar o cartão.";
      setLocalError(msg);
      return;
    }

    setSubmitting(true);
    try {
      await onPay({
        encryptedCard: encrypted.encryptedCard,
        installments,
        holderName,
        holderTaxId,
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Falha no pagamento");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = busy || submitting;

  if (sdkError) {
    return <p className="text-xs text-[#8a3a3a]">{sdkError}</p>;
  }

  if (!sdkReady) {
    return <p className="text-xs text-muted">Carregando formulário seguro…</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div>
        <p className="text-xs font-medium text-[#2a2420] mb-1.5">
          Cartão de crédito ou débito
        </p>
        <PaymentFlagsRow variant="full" showPix={false} size="sm" />
      </div>

      <label className="block text-xs text-[#5c534c]">
        Número do cartão
        <input
          className="input mt-1"
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="1234 1234 1234 1234"
          value={cardNumber}
          onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
          disabled={disabled}
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-xs text-[#5c534c]">
          Data de vencimento
          <input
            className="input mt-1"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="mm/aa"
            value={exp}
            onChange={(e) => setExp(formatExp(e.target.value))}
            disabled={disabled}
          />
        </label>
        <label className="block text-xs text-[#5c534c]">
          Código de segurança
          <input
            className="input mt-1"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="Ex.: 123"
            value={cvv}
            onChange={(e) => setCvv(onlyDigits(e.target.value).slice(0, 4))}
            disabled={disabled}
          />
        </label>
      </div>

      <label className="block text-xs text-[#5c534c]">
        Nome do titular como aparece no cartão
        <input
          className="input mt-1"
          autoComplete="cc-name"
          placeholder="Maria Santos Pereira"
          value={holder}
          onChange={(e) => setHolder(e.target.value)}
          disabled={disabled}
        />
      </label>

      <label className="block text-xs text-[#5c534c]">
        Documento do titular (CPF)
        <input
          className="input mt-1"
          inputMode="numeric"
          placeholder="999.999.999-99"
          value={taxId}
          onChange={(e) => setTaxId(formatCpf(e.target.value))}
          disabled={disabled}
        />
      </label>

      <label className="block text-xs text-[#5c534c]">
        Parcelas
        <select
          className="input mt-1"
          value={installments}
          onChange={(e) => changeInstallments(Number(e.target.value) || 1)}
          disabled={disabled}
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => {
            const base = Math.max(0, amount);
            const per = base > 0 ? Math.round((base / n) * 100) / 100 : 0;
            if (n === 1) {
              return (
                <option key={n} value={n}>
                  {base > 0
                    ? `1x de ${formatBRL(base)} sem juros`
                    : "1x sem juros"}
                </option>
              );
            }
            return (
              <option key={n} value={n}>
                {base > 0
                  ? `${n}x de ${formatBRL(per)} · total loja ${formatBRL(base)} + juros PagBank`
                  : `${n}x com juros PagBank`}
              </option>
            );
          })}
        </select>
      </label>

      {localError ? (
        <p className="text-xs text-[#8a3a3a]">{localError}</p>
      ) : null}

      <button
        type="submit"
        className="btn btn-primary w-full"
        disabled={disabled || !publicKey}
      >
        {disabled ? "Processando…" : "Pagar"}
      </button>
      <p className="text-[10px] text-muted leading-relaxed">
        Somente 1x é sem juros na loja. Em 2x ou mais, a loja cobra o valor
        acima; o PagBank pode acrescentar juros no cartão (aparecem no extrato
        da cliente, não na conta da loja). Os dados do cartão são criptografados
        no navegador.
      </p>
    </form>
  );
}
