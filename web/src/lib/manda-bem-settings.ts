import { prisma } from "@/lib/prisma";

export const MB_ID_KEY = "mandaBemPlataformaId";
export const MB_CHAVE_KEY = "mandaBemPlataformaChave";
export const MB_ENABLED_KEY = "mandaBemEnabled";
export const MB_ORIGIN_ZIP_KEY = "mandaBemCepOrigem";

export type MandaBemConfig = {
  plataformaId: string;
  plataformaChave: string;
  enabled: boolean;
  /** CEP origem (usa storeZip / STORE_ZIP se vazio) */
  cepOrigem: string;
  chaveFromPanel: boolean;
  idFromPanel: boolean;
};

async function getSetting(key: string): Promise<string | null> {
  try {
    const row = await prisma.siteSetting.findUnique({ where: { key } });
    return row?.value ?? null;
  } catch {
    return null;
  }
}

export async function getMandaBemConfig(): Promise<MandaBemConfig> {
  const [idDb, chaveDb, enabledDb, zipDb, storeZipDb] = await Promise.all([
    getSetting(MB_ID_KEY),
    getSetting(MB_CHAVE_KEY),
    getSetting(MB_ENABLED_KEY),
    getSetting(MB_ORIGIN_ZIP_KEY),
    getSetting("storeZip"),
  ]);

  const plataformaId =
    idDb?.trim() || process.env.MANDABEM_PLATAFORMA_ID?.trim() || "";
  const plataformaChave =
    chaveDb?.trim() || process.env.MANDABEM_PLATAFORMA_CHAVE?.trim() || "";

  const enabledRaw =
    enabledDb?.trim() || process.env.MANDABEM_ENABLED || "false";
  const enabled =
    (enabledRaw === "true" || enabledRaw === "1") &&
    Boolean(plataformaId && plataformaChave);

  const cepOrigem = (
    zipDb?.trim() ||
    storeZipDb?.trim() ||
    process.env.STORE_ZIP?.trim() ||
    "73310000"
  )
    .replace(/\D/g, "")
    .slice(0, 8);

  return {
    plataformaId,
    plataformaChave,
    enabled,
    cepOrigem: cepOrigem || "73310000",
    chaveFromPanel: Boolean(chaveDb?.trim()),
    idFromPanel: Boolean(idDb?.trim()),
  };
}

export async function setMandaBemConfig(input: {
  plataformaId?: string | null;
  plataformaChave?: string | null;
  clearChave?: boolean;
  enabled?: boolean;
  cepOrigem?: string;
}) {
  const ops: Promise<unknown>[] = [];

  if (input.plataformaId !== undefined && input.plataformaId !== null) {
    const value = String(input.plataformaId).trim();
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: MB_ID_KEY },
        create: { key: MB_ID_KEY, value },
        update: { value },
      })
    );
  }

  if (input.clearChave) {
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: MB_CHAVE_KEY },
        create: { key: MB_CHAVE_KEY, value: "" },
        update: { value: "" },
      })
    );
  } else if (
    input.plataformaChave !== undefined &&
    input.plataformaChave !== null
  ) {
    const value = String(input.plataformaChave).trim();
    if (value) {
      ops.push(
        prisma.siteSetting.upsert({
          where: { key: MB_CHAVE_KEY },
          create: { key: MB_CHAVE_KEY, value },
          update: { value },
        })
      );
    }
  }

  if (input.enabled !== undefined) {
    const value = input.enabled ? "true" : "false";
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: MB_ENABLED_KEY },
        create: { key: MB_ENABLED_KEY, value },
        update: { value },
      })
    );
  }

  if (input.cepOrigem !== undefined) {
    const value =
      String(input.cepOrigem).replace(/\D/g, "").slice(0, 8) || "73310000";
    ops.push(
      prisma.siteSetting.upsert({
        where: { key: MB_ORIGIN_ZIP_KEY },
        create: { key: MB_ORIGIN_ZIP_KEY, value },
        update: { value },
      })
    );
  }

  await Promise.all(ops);
  return getMandaBemConfig();
}

export function maskChave(chave: string) {
  const t = chave.trim();
  if (!t) return "";
  if (t.length <= 8) return "••••••••";
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}
