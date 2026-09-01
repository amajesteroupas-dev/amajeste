import { getPaymentSettings, setPaymentSettings } from "@/lib/payment-settings";
import { checkoutSuccessPath } from "@/lib/order-access";

function toCents(reais: number) {
  return Math.round(Number(reais) * 100);
}

/** Remove Bearer/aspas/espaços se a pessoa colou o header inteiro no painel. */
export function normalizePagSeguroToken(raw: string) {
  let t = String(raw || "").trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  t = t.replace(/^Bearer\s+/i, "").trim();
  return t;
}

export function pagSeguroApiBase(sandbox: boolean) {
  return sandbox
    ? "https://sandbox.api.pagseguro.com"
    : "https://api.pagseguro.com";
}

function parsePhone(phone?: string | null) {
  const d = String(phone || "").replace(/\D/g, "");
  if (d.length >= 10 && d.length <= 11) {
    return {
      country: "55",
      area: d.slice(0, 2),
      number: d.slice(2),
      type: "MOBILE" as const,
    };
  }
  if (d.length >= 12 && d.startsWith("55")) {
    return {
      country: "55",
      area: d.slice(2, 4),
      number: d.slice(4),
      type: "MOBILE" as const,
    };
  }
  return {
    country: "55",
    area: "11",
    number: "999999999",
    type: "MOBILE" as const,
  };
}

function authFailMessage(sandbox: boolean, status: number, detail: string) {
  if (/whitelist access required|allowlist_access_required/i.test(detail)) {
    return (
      "PagBank ainda bloqueia a API Orders nesta conta (allowlist). " +
      "Confirme o token de produção (Sandbox desmarcado) e a liberação da conta. " +
      "Se acabou de liberar, rode o teste de produção e envie o log ao PagBank."
    );
  }

  const authFail =
    status === 401 ||
    /invalid_authorization|unauthorized|Invalid credential|AUTHORIZATION header/i.test(
      detail
    );
  if (!authFail) return null;

  return sandbox
    ? "Token PagBank inválido no Sandbox. Vá em Perfis de integração → Vendedor e copie o token de Credenciais. Marque “Sandbox” no admin."
    : "Token PagBank inválido na produção. Em PagBank → Venda online → Integrações → Gerar/obter token. Desmarque “Sandbox” no admin.";
}

/** Mensagens técnicas do PagBank → texto claro para a cliente. */
export function humanizePagBankError(raw: string): string {
  const t = String(raw || "");
  if (/buyer email must not be equals to merchant email/i.test(t)) {
    return (
      "Este e-mail é o mesmo da conta PagBank da loja — o PagBank não permite. " +
      "Use outro e-mail para comprar (ex.: um Gmail pessoal diferente do cadastro PagBank)."
    );
  }
  if (
    /tax_id|document|cpf\/cnpj/i.test(t) &&
    /obrigat|required|must|inform/i.test(t)
  ) {
    return "Informe um CPF válido (só números) nos seus dados para finalizar o pagamento.";
  }
  return t;
}

function formatApiError(
  data: {
    error_messages?: {
      code?: string;
      description?: string;
      error?: string;
      parameter_name?: string;
    }[];
    message?: string;
  },
  status: number
) {
  const parts =
    data.error_messages
      ?.map((e) => {
        const msg = e.description || e.error || e.code;
        if (!msg) return null;
        return e.parameter_name ? `${msg} (${e.parameter_name})` : msg;
      })
      .filter(Boolean) || [];
  const raw = parts.length
    ? parts.join("; ")
    : data.message || `PagBank HTTP ${status}`;
  return humanizePagBankError(raw);
}

type OrderCustomer = {
  name: string;
  email: string;
  cpf?: string | null;
  phone?: string | null;
};

type OrderItem = { title: string; quantity: number; unitPrice: number };

type ShippingAddr = {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip?: string;
};

function buildCustomer(c: OrderCustomer) {
  const taxId = c.cpf ? String(c.cpf).replace(/\D/g, "") : "";
  return {
    name: c.name.slice(0, 120),
    email: c.email,
    ...(taxId ? { tax_id: taxId } : {}),
    phones: [parsePhone(c.phone)],
  };
}

function buildItems(items: OrderItem[]) {
  return items.map((item, i) => ({
    reference_id: `item-${i + 1}`,
    name: item.title.slice(0, 100),
    quantity: item.quantity,
    unit_amount: toCents(item.unitPrice),
  }));
}

/**
 * Itens enviados ao PagBank devem bater com o valor cobrado (charge / QR).
 * Frete e descontos alteram o total da loja — se a soma das linhas ≠ total,
 * envia um único item com o valor efetivo do pedido.
 */
