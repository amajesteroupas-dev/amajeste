import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBRL(value: number | string) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);
}

/**
 * Interpreta valores em formato BR (10.000 / 10.000,50) ou US (10000.50).
 * "10.000" → 10000 (milhares), não 10.
 */
export function parseBRLMoney(raw: string | number | null | undefined): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : 0;
  }
  if (raw == null) return 0;
  let s = String(raw).trim();
  if (!s) return 0;
  s = s.replace(/R\$\s?/gi, "").replace(/\s/g, "");
  if (!s) return 0;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    // 10.000,50
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    // 10000,50 ou 10,5
    s = s.replace(",", ".");
  } else if (hasDot && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    // 10.000 ou 1.234.567 — só milhares
    s = s.replace(/\./g, "");
  }
  // senão: 10000 ou 10.5 (decimal US)

  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/** Texto amigável para input (pt-BR, sem símbolo). */
export function formatBRLInput(value: number): string {
  if (!value || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat("pt-BR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
}

const BR_TZ = "America/Sao_Paulo";

/** Data/hora no fuso de Brasília (UTC−3), independente do fuso do servidor. */
export function formatDateTimeBR(
  value: Date | string | number | null | undefined,
  opts?: { seconds?: boolean }
) {
  if (value == null || value === "") return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";

  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: BR_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...(opts?.seconds ? { second: "2-digit" as const } : {}),
    hour12: false,
  }).format(d);
}

export function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

