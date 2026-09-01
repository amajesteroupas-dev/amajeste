"use client";

import { useEffect, useState } from "react";
import { PaymentFlagsRow, detectCardBrand } from "@/components/store/PaymentFlags";
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

export type InstallmentOption = {
  installments: number;
  installmentValue: number;
  totalAmount: number;
  interestFree: boolean;
  interestTotal?: number;
  /** Juros em centavos (exato da API). */
  interestTotalCents?: number;
  /** Parcelas com juros no fees PagBank (≠ total de parcelas). */
  interestInstallments?: number;
};

type Props = {
  publicKey: string;
  /** Valor total a pagar (R$) — usado para exibir as parcelas. */
  amount: number;
  /** Até quantas parcelas sem juros a loja assume (padrão 1 = à vista). */
  maxInterestFree?: number;
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
    interestTotal?: number;
    interestTotalCents?: number;
    interestInstallments?: number;
    cardBin?: string;
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

function buildLocalInstallments(
  amount: number,
  maxInterestFree: number
): InstallmentOption[] {
  const total = Math.max(0, Number(amount) || 0);
  const freeMax = Math.max(1, Math.min(12, maxInterestFree || 1));
  return Array.from({ length: 12 }, (_, i) => {
    const n = i + 1;
    const installmentValue =
      total > 0 ? Math.round((total / n) * 100) / 100 : 0;
    const interestFree = n <= freeMax;
    return {
      installments: n,
      installmentValue,
      totalAmount: total,
      interestFree,
      interestTotal: 0,
      interestTotalCents: 0,
      interestInstallments: interestFree ? 0 : Math.max(1, n - freeMax),
    };
  });
}

function optionLabel(opt: InstallmentOption) {
  const parcela = formatBRL(opt.installmentValue);
  if (opt.interestFree) {
    return opt.installments === 1
      ? `1x de ${parcela} sem juros`
      : `${opt.installments}x de ${parcela} sem juros`;
  }
  if (opt.interestTotal && opt.interestTotal > 0) {
    return `${opt.installments}x de ${parcela} com juros · total ${formatBRL(opt.totalAmount)}`;
  }
  return `${opt.installments}x de ${parcela} (+ juros PagBank)`;
}

export function PagBankCardForm({
  publicKey,
  amount,
  maxInterestFree = 1,
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
  const [options, setOptions] = useState<InstallmentOption[]>(() =>
    buildLocalInstallments(amount, maxInterestFree)
  );
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsHint, setOptionsHint] = useState("");
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

  useEffect(() => {
    let cancelled = false;
    const fallback = buildLocalInstallments(amount, maxInterestFree);
    setOptions(fallback);
    setOptionsHint("");

    const cents = Math.round(Math.max(0, Number(amount) || 0) * 100);
    if (cents < 100) return;

    const bin = onlyDigits(cardNumber).slice(0, 6);
    // Sem BIN ainda: carrega plano genérico; com 6 dígitos, recalcula pela bandeira.
    const timer = window.setTimeout(() => {
      setOptionsLoading(true);
      (async () => {
        try {
          const qs = new URLSearchParams({
            value: String(cents),
            maxInstallments: "12",
            maxInterestFree: String(Math.max(1, maxInterestFree)),
          });
          if (bin.length >= 6) qs.set("bin", bin);
          const res = await fetch(
            `/api/payments/pagseguro/installments?${qs}`
          );
          const data = await res.json().catch(() => ({}));
          if (cancelled) return;
          const parsed = Array.isArray(data.options)
            ? (data.options as InstallmentOption[])
            : [];
          if (parsed.length > 0) {
            const free = parsed.filter((o) => o.interestFree);
            const withInterest = parsed.filter(
              (o) =>
                !o.interestFree &&
                o.installments > maxInterestFree
            );
            const merged = [...free, ...withInterest].sort(
              (a, b) => a.installments - b.installments
            );
            if (merged.length > 0) {
              setOptions(merged);
              setOptionsHint(
                withInterest.length
                  ? ""
                  : "Juros exatos do PagBank aparecem ao digitar o cartão."
              );
            } else {
              setOptions(fallback);
              setOptionsHint("");
            }
          } else {
            setOptions(fallback);
            setOptionsHint("");
          }
        } catch {
          if (!cancelled) {
            setOptions(fallback);
            setOptionsHint("");
          }
        } finally {
          if (!cancelled) setOptionsLoading(false);
        }
      })();
    }, bin.length >= 6 ? 350 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [amount, maxInterestFree, cardNumber]);

  async function handlePay() {
    setLocalError("");
    if (amount > 0 && amount < 1) {
      setLocalError(
        "O valor mínimo para cartão é R$ 1,00. Ajuste o pedido ou use Pix."
      );
      return;
    }
    if (!publicKey) {
      setLocalError(
        "Chave pública PagBank ausente. Configure em Admin → Pagamentos."
      );
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

    const selected = options.find((o) => o.installments === installments);
    setSubmitting(true);
    try {
      await onPay({
        encryptedCard: encrypted.encryptedCard,
        installments,
        holderName,
        holderTaxId,
        interestTotal:
          selected && !selected.interestFree
            ? Math.max(0, Number(selected.interestTotal) || 0)
            : undefined,
        interestTotalCents:
          selected && !selected.interestFree
            ? Math.max(0, Number(selected.interestTotalCents) || 0) ||
              undefined
            : undefined,
        interestInstallments:
          selected && !selected.interestFree
            ? Math.max(1, Number(selected.interestInstallments) || installments)
            : undefined,
        cardBin: number.slice(0, 6),
      });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : "Falha no pagamento");
    } finally {
      setSubmitting(false);
    }
  }

  const disabled = busy || submitting;
  const brand = detectCardBrand(cardNumber);

  if (sdkError) {
    return <p className="text-xs text-[#8a3a3a]">{sdkError}</p>;
  }

  if (!sdkReady) {
    return <p className="text-xs text-muted">Carregando formulário seguro…</p>;
  }

  return (
    // Não usar <form> aqui: fica dentro do <form> do checkout e o navegador
    // ignora formulários aninhados — o botão Pagar acabava não funcionando.
    <div className="space-y-3">
      <PaymentFlagsRow
        variant="full"
        showPix={false}
        size="sm"
        activeBrand={brand}
      />

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
          disabled={disabled || optionsLoading}
        >
          {options.map((opt) => (
            <option key={opt.installments} value={opt.installments}>
              {optionLabel(opt)}
            </option>
          ))}
        </select>
      </label>
      {optionsLoading ? (
        <p className="text-[11px] text-muted">Carregando opções de parcela…</p>
      ) : null}
      {optionsHint ? (
        <p className="text-[11px] text-muted">{optionsHint}</p>
      ) : null}

      {localError ? (
        <p className="text-xs text-[#8a3a3a]">{localError}</p>
      ) : null}

      <button
        type="button"
        className="btn btn-primary w-full"
        disabled={disabled || !publicKey}
        onClick={() => void handlePay()}
      >
        {disabled ? "Processando…" : "Pagar"}
      </button>
      <p className="text-[10px] text-muted leading-relaxed">
        {maxInterestFree <= 1
          ? "1x sem juros. Em 2x ou mais, os juros são do PagBank (opcional). Os dados do cartão são criptografados no navegador."
          : `Até ${maxInterestFree}x sem juros; demais parcelas com juros do PagBank. Os dados do cartão são criptografados no navegador.`}
      </p>
    </div>
  );
}