function buildItemsMatchingAmount(
  items: OrderItem[],
  amountReais: number,
  orderNumber: string
) {
  const amountCents = toCents(amountReais);
  const lines = buildItems(items);
  const sum = lines.reduce((acc, it) => acc + it.unit_amount * it.quantity, 0);
  if (sum === amountCents && lines.length > 0) return lines;
  return [
    {
      reference_id: "pedido",
      name: `Pedido ${orderNumber}`.slice(0, 100),
      quantity: 1,
      unit_amount: amountCents,
    },
  ];
}

function buildShipping(addr?: ShippingAddr | null) {
  if (!addr?.street || !addr.city || !addr.state || !addr.zip) return undefined;
  const postal = String(addr.zip).replace(/\D/g, "");
  if (postal.length !== 8) return undefined;
  return {
    address: {
      street: String(addr.street).slice(0, 160),
      number: String(addr.number || "S/N").slice(0, 20),
      ...(addr.complement
        ? { complement: String(addr.complement).slice(0, 40) }
        : {}),
      locality: String(addr.neighborhood || "Centro").slice(0, 60),
      city: String(addr.city).slice(0, 90),
      region_code: String(addr.state).slice(0, 2).toUpperCase(),
      country: "BRA",
      postal_code: postal,
    },
  };
}

