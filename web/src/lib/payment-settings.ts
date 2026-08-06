import { prisma } from "@/lib/prisma";

export type PaymentGatewayId =
  | "mercadopago"
  | "pagseguro"
  | "infinitypay";

export type PaymentSettings = {
  mercadopago: {
    enabled: boolean;
    pixEnabled: boolean;
    boletoEnabled: boolean;
    whatsappEnabled: boolean;
    accessToken: string;
    publicKey: string;
    tokenFromPanel: boolean;
  };
  pagseguro: {
    enabled: boolean;
    token: string;
    publicKey: string;
    sandbox: boolean;
    tokenFromPanel: boolean;
  };
  infinitypay: {
    enabled: boolean;
    handle: string;
    handleFromPanel: boolean;
  };
};

const KEYS = {
  mpEnabled: "payMpEnabled",
  mpPix: "payMpPixEnabled",
  mpBoleto: "payMpBoletoEnabled",
  mpWhatsapp: "payWhatsappEnabled",
  mpToken: "payMpAccessToken",
  mpPublic: "payMpPublicKey",
  psEnabled: "payPsEnabled",
  psToken: "payPsToken",
  psPublic: "payPsPublicKey",
  psSandbox: "payPsSandbox",
  ipEnabled: "payIpEnabled",
  ipHandle: "payIpHandle",
} as const;

async function getMap(keys: string[]) {
  try {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: keys } },
    });
    return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<
      string,
      string
    >;
  } catch {
    return {};
  }
}

