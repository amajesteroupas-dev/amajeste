import { prisma } from "@/lib/prisma";
import {
  getMelhorEnvioConfig,
  type MelhorEnvioConfig,
} from "@/lib/melhor-envio-settings";
import { meBase } from "@/lib/shipping";

export const STORE_SENDER_KEYS = {
  name: "storeSenderName",
  phone: "storeSenderPhone",
  email: "storeSenderEmail",
  document: "storeSenderDocument",
  address: "storeSenderAddress",
  number: "storeSenderNumber",
  complement: "storeSenderComplement",
  district: "storeSenderDistrict",
  city: "storeSenderCity",
  state: "storeSenderState",
} as const;

export type StoreSender = {
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
  postal_code: string;
};

async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

async function setSetting(key: string, value: string) {
  await prisma.siteSetting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
}

export async function getStoreSender(
  cfg?: MelhorEnvioConfig
): Promise<StoreSender> {
  const config = cfg || (await getMelhorEnvioConfig());
  const [
    name,
    phone,
    email,
    document,
    address,
    number,
    complement,
    district,
    city,
    state,
  ] = await Promise.all([
    getSetting(STORE_SENDER_KEYS.name),
    getSetting(STORE_SENDER_KEYS.phone),
    getSetting(STORE_SENDER_KEYS.email),
    getSetting(STORE_SENDER_KEYS.document),
    getSetting(STORE_SENDER_KEYS.address),
    getSetting(STORE_SENDER_KEYS.number),
    getSetting(STORE_SENDER_KEYS.complement),
    getSetting(STORE_SENDER_KEYS.district),
    getSetting(STORE_SENDER_KEYS.city),
    getSetting(STORE_SENDER_KEYS.state),
  ]);

  return {
    name: name?.trim() || "Majesté Fitness",
    phone: (phone || process.env.NEXT_PUBLIC_CONTACT_PHONE || "61999039007").replace(
      /\D/g,
      ""
    ),
    email:
      email?.trim() ||
      process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
      "Josianesantosmajeste@gmail.com",
    document: (document || "").replace(/\D/g, ""),
    address: address?.trim() || "",
    number: number?.trim() || "S/N",
    complement: complement?.trim() || "",
    district: district?.trim() || "Centro",
    city: city?.trim() || "Planaltina",
    state: (state || "DF").replace(/\s/g, "").toUpperCase().slice(0, 2),
    postal_code: config.storeZip,
  };
}

export async function setStoreSender(input: Partial<Omit<StoreSender, "postal_code">>) {
  const map: [keyof typeof STORE_SENDER_KEYS, string | undefined][] = [
    ["name", input.name],
    ["phone", input.phone],
    ["email", input.email],
    ["document", input.document],
    ["address", input.address],
    ["number", input.number],
    ["complement", input.complement],
    ["district", input.district],
    ["city", input.city],
    ["state", input.state],
  ];
  for (const [k, v] of map) {
    if (v === undefined) continue;
    let value = String(v).trim();
    if (k === "phone" || k === "document") value = value.replace(/\D/g, "");
    if (k === "state") value = value.toUpperCase().slice(0, 2);
    await setSetting(STORE_SENDER_KEYS[k], value);
  }
}

export async function meFetch(
  path: string,
  init?: RequestInit & { cfg?: MelhorEnvioConfig }
) {
  const cfg = init?.cfg || (await getMelhorEnvioConfig());
  if (!cfg.token) {
    throw new Error("Token Melhor Envio não configurado");
  }
  const { cfg: _c, ...rest } = init || {};
  const res = await fetch(`${meBase(cfg.sandbox)}/api/v2${path}`, {
    ...rest,
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": cfg.userAgent,
      ...(rest.headers || {}),
    },
  });
  return res;
}

export type MelhorEnvioAccount = {
  ok: boolean;
  error?: string;
  sandbox: boolean;
  name?: string;
  email?: string;
  document?: string;
  balance?: number;
  picture?: string | null;
};

export async function fetchMelhorEnvioAccount(): Promise<MelhorEnvioAccount> {
  const cfg = await getMelhorEnvioConfig();
  if (!cfg.token) {
    return { ok: false, sandbox: cfg.sandbox, error: "Sem token" };
  }
  try {
    const [meRes, balRes] = await Promise.all([
      meFetch("/me", { method: "GET", cfg }),
      meFetch("/me/balance", { method: "GET", cfg }),
    ]);

    if (!meRes.ok) {
      const detail = await meRes.text().catch(() => "");
      return {
        ok: false,
        sandbox: cfg.sandbox,
        error: `Token inválido ou expirado (${meRes.status})${detail ? `: ${detail.slice(0, 120)}` : ""}`,
      };
    }

    const me = (await meRes.json()) as {
      firstname?: string;
      lastname?: string;
      name?: string;
      email?: string;
      document?: string;
      picture?: string | null;
    };
    let balance = 0;
    if (balRes.ok) {
      const bal = (await balRes.json()) as { balance?: string | number };
      balance = Number(bal.balance || 0);
    }

    const name =
      me.name ||
      [me.firstname, me.lastname].filter(Boolean).join(" ").trim() ||
      undefined;

    return {
      ok: true,
      sandbox: cfg.sandbox,
      name,
      email: me.email,
      document: me.document,
      balance,
      picture: me.picture ?? null,
    };
  } catch (e) {
    return {
      ok: false,
      sandbox: cfg.sandbox,
      error: e instanceof Error ? e.message : "Falha ao consultar conta",
    };
  }
}
