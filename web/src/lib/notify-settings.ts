import { prisma } from "@/lib/prisma";

export const NOTIFY_KEYS = {
  emailOnOrder: "notifyEmailOnOrder",
  whatsappOnOrder: "notifyWhatsappOnOrder",
  provider: "notifyWhatsappProvider",
  zapiInstance: "notifyZapiInstance",
  zapiToken: "notifyZapiToken",
  zapiClientToken: "notifyZapiClientToken",
  evolutionUrl: "notifyEvolutionUrl",
  evolutionKey: "notifyEvolutionKey",
  evolutionInstance: "notifyEvolutionInstance",
} as const;

export type WhatsappProvider = "zapi" | "evolution";

export type NotifyConfig = {
  emailOnOrder: boolean;
  whatsappOnOrder: boolean;
  mailConfigured: boolean;
  provider: WhatsappProvider;
  zapiInstance: string;
  zapiToken: string;
  zapiClientToken: string;
  evolutionUrl: string;
  evolutionKey: string;
  evolutionInstance: string;
  whatsappReady: boolean;
};

function flag(value: string | null | undefined, fallback: boolean) {
  if (value == null || value === "") return fallback;
  return value === "true" || value === "1";
}

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

export function maskSecret(value: string) {
  const t = value.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

export async function getNotifyConfig(): Promise<NotifyConfig> {
  const [
    emailOnOrder,
    whatsappOnOrder,
    provider,
    zapiInstance,
    zapiToken,
    zapiClientToken,
    evolutionUrl,
    evolutionKey,
    evolutionInstance,
  ] = await Promise.all([
    getSetting(NOTIFY_KEYS.emailOnOrder),
    getSetting(NOTIFY_KEYS.whatsappOnOrder),
    getSetting(NOTIFY_KEYS.provider),
    getSetting(NOTIFY_KEYS.zapiInstance),
    getSetting(NOTIFY_KEYS.zapiToken),
    getSetting(NOTIFY_KEYS.zapiClientToken),
    getSetting(NOTIFY_KEYS.evolutionUrl),
    getSetting(NOTIFY_KEYS.evolutionKey),
    getSetting(NOTIFY_KEYS.evolutionInstance),
  ]);

  const cfg: NotifyConfig = {
    emailOnOrder: flag(emailOnOrder, true),
    whatsappOnOrder: flag(whatsappOnOrder, true),
    mailConfigured: Boolean(
      process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS
    ),
    provider: provider === "evolution" ? "evolution" : "zapi",
    zapiInstance:
      zapiInstance?.trim() || process.env.WHATSAPP_ZAPI_INSTANCE?.trim() || "",
    zapiToken: zapiToken?.trim() || process.env.WHATSAPP_ZAPI_TOKEN?.trim() || "",
    zapiClientToken:
      zapiClientToken?.trim() ||
      process.env.WHATSAPP_ZAPI_CLIENT_TOKEN?.trim() ||
      "",
    evolutionUrl:
      evolutionUrl?.trim() || process.env.WHATSAPP_EVOLUTION_URL?.trim() || "",
    evolutionKey:
      evolutionKey?.trim() || process.env.WHATSAPP_EVOLUTION_KEY?.trim() || "",
    evolutionInstance:
      evolutionInstance?.trim() ||
      process.env.WHATSAPP_EVOLUTION_INSTANCE?.trim() ||
      "",
    whatsappReady: false,
  };

  cfg.whatsappReady =
    cfg.provider === "zapi"
      ? Boolean(cfg.zapiInstance && cfg.zapiToken)
      : Boolean(cfg.evolutionUrl && cfg.evolutionKey && cfg.evolutionInstance);

  return cfg;
}

export async function setNotifyConfig(input: {
  emailOnOrder?: boolean;
  whatsappOnOrder?: boolean;
  provider?: WhatsappProvider;
  zapiInstance?: string | null;
  zapiToken?: string | null;
  zapiClientToken?: string | null;
  evolutionUrl?: string | null;
  evolutionKey?: string | null;
  evolutionInstance?: string | null;
  clearZapi?: boolean;
  clearEvolution?: boolean;
}) {
  if (input.emailOnOrder !== undefined) {
    await setSetting(NOTIFY_KEYS.emailOnOrder, input.emailOnOrder ? "true" : "false");
  }
  if (input.whatsappOnOrder !== undefined) {
    await setSetting(
      NOTIFY_KEYS.whatsappOnOrder,
      input.whatsappOnOrder ? "true" : "false"
    );
  }
  if (input.provider) {
    await setSetting(NOTIFY_KEYS.provider, input.provider);
  }

  if (input.clearZapi) {
    await Promise.all([
      setSetting(NOTIFY_KEYS.zapiInstance, ""),
      setSetting(NOTIFY_KEYS.zapiToken, ""),
      setSetting(NOTIFY_KEYS.zapiClientToken, ""),
    ]);
  } else {
    if (input.zapiInstance?.trim()) {
      await setSetting(NOTIFY_KEYS.zapiInstance, input.zapiInstance.trim());
    }
    if (input.zapiToken?.trim()) {
      await setSetting(NOTIFY_KEYS.zapiToken, input.zapiToken.trim());
    }
    if (input.zapiClientToken?.trim()) {
      await setSetting(NOTIFY_KEYS.zapiClientToken, input.zapiClientToken.trim());
    }
  }

  if (input.clearEvolution) {
    await Promise.all([
      setSetting(NOTIFY_KEYS.evolutionUrl, ""),
      setSetting(NOTIFY_KEYS.evolutionKey, ""),
      setSetting(NOTIFY_KEYS.evolutionInstance, ""),
    ]);
  } else {
    if (input.evolutionUrl?.trim()) {
      await setSetting(
        NOTIFY_KEYS.evolutionUrl,
        input.evolutionUrl.trim().replace(/\/$/, "")
      );
    }
    if (input.evolutionKey?.trim()) {
      await setSetting(NOTIFY_KEYS.evolutionKey, input.evolutionKey.trim());
    }
    if (input.evolutionInstance?.trim()) {
      await setSetting(
        NOTIFY_KEYS.evolutionInstance,
        input.evolutionInstance.trim()
      );
    }
  }

  return getNotifyConfig();
}