async function upsert(key: string, value: string) {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

function flag(raw: string | undefined, fallback: boolean) {
  if (raw === undefined || raw === null || raw === "") return fallback;
  return raw === "true" || raw === "1";
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const map = await getMap(Object.values(KEYS));

  const mpTokenPanel = map[KEYS.mpToken]?.trim() || "";
  const mpToken =
    mpTokenPanel || process.env.MERCADOPAGO_ACCESS_TOKEN?.trim() || "";

  const psTokenPanel = (map[KEYS.psToken] || "").trim().replace(/^Bearer\s+/i, "");
  const psToken =
    psTokenPanel ||
    (process.env.PAGSEGURO_TOKEN || "").trim().replace(/^Bearer\s+/i, "") ||
    "";

  const ipHandlePanel = map[KEYS.ipHandle]?.trim().replace(/^\$/, "") || "";
  const ipHandle =
    ipHandlePanel ||
    process.env.INFINITYPAY_HANDLE?.trim().replace(/^\$/, "") ||
    "";

  return {
    mercadopago: {
      enabled: flag(map[KEYS.mpEnabled], Boolean(mpToken)),
      pixEnabled: flag(map[KEYS.mpPix], true),
      boletoEnabled: flag(map[KEYS.mpBoleto], false),
      whatsappEnabled: flag(map[KEYS.mpWhatsapp], true),
      accessToken: mpToken,
      publicKey:
        map[KEYS.mpPublic]?.trim() ||
        process.env.MERCADOPAGO_PUBLIC_KEY?.trim() ||
        "",
      tokenFromPanel: Boolean(mpTokenPanel),
    },
    pagseguro: {
      enabled: flag(map[KEYS.psEnabled], false),
      token: psToken,
      publicKey:
        map[KEYS.psPublic]?.trim() ||
        process.env.PAGSEGURO_PUBLIC_KEY?.trim() ||
        "",
      sandbox: flag(
        map[KEYS.psSandbox],
        process.env.PAGSEGURO_SANDBOX === "true"
      ),
      tokenFromPanel: Boolean(psTokenPanel),
    },
    infinitypay: {
      enabled: flag(map[KEYS.ipEnabled], false),
      handle: ipHandle,
      handleFromPanel: Boolean(ipHandlePanel),
    },
  };
}

/** Opções de pagamento visíveis no checkout. */
export async function getEnabledCheckoutMethods() {
  const s = await getPaymentSettings();
  const methods: {
    id: string;
    label: string;
    description: string;
    gateway: PaymentGatewayId;
  }[] = [];

  if (s.mercadopago.enabled && s.mercadopago.accessToken) {
    methods.push({
      id: "credit_card",
      label: "Cartão de crédito",
      description: "",
      gateway: "mercadopago",
    });
    if (s.mercadopago.pixEnabled) {
      methods.push({
        id: "pix",
        label: "Pix",
        description: "Pagamento instantâneo via Mercado Pago",
        gateway: "mercadopago",
      });
    }
    methods.push({
      id: "mercadopago_wallet",
      label: "Mercado Pago",
      description: "Pague com sua conta Mercado Pago",
      gateway: "mercadopago",
    });
  }

  if (s.pagseguro.enabled && s.pagseguro.token) {
    methods.push({
      id: "pagseguro_card",
      label: "Cartão de crédito",
      description: "PagBank — pague na loja, sem redirecionar",
      gateway: "pagseguro",
    });
    methods.push({
      id: "pagseguro_pix",
      label: "Pix",
      description: "PagBank — QR Code na loja, sem redirecionar",
      gateway: "pagseguro",
    });
  }

  if (s.infinitypay.enabled && s.infinitypay.handle) {
    methods.push({
      id: "infinitypay",
      label: "Infinity Pay",
      description: "Cartão em até 12x e Pix",
      gateway: "infinitypay",
    });
  }

  return methods;
}

export async function setPaymentSettings(input: {
  mercadopago?: {
    enabled?: boolean;
    pixEnabled?: boolean;
    boletoEnabled?: boolean;
    whatsappEnabled?: boolean;
    accessToken?: string | null;
    clearToken?: boolean;
    publicKey?: string;
  };
  pagseguro?: {
    enabled?: boolean;
    token?: string | null;
    clearToken?: boolean;
    sandbox?: boolean;
    publicKey?: string;
  };
  infinitypay?: {
    enabled?: boolean;
    handle?: string | null;
    clearHandle?: boolean;
  };
}) {
  const ops: Promise<unknown>[] = [];

  if (input.mercadopago) {
    const m = input.mercadopago;
    if (m.enabled !== undefined)
      ops.push(upsert(KEYS.mpEnabled, m.enabled ? "true" : "false"));
    if (m.pixEnabled !== undefined)
      ops.push(upsert(KEYS.mpPix, m.pixEnabled ? "true" : "false"));
    if (m.boletoEnabled !== undefined)
      ops.push(upsert(KEYS.mpBoleto, m.boletoEnabled ? "true" : "false"));
    if (m.whatsappEnabled !== undefined)
      ops.push(upsert(KEYS.mpWhatsapp, m.whatsappEnabled ? "true" : "false"));
    if (m.clearToken) ops.push(upsert(KEYS.mpToken, ""));
    else if (m.accessToken?.trim())
      ops.push(upsert(KEYS.mpToken, m.accessToken.trim()));
    if (m.publicKey !== undefined)
      ops.push(upsert(KEYS.mpPublic, m.publicKey.trim()));
  }

  if (input.pagseguro) {
    const p = input.pagseguro;
    if (p.enabled !== undefined)
      ops.push(upsert(KEYS.psEnabled, p.enabled ? "true" : "false"));
    if (p.sandbox !== undefined) {
      const prev = await getPaymentSettings();
      ops.push(upsert(KEYS.psSandbox, p.sandbox ? "true" : "false"));
      // Sandbox ↔ produção usam chaves públicas diferentes — limpa para regenerar.
      if (prev.pagseguro.sandbox !== p.sandbox && p.publicKey === undefined) {
        ops.push(upsert(KEYS.psPublic, ""));
      }
    }
    if (p.clearToken) ops.push(upsert(KEYS.psToken, ""));
    else if (p.token?.trim()) {
      const cleaned = p.token
        .trim()
        .replace(/^["']|["']$/g, "")
        .replace(/^Bearer\s+/i, "")
        .trim();
      if (cleaned) ops.push(upsert(KEYS.psToken, cleaned));
    }
    if (p.publicKey !== undefined)
      ops.push(upsert(KEYS.psPublic, p.publicKey.trim()));
  }

  if (input.infinitypay) {
    const i = input.infinitypay;
    if (i.enabled !== undefined)
      ops.push(upsert(KEYS.ipEnabled, i.enabled ? "true" : "false"));
    if (i.clearHandle) ops.push(upsert(KEYS.ipHandle, ""));
    else if (i.handle?.trim())
      ops.push(upsert(KEYS.ipHandle, i.handle.trim().replace(/^\$/, "")));
  }

  await Promise.all(ops);
  return getPaymentSettings();
}

export function maskSecret(value: string) {
  const t = value.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
