"use client";

import { useEffect, useRef, useState } from "react";
import { initMercadoPago, CardPayment, Wallet } from "@mercadopago/sdk-react";
import {
  PaymentFlagsRow,
  PixFlag,
} from "@/components/store/PaymentFlags";
import { PagBankCardForm } from "@/components/store/PagBankCardForm";
import { formatBRL } from "@/lib/utils";

export type CheckoutPayMethod = {
  id: string;
  label: string;
  description: string;
};

export type PagBankPayType = "CREDIT_CARD" | "PIX";

type CardFormData = {
  token: string;
  issuer_id: string;
  payment_method_id: string;
  installments: number;
  transaction_amount: number;
};

type Props = {
  methods: CheckoutPayMethod[];
  method: string;
  onMethodChange: (id: string) => void;
  amount: number;
  publicKey: string;
  pagseguroPublicKey?: string;
  preferenceId?: string | null;
  onCardPay: (data: {
    cardToken: string;
    paymentMethodId: string;
    installments: number;
    issuerId?: string;
  }) => Promise<void>;
  onPagBankCardPay?: (data: {
    encryptedCard: string;
    installments: number;
    holderName: string;
    holderTaxId: string;
  }) => Promise<void>;
  pagseguroType?: PagBankPayType;
  onPagseguroTypeChange?: (t: PagBankPayType) => void;
  cardHolderName?: string;
  cardHolderTaxId?: string;
  cardBusy?: boolean;
};

