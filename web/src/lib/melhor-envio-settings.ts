import { prisma } from "@/lib/prisma";

export const ME_TOKEN_KEY = "melhorEnvioToken";
export const ME_SANDBOX_KEY = "melhorEnvioSandbox";
export const ME_USER_AGENT_KEY = "melhorEnvioUserAgent";
export const STORE_ZIP_KEY = "storeZip";

export type MelhorEnvioConfig = {
  token: string;
  sandbox: boolean;
  userAgent: string;
  storeZip: string;
  /** Token veio do painel (não só do .env) */
  tokenFromPanel: boolean;
};

const DEFAULT_UA = "Majeste Fitness (contato@equilibra.tech)";
/** CEP padrão Planaltina-DF (ajuste no painel se necessário) */
const DEFAULT_ZIP = "73310000";

async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function getMelhorEnvioConfig(): Promise<MelhorEnvioConfig> {
  const [tokenDb, sandboxDb, uaDb, zipDb] = await Promise.all([
    getSetting(ME_TOKEN_KEY),
    getSetting(ME_SANDBOX_KEY),
    getSetting(ME_USER_AGENT_KEY),
    getSetting(STORE_ZIP_KEY),
  ]);

  const tokenFromPanel = Boolean(tokenDb?.trim());
  const token =
    tokenDb?.trim() || process.env.MELHOR_ENVIO_TOKEN?.trim() || "";

  const sandboxRaw =
    sandboxDb?.trim() || process.env.MELHOR_ENVIO_SANDBOX || "false";
  const sandbox = sandboxRaw === "true" || sandboxRaw === "1";

  const userAgent =
    uaDb?.trim() ||
    process.env.MELHOR_ENVIO_USER_AGENT?.trim() ||
    DEFAULT_UA;

  const storeZip = (
    zipDb?.trim() ||
    process.env.STORE_ZIP?.trim() ||
    DEFAULT_ZIP
  ).replace(/\D/g, "").slice(0, 8);

  return {
    token,
    sandbox,
    userAgent,
    storeZip: storeZip || DEFAULT_ZIP,
    tokenFromPanel,
  };
}

export async function setMelhorEnvioConfig(input: {
  token?: string | null;
  clearToken?: boolean;
  sandbox?: boolean;
  userAgent?: string;
  storeZip?: string;
}) {
  const ops: Promise<unknown>[] = [];

  if (input.clearToken) {
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: ME_TOKEN_KEY },
        create: { key: ME_TOKEN_KEY, value: "" },
        update: { value: "" },
      })
    );
  } else if (input.token !== undefined && input.token !== null) {
    const token = String(input.token).trim();
    if (token) {
      ops.push(
        prisma.siteSetting.upsert({
          where: { key: ME_TOKEN_KEY },
          create: { key: ME_TOKEN_KEY, value: token },
          update: { value: token },
        })
      );
    }
  }

  if (input.sandbox !== undefined) {
    const value = input.sandbox ? "true" : "false";
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: ME_SANDBOX_KEY },
        create: { key: ME_SANDBOX_KEY, value },
        update: { value },
      })
    );
  }

  if (input.userAgent !== undefined) {
    const value = String(input.userAgent).trim() || DEFAULT_UA;
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: ME_USER_AGENT_KEY },
        create: { key: ME_USER_AGENT_KEY, value },
        update: { value },
      })
    );
  }

  if (input.storeZip !== undefined) {
    const value =
      String(input.storeZip).replace(/\D/g, "").slice(0, 8) || DEFAULT_ZIP;
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: STORE_ZIP_KEY },
        create: { key: STORE_ZIP_KEY, value },
        update: { value },
      })
    );
  }

  await Promise.all(ops);
  return getMelhorEnvioConfig();
}

export function maskToken(token: string) {
  const t = token.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