async function pagSeguroFetch(
  path: string,
  init: RequestInit & { sandbox: boolean; token: string }
) {
  const res = await fetch(`${pagSeguroApiBase(init.sandbox)}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${init.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers || {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { res, data };
}

/**
 * Busca na API de taxas o objeto fees.buyer.interest exato para a parcela.
 * PagBank valida esses números na cobrança — valores inventados/arredondados
 * geram invalid_parameter em charges[0].amount.fees.buyer.interest.
 */
async function lookupBuyerInterestFees(params: {
  token: string;
  sandbox: boolean;
  amountCents: number;
  installments: number;
  maxInterestFree: number;
  bin?: string;
}): Promise<{ total: number; installments: number } | null> {
  const n = Math.min(12, Math.max(2, params.installments));
  const storeFree = Math.min(12, Math.max(0, params.maxInterestFree));
  const apiNoInterest = storeFree <= 1 ? 0 : storeFree;
  const bin = String(params.bin || "")
    .replace(/\D/g, "")
    .slice(0, 6);

  const qs =
    `payment_methods=CREDIT_CARD` +
    `&value=${Math.round(params.amountCents)}` +
    `&max_installments=${Math.max(n, 12)}` +
    `&max_installments_no_interest=${apiNoInterest}` +
    (bin.length >= 6 ? `&credit_card_bin=${bin}` : "");

  try {
    const { res, data } = await pagSeguroFetch(`/charges/fees/calculate?${qs}`, {
      method: "GET",
      sandbox: params.sandbox,
      token: params.token,
    });
    if (!res.ok) return null;

    const cards =
      (
        data as {
          payment_methods?: {
            credit_card?: Record<
              string,
              {
                installment_plans?: {
                  installments?: number;
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
        }
      ).payment_methods?.credit_card || {};

    let best: { total: number; installments: number } | null = null;
    for (const brand of Object.values(cards)) {
      for (const plan of brand.installment_plans || []) {
        if (Number(plan.installments) !== n) continue;
        if (plan.interest_free) continue;
        const total = Math.round(
          Number(plan.amount?.fees?.buyer?.interest?.total) || 0
        );
        let feeInst = Math.round(
          Number(plan.amount?.fees?.buyer?.interest?.installments) || 0
        );
        if (total <= 0) continue;
        if (feeInst <= 0) feeInst = Math.max(1, n - apiNoInterest);
        if (!best || total < best.total) {
          best = { total, installments: feeInst };
        }
      }
    }
    return best;
  } catch {
    return null;
  }
}

/** Cria ou reutiliza chave pública para encryptCard no browser. */
export async function ensurePagSeguroPublicKey(): Promise<string> {
  const s = await getPaymentSettings();
  const existing = s.pagseguro.publicKey?.trim();
  if (existing) return existing;

  const token = normalizePagSeguroToken(s.pagseguro.token);
  if (!token) return "";

  const readKey = (data: Record<string, unknown>) =>
    String(
      (data as { public_key?: string }).public_key ||
        (data as { publicKey?: string }).publicKey ||
        ""
    ).trim();

  // Já existe na conta?
  {
    const { res, data } = await pagSeguroFetch("/public-keys/card", {
      method: "GET",
      sandbox: s.pagseguro.sandbox,
      token,
    });
    const key = readKey(data);
    if (res.ok && key) {
      await setPaymentSettings({ pagseguro: { publicKey: key } });
      return key;
    }
  }

  const { res, data } = await pagSeguroFetch("/public-keys", {
    method: "POST",
    sandbox: s.pagseguro.sandbox,
    token,
    body: JSON.stringify({ type: "card" }),
  });

  const key = readKey(data);

  if (!res.ok || !key) {
    const detail = formatApiError(
      data as {
        error_messages?: { description?: string }[];
        message?: string;
      },
      res.status
    );
    const auth = authFailMessage(s.pagseguro.sandbox, res.status, detail);
    throw new Error(auth || detail || "Não foi possível obter a chave pública PagBank");
  }

  await setPaymentSettings({ pagseguro: { publicKey: key } });
  return key;
}

type PagBankOrderResponse = {
  id?: string;
  charges?: {
    id?: string;
    status?: string;
    payment_response?: { message?: string; code?: string };
  }[];
  qr_codes?: {
    id?: string;
    text?: string;
    links?: { rel?: string; href?: string; media?: string }[];
  }[];
  error_messages?: { code?: string; description?: string; error?: string }[];
  message?: string;
};

async function extractPixPayload(order: PagBankOrderResponse) {
  const qr = order.qr_codes?.[0];
  let copyPaste = qr?.text?.trim() || "";
  const qrImageUrl =
    qr?.links?.find(
      (l) =>
        l.media === "image/png" ||
        l.rel === "QRCODE.PNG" ||
        l.rel === "QRCODE.IMAGE"
    )?.href || "";

  const textUrl = qr?.links?.find(
    (l) => l.media === "text/plain" || l.rel === "QRCODE.TEXT"
  )?.href;

  if (!copyPaste && textUrl) {
    try {
      const r = await fetch(textUrl);
      if (r.ok) copyPaste = (await r.text()).trim();
    } catch {
      /* ignore */
    }
  }

  let qrBase64: string | undefined;
  if (qrImageUrl) {
    try {
      const r = await fetch(qrImageUrl);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        qrBase64 = buf.toString("base64");
      }
    } catch {
      /* ignore */
    }
  }

  return { copyPaste, qrBase64, qrImageUrl };
}

/** Pedido transparente com cartão criptografado (SDK no browser). */
export async function createPagSeguroCardOrder(params: {
  orderId: string;
  orderNumber: string;
  email: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  items: OrderItem[];
  amount: number;
  encryptedCard: string;
  installments?: number;
  /** Juros repassados ao comprador (R$), quando parcelas > sem juros. */
  interestTotal?: number;
  /** Juros em centavos (preferencial — valor exato da API de taxas). */
  interestTotalCents?: number;
  /**
   * Qtd de parcelas COM juros no objeto fees (PagBank).
   * Diferente de `installments` (total no cartão). Ex.: 8x com 4 sem juros → 4.
   */
  interestInstallments?: number;
  /** BIN (6 dígitos) para recalcular taxas na bandeira correta. */
  cardBin?: string;
  /** Parcelas sem juros assumidas pela loja (promoção). */
  maxInterestFree?: number;
  shipping?: ShippingAddr | null;
  shippingCost?: number;
}) {
  const s = await getPaymentSettings();
  const token = normalizePagSeguroToken(s.pagseguro.token);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!token) {
    return {
      mock: true as const,
      id: `mock-ps-${params.orderId}`,
      status: "PAID",
      paid: true,
    };
  }

  if (!params.encryptedCard?.trim()) {
    throw new Error("Cartão criptografado ausente");
  }

  const taxId = params.cpf ? String(params.cpf).replace(/\D/g, "") : "";
  if (!taxId) {
    throw new Error("CPF do titular é obrigatório para cartão PagBank");
  }

  const amountCents = toCents(params.amount);
  const installments = Math.min(
    12,
    Math.max(1, Number(params.installments) || 1)
  );
  let interestCents = Math.max(
    0,
    params.interestTotalCents != null &&
      Number.isFinite(Number(params.interestTotalCents))
      ? Math.round(Number(params.interestTotalCents))
      : toCents(Number(params.interestTotal) || 0)
  );
  // PagBank rejeita fees.buyer.interest.installments = total de parcelas;
  // o campo é a quantidade de parcelas que carregam juros.
  let feeInterestInstallments = Math.min(
    installments,
    Math.max(1, Number(params.interestInstallments) || installments)
  );

  const maxInterestFree = Math.max(1, Number(params.maxInterestFree) || 1);

  // Sempre recalcula na API de taxas quando parcelas > sem juros da loja.
  if (installments > maxInterestFree) {
    const looked = await lookupBuyerInterestFees({
      token,
      sandbox: s.pagseguro.sandbox,
      amountCents,
      installments,
      maxInterestFree,
      bin: params.cardBin,
    });
    if (looked) {
      interestCents = looked.total;
      feeInterestInstallments = Math.min(installments, looked.installments);
    } else if (interestCents <= 0) {
      throw new Error(
        "Não foi possível calcular as parcelas com juros. Tente novamente ou pague em 1x / Pix."
      );
    }
  } else if (interestCents > 0 && installments > 1) {
    const looked = await lookupBuyerInterestFees({
      token,
      sandbox: s.pagseguro.sandbox,
      amountCents,
      installments,
      maxInterestFree,
      bin: params.cardBin,
    });
    if (looked) {
      interestCents = looked.total;
      feeInterestInstallments = Math.min(installments, looked.installments);
    }
  }

  // PagBank: amount.value = total cobrado do comprador; fees.buyer.interest
  // informa a parcela de juros embutida nesse total.
  const chargeAmount: Record<string, unknown> = {
    value: amountCents + interestCents,
    currency: "BRL",
  };
  if (interestCents > 0 && installments > 1) {
    chargeAmount.fees = {
      buyer: {
        interest: {
          total: interestCents,
          installments: feeInterestInstallments,
        },
      },
    };
  }

  const body: Record<string, unknown> = {
    reference_id: params.orderNumber.slice(0, 64),
    customer: buildCustomer(params),
    items: buildItemsMatchingAmount(
      params.items,
      params.amount,
      params.orderNumber
    ),
    notification_urls: [`${baseUrl}/api/webhooks/pagseguro`],
    charges: [
      {
        reference_id: `${params.orderNumber}-chg`.slice(0, 64),
        description: `Pedido ${params.orderNumber}`.slice(0, 64),
        amount: chargeAmount,
        payment_method: {
          type: "CREDIT_CARD",
          installments,
          capture: true,
          soft_descriptor: "Majeste",
          card: {
            encrypted: params.encryptedCard,
            store: false,
          },
          // holder fica no payment_method (não dentro de card) — exigência PagBank
          holder: {
            name: params.name.slice(0, 30),
            tax_id: taxId,
          },
        },
      },
    ],
  };

  const shipping = buildShipping(params.shipping);
  if (shipping) body.shipping = shipping;

  const { res, data } = await pagSeguroFetch("/orders", {
    method: "POST",
    sandbox: s.pagseguro.sandbox,
    token,
    body: JSON.stringify(body),
  });

  const order = data as PagBankOrderResponse;
  if (!res.ok) {
    const detail = formatApiError(order, res.status);
    console.error(
      "[pagseguro card]",
      res.status,
      detail,
      JSON.stringify(data).slice(0, 1500)
    );
    const auth = authFailMessage(s.pagseguro.sandbox, res.status, detail);
    throw new Error(auth || detail || "PagBank recusou o pagamento do cartão");
  }

  const charge = order.charges?.[0];
  const status = String(charge?.status || "").toUpperCase();
  const paid = status === "PAID" || status === "AUTHORIZED";
  const declined =
    status === "DECLINED" ||
    status === "CANCELED" ||
    status === "CANCELLED" ||
    status === "DENIED";

  if (declined) {
    const raw = String(charge?.payment_response?.message || "").toUpperCase();
    const code = String(charge?.payment_response?.code || "");
    let msg =
      charge?.payment_response?.message ||
      "Pagamento recusado. Verifique os dados do cartão ou escolha outro meio.";
    if (params.amount > 0 && params.amount < 1) {
      msg =
        "Valor abaixo do mínimo do cartão (R$ 1,00). Ajuste o pedido ou pague com Pix.";
    } else if (raw.includes("VERIFIQUE") || code === "20007") {
      msg =
        "Cartão recusado pelo banco/PagBank. Confira número, validade e CVV, ou tente outro cartão / Pix.";
    }
    throw Object.assign(new Error(msg), { code: "CARD_DECLINED", status });
  }

  return {
    mock: false as const,
    id: order.id || charge?.id || params.orderId,
    chargeId: charge?.id,
    status,
    paid,
  };
}

/** Pedido transparente Pix (QR na própria loja). */
export async function createPagSeguroPixOrder(params: {
  orderId: string;
  orderNumber: string;
  email: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  items: OrderItem[];
  amount: number;
  shipping?: ShippingAddr | null;
}) {
  const s = await getPaymentSettings();
  const token = normalizePagSeguroToken(s.pagseguro.token);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const success = `${baseUrl}${checkoutSuccessPath(params.orderNumber)}`;

  if (!token) {
    return {
      mock: true as const,
      id: `mock-ps-pix-${params.orderId}`,
      pixQrCode: "00020126MOCKPIX",
      pixQrCodeBase64: undefined as string | undefined,
      redirectUrl: `${success}&mock=1`,
    };
  }

  const amountCents = toCents(params.amount);
  const expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

  const body: Record<string, unknown> = {
    reference_id: params.orderNumber.slice(0, 64),
    customer: buildCustomer(params),
    items: buildItemsMatchingAmount(
      params.items,
      params.amount,
      params.orderNumber
    ),
    qr_codes: [
      {
        amount: { value: amountCents },
        expiration_date: expires,
      },
    ],
    notification_urls: [`${baseUrl}/api/webhooks/pagseguro`],
  };

  const shipping = buildShipping(params.shipping);
  if (shipping) body.shipping = shipping;

  const { res, data } = await pagSeguroFetch("/orders", {
    method: "POST",
    sandbox: s.pagseguro.sandbox,
    token,
    body: JSON.stringify(body),
  });

  const order = data as PagBankOrderResponse;
  if (!res.ok) {
    const detail = formatApiError(order, res.status);
    const auth = authFailMessage(s.pagseguro.sandbox, res.status, detail);
    throw new Error(auth || detail);
  }

  const pix = await extractPixPayload(order);
  if (!pix.copyPaste && !pix.qrBase64) {
    throw new Error(
      "PagBank não retornou QR Code Pix. Confira se há chave Pix ativa na conta."
    );
  }

  return {
    mock: false as const,
    id: order.id || params.orderId,
    pixQrCode: pix.copyPaste || undefined,
    pixQrCodeBase64: pix.qrBase64,
    redirectUrl: checkoutSuccessPath(params.orderNumber),
  };
}

/**
 * Checkout hospedado PagBank (legado — NÃO usado no fluxo da loja).
 * A loja usa createPagSeguroCardOrder / createPagSeguroPixOrder (API Orders).
 * Mantido só para scripts/docs de fallback.
 */
export async function createPagSeguroCheckout(params: {
  orderId: string;
  orderNumber: string;
  email: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  items: { title: string; quantity: number; unitPrice: number }[];
  shippingCost?: number;
}) {
  const s = await getPaymentSettings();
  const token = normalizePagSeguroToken(s.pagseguro.token);
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const success = `${baseUrl}${checkoutSuccessPath(params.orderNumber)}`;

  if (!token) {
    return {
      mock: true,
      id: `mock-ps-${params.orderId}`,
      redirectUrl: `${success}&mock=1`,
    };
  }

  const sandbox = s.pagseguro.sandbox;
  const body: Record<string, unknown> = {
    reference_id: params.orderNumber.slice(0, 64),
    customer: {
      name: params.name.slice(0, 120),
      email: params.email,
      ...(params.cpf ? { tax_id: params.cpf.replace(/\D/g, "") } : {}),
    },
    items: params.items.map((item, i) => ({
      reference_id: `item-${i + 1}`,
      name: item.title.slice(0, 100),
      quantity: item.quantity,
      unit_amount: toCents(item.unitPrice),
    })),
    redirect_url: success,
    return_url: success,
    payment_notification_urls: [`${baseUrl}/api/webhooks/pagseguro`],
    notification_urls: [`${baseUrl}/api/webhooks/pagseguro`],
  };

  if (params.shippingCost && params.shippingCost > 0) {
    body.additional_amount = toCents(params.shippingCost);
  }

  const { res, data } = await pagSeguroFetch("/checkouts", {
    method: "POST",
    sandbox,
    token,
    body: JSON.stringify(body),
  });

  const payload = data as {
    id?: string;
    links?: { rel?: string; href?: string }[];
    error_messages?: { code?: string; description?: string; error?: string }[];
    message?: string;
  };

  if (!res.ok) {
    const detail = formatApiError(payload, res.status);
    const auth = authFailMessage(sandbox, res.status, detail);
    throw new Error(auth || detail);
  }

  const payLink =
    payload.links?.find((l) => l.rel === "PAY" || l.rel === "CHECKOUT")?.href ||
    payload.links?.find(
      (l) => l.href?.includes("pagseguro") || l.href?.includes("pag.ae") || l.href?.includes("pagbank")
    )?.href;

  if (!payLink) {
    throw new Error("PagBank não retornou link de pagamento");
  }

  return {
    mock: false,
    id: payload.id || params.orderId,
    redirectUrl: payLink,
  };
}