function MethodIcon({ id }: { id: string }) {
  if (id === "pix" || id === "pagseguro_pix") return <PixFlag size="sm" />;
  if (id === "credit_card" || id === "pagseguro_card") {
    return (
      <span className="inline-flex scale-90 origin-left">
        <PaymentFlagsRow variant="main" showPix={false} size="sm" />
      </span>
    );
  }
  if (id === "mercadopago_wallet") {
    return (
      <span
        className="inline-flex h-5 px-1.5 items-center justify-center rounded-[3px] bg-[#009EE3] text-[9px] font-bold text-white"
        aria-hidden
      >
        MP
      </span>
    );
  }
  if (id === "pagseguro") {
    return (
      <span
        className="inline-flex h-5 px-1.5 items-center justify-center rounded-[3px] bg-[#1a9f4b] text-[9px] font-bold text-white"
        aria-hidden
      >
        PS
      </span>
    );
  }
  if (id === "infinitypay") {
    return (
      <span
        className="inline-flex h-5 px-1.5 items-center justify-center rounded-[3px] bg-[#111] text-[9px] font-bold text-white"
        aria-hidden
      >
        IP
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#25D366] text-[10px] font-bold text-white"
      aria-hidden
    >
      W
    </span>
  );
}

function brickErrorMessage(err: unknown) {
  const raw =
    (err as { message?: string })?.message ||
    (Array.isArray(err)
      ? err
          .map((e) =>
            typeof e === "string" ? e : (e as { message?: string })?.message
          )
          .filter(Boolean)
          .join(" · ")
      : "") ||
    "";
  const lower = raw.toLowerCase();
  if (
    lower.includes("secure fields") ||
    lower.includes("fields_setup") ||
    lower.includes("fields setup")
  ) {
    return "O formulário seguro do cartão não carregou. Aguarde o frete estabilizar e toque em Tentar novamente. Se continuar, use Pix ou Mercado Pago, ou desative bloqueadores neste site.";
  }
  return (
    raw ||
    "O formulário de cartão não carregou. Confira Public Key e Access Token (mesmo ambiente) em Admin → Pagamentos."
  );
}

export function CheckoutPaymentMethods({
  methods,
  method,
  onMethodChange,
  amount,
  publicKey,
  pagseguroPublicKey = "",
  preferenceId,
  onCardPay,
  onPagBankCardPay,
  pagseguroType = "CREDIT_CARD",
  onPagseguroTypeChange,
  cardHolderName = "",
  cardHolderTaxId = "",
  cardBusy,
}: Props) {
  const [mpReady, setMpReady] = useState(false);
  const [brickError, setBrickError] = useState("");
  const [retryTick, setRetryTick] = useState(0);
  const [settledAmount, setSettledAmount] = useState(0);
  const [amountReady, setAmountReady] = useState(false);
  const initKeyRef = useRef("");

  const liveAmount = Number(Number(amount).toFixed(2));

  useEffect(() => {
    if (!publicKey) {
      setMpReady(false);
      return;
    }
    if (initKeyRef.current === publicKey && mpReady) return;
    initMercadoPago(publicKey, { locale: "pt-BR" });
    initKeyRef.current = publicKey;
    setMpReady(true);
  }, [publicKey, mpReady]);

  useEffect(() => {
    if (method !== "credit_card") {
      setAmountReady(false);
      return;
    }
    if (!(liveAmount > 0)) {
      setAmountReady(false);
      setSettledAmount(0);
      return;
    }
    setAmountReady(false);
    const t = window.setTimeout(() => {
      setSettledAmount(liveAmount);
      setAmountReady(true);
      setBrickError("");
    }, 700);
    return () => window.clearTimeout(t);
  }, [liveAmount, method]);

  const showCardBrick =
    method === "credit_card" &&
    Boolean(publicKey) &&
    mpReady &&
    amountReady &&
    settledAmount > 0 &&
    !brickError;

  return (
    <div className="space-y-2">
      {methods.map((m) => {
        const selected = method === m.id;
        return (
          <div
            key={m.id}
            className={`border ${
              selected ? "border-[#2a2420] bg-[#faf7f3]" : "border-line bg-white"
            }`}
          >
            <label className="flex items-start gap-3 px-3 py-2.5 cursor-pointer">
              <input
                type="radio"
                className="mt-1"
                name="pay-method"
                checked={selected}
                onChange={() => onMethodChange(m.id)}
              />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <MethodIcon id={m.id} />
                  <span className="text-sm font-medium text-[#2a2420]">
                    {m.label}
                    {m.id === "pix" || m.id === "pagseguro_pix" ? (
                      <span className="font-normal text-[#5a7a4a]">
                        {" "}
                        (desconto no Pix)
                      </span>
                    ) : null}
                  </span>
                </span>
                {m.description ? (
                  <span className="block text-xs text-muted mt-0.5">
                    {m.description}
                  </span>
                ) : null}
              </span>
            </label>

            {selected && m.id === "credit_card" ? (
              <div className="border-t border-line px-3 py-3 bg-white">
                {!publicKey ? (
                  <p className="text-xs text-[#8a3a3a]">
                    Configure a Public Key do Mercado Pago em Admin → Pagamentos
                    para pagar com cartão na loja.
                  </p>
                ) : !(liveAmount > 0) ? (
                  <p className="text-xs text-muted">
                    Adicione itens ao carrinho para carregar o formulário de
                    cartão.
                  </p>
                ) : brickError ? (
                  <div className="space-y-2">
                    <p className="text-xs text-[#8a3a3a]">{brickError}</p>
                    <button
                      type="button"
                      className="text-xs underline text-[#2a2420]"
                      onClick={() => {
                        setBrickError("");
                        setRetryTick((n) => n + 1);
                        setAmountReady(true);
                        setSettledAmount(liveAmount);
                      }}
                    >
                      Tentar novamente
                    </button>
                  </div>
                ) : !showCardBrick ? (
                  <p className="text-xs text-muted">
                    Carregando formulário seguro…
                  </p>
                ) : (
                  <div
                    className={
                      cardBusy ? "opacity-60 pointer-events-none" : ""
                    }
                  >
                    <CardPayment
                      key={`card-${settledAmount}-${retryTick}`}
                      locale="pt-BR"
                      initialization={{ amount: settledAmount }}
                      customization={{
                        paymentMethods: {
                          maxInstallments: 12,
                          types: { included: ["credit_card"] },
                        },
                        visual: {
                          style: {
                            theme: "default",
                          },
                        },
                      }}
                      onSubmit={async (formData: CardFormData) => {
                        await onCardPay({
                          cardToken: formData.token,
                          paymentMethodId: formData.payment_method_id,
                          installments: formData.installments,
                          issuerId: formData.issuer_id,
                        });
                      }}
                      onError={(err) => {
                        setBrickError(brickErrorMessage(err));
                      }}
                    />
                  </div>
                )}
              </div>
            ) : null}

            {selected &&
            m.id === "mercadopago_wallet" &&
            preferenceId &&
            mpReady ? (
              <div className="border-t border-line px-3 py-3 bg-white space-y-2">
                <p className="text-xs text-muted">
                  Total {formatBRL(amount)}. Pague com sua conta Mercado Pago:
                </p>
                <Wallet
                  key={`wallet-${preferenceId}`}
                  initialization={{ preferenceId }}
                  locale="pt-BR"
                />
              </div>
            ) : null}

            {selected && m.id === "mercadopago_wallet" && !preferenceId ? (
              <div className="border-t border-line px-3 py-2.5 bg-white">
                <p className="text-xs text-muted">
                  Ao confirmar o pedido, o botão do Mercado Pago aparece aqui —
                  sem sair da loja.
                </p>
              </div>
            ) : null}

            {selected && m.id === "pagseguro_card" ? (
              <div className="border-t border-line px-3 py-3 bg-white space-y-3">
                {!pagseguroPublicKey ? (
                  <p className="text-xs text-[#8a3a3a]">
                    Configure a chave pública PagBank em Admin → Pagamentos
                    (ou salve o token do Vendedor para gerar automaticamente).
                  </p>
                ) : onPagBankCardPay ? (
                  <PagBankCardForm
                    publicKey={pagseguroPublicKey}
                    busy={cardBusy}
                    defaultHolder={cardHolderName}
                    defaultTaxId={cardHolderTaxId}
                    onPay={onPagBankCardPay}
                  />
                ) : null}
              </div>
            ) : null}

            {selected && m.id === "pagseguro_pix" ? (
              <div className="border-t border-line px-3 py-2.5 bg-white">
                <p className="text-xs text-muted">
                  Ao finalizar, o QR Code Pix aparece nesta loja — sem sair do
                  site.
                </p>
              </div>
            ) : null}

            {selected && m.id === "pagseguro" ? (
              <div className="border-t border-line px-3 py-3 bg-white space-y-3">
                <div className="flex flex-wrap gap-3">
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="pagseguro-type"
                      checked={pagseguroType === "CREDIT_CARD"}
                      onChange={() => onPagseguroTypeChange?.("CREDIT_CARD")}
                    />
                    <span className="inline-flex items-center gap-1.5">
                      Cartão de crédito
                      <span className="inline-flex scale-75 origin-left">
                        <PaymentFlagsRow
                          variant="main"
                          showPix={false}
                          size="sm"
                        />
                      </span>
                    </span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="radio"
                      name="pagseguro-type"
                      checked={pagseguroType === "PIX"}
                      onChange={() => onPagseguroTypeChange?.("PIX")}
                    />
                    <span className="inline-flex items-center gap-1.5">
                      Pix <PixFlag size="sm" />
                    </span>
                  </label>
                </div>

                {pagseguroType === "CREDIT_CARD" ? (
                  !pagseguroPublicKey ? (
                    <p className="text-xs text-[#8a3a3a]">
                      Configure a chave pública PagBank em Admin → Pagamentos
                      (ou salve o token do Vendedor para gerar automaticamente).
                    </p>
                  ) : onPagBankCardPay ? (
                    <PagBankCardForm
                      publicKey={pagseguroPublicKey}
                      busy={cardBusy}
                      defaultHolder={cardHolderName}
                      defaultTaxId={cardHolderTaxId}
                      onPay={onPagBankCardPay}
                    />
                  ) : null
                ) : (
                  <p className="text-xs text-muted">
                    Ao finalizar, o QR Code Pix aparece nesta loja — sem sair do
                    site.
                  </p>
                )}
              </div>
            ) : null}

            {selected && m.id === "infinitypay" ? (
              <div className="border-t border-line px-3 py-2.5 bg-white">
                <p className="text-xs text-muted">
                  Ao finalizar, você será levado ao checkout Infinity Pay.
                </p>
              </div>
            ) : null}

          </div>
        );
      })}
    </div>
  );
}
