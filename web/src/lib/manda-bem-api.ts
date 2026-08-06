import { getMandaBemConfig } from "@/lib/manda-bem-settings";
import type { ShippingProductInput, ShippingQuote } from "@/lib/shipping";

const MB_BASE = "https://mandabem.com.br/ws";

export type MandaBemService = "PAC" | "SEDEX" | "PACMINI";

type ValorEnvioResultado = {
  sucesso?: string | boolean;
  mensagem?: string;
  erro?: string;
  PAC?: { valor?: string; prazo?: string };
  SEDEX?: { valor?: string; prazo?: string };
  PACMINI?: { valor?: string; prazo?: string };
};

/**
 * Aceita "36,98" (docs Manda Bem), "36.98" (formato 0.00 da própria API)
 * e "1.234,56" / "1,234.56".
 */
function parseBrl(value?: string | number) {
  if (value == null || value === "") return NaN;
  if (typeof value === "number") return Number.isFinite(value) ? value : NaN;

  const s = String(value).trim().replace(/[^\d.,-]/g, "");
  if (!s || s === "-" || s === "." || s === ",") return NaN;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");

  if (hasComma && hasDot) {
    // Último separador = decimal
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      return Number(s.replace(/\./g, "").replace(",", "."));
    }
    return Number(s.replace(/,/g, ""));
  }

  if (hasComma) {
    return Number(s.replace(",", "."));
  }

  if (hasDot) {
    const parts = s.split(".");
    // Um ponto e 1–2 casas → decimal (ex.: 36.98), não milhar
    if (parts.length === 2 && parts[1].length <= 2) {
      return Number(s);
    }
    return Number(s.replace(/\./g, ""));
  }

  return Number(s);
}

function parsePrazo(value?: string) {
  const n = Number(String(value || "").replace(/\D/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 7;
}

function packDims(products: ShippingProductInput[]) {
  const totalWeight = products.reduce(
    (s, p) => s + Math.max(0.01, p.weightKg) * Math.max(1, p.quantity),
    0
  );
  const maxH = Math.max(...products.map((p) => p.heightCm), 1);
  const maxW = Math.max(...products.map((p) => p.widthCm), 1);
  const maxL = Math.max(...products.map((p) => p.lengthCm), 1);
  const insurance = products.reduce(
    (s, p) => s + Number(p.insuranceValue || 0) * Math.max(1, p.quantity),
    0
  );
  return {
    peso: Math.max(0.01, Number(totalWeight.toFixed(3))),
    altura: Math.max(1, Math.round(maxH)),
    largura: Math.max(1, Math.round(maxW)),
    comprimento: Math.max(1, Math.round(maxL)),
    valorSeguro: Math.max(0, Number(insurance.toFixed(2))),
  };
}

async function postForm(path: string, fields: Record<string, string>) {
  const body = new URLSearchParams(fields);
  const res = await fetch(`${MB_BASE}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body,
  });
  const text = await res.text();
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json, text };
}

/** Consulta um serviço (PAC / SEDEX / PACMINI) na Manda Bem. */
export async function mandaBemQuoteService(params: {
  plataformaId: string;
  plataformaChave: string;
  cepOrigem: string;
  cepDestino: string;
  servico: MandaBemService;
  peso: number;
  altura: number;
  largura: number;
  comprimento: number;
  valorSeguro?: number;
}) {
  const fields: Record<string, string> = {
    plataforma_id: params.plataformaId,
    plataforma_chave: params.plataformaChave,
    tipoTransacao: "consultaValorFrete",
    cep_origem: params.cepOrigem.replace(/\D/g, "").slice(0, 8),
    cep_destino: params.cepDestino.replace(/\D/g, "").slice(0, 8),
    servico: params.servico,
    peso: String(params.peso),
    altura: String(params.altura),
    largura: String(params.largura),
    comprimento: String(params.comprimento),
  };
  if (params.valorSeguro && params.valorSeguro > 0) {
    fields.valor_seguro = params.valorSeguro.toFixed(2);
  }

  const { ok, status, json, text } = await postForm("/valor_envio", fields);
  const root = json as { resultado?: ValorEnvioResultado; erro?: string };
  const resultado = root?.resultado || (json as ValorEnvioResultado);
  const sucesso =
    String(resultado?.sucesso ?? "").toLowerCase() === "true" ||
    resultado?.sucesso === true;

  if (!ok || !sucesso) {
    const err =
      resultado?.erro ||
      root?.erro ||
      resultado?.mensagem ||
      `HTTP ${status}`;
    return { ok: false as const, error: err, raw: text };
  }

  const block = resultado?.[params.servico];
  const price = parseBrl(block?.valor);
  if (!Number.isFinite(price) || price <= 0) {
    return {
      ok: false as const,
      error:
        resultado?.erro ||
        `Sem precificação para ${params.servico}`,
      raw: text,
    };
  }

  return {
    ok: true as const,
    price: Math.round(price * 100) / 100,
    deliveryDays: parsePrazo(block?.prazo),
    mensagem: resultado?.mensagem,
  };
}

/** Cotações PAC/SEDEX (+ PACMINI se couber) para o checkout. */
export async function quoteMandaBem(params: {
  toZip: string;
  products: ShippingProductInput[];
  /** Ignora flag enabled do painel (usado quando o seletor de API força Manda Bem) */
  force?: boolean;
}): Promise<ShippingQuote[]> {
  const cfg = await getMandaBemConfig();
  if (!cfg.plataformaId || !cfg.plataformaChave) {
    return [];
  }
  if (!params.force && !cfg.enabled) {
    return [];
  }

  const dims = packDims(params.products);
  // A transportadora usada nos bastidores não deve aparecer para a cliente.
  // Exibimos somente os dois serviços tradicionais dos Correios.
  const services: MandaBemService[] = ["PAC", "SEDEX"];

  const results = await Promise.all(
    services.map(async (servico) => {
      const r = await mandaBemQuoteService({
        plataformaId: cfg.plataformaId,
        plataformaChave: cfg.plataformaChave,
        cepOrigem: cfg.cepOrigem,
        cepDestino: params.toZip,
        servico,
        ...dims,
      });
      if (!r.ok) {
        console.warn(`[Manda Bem] ${servico}:`, r.error);
        return null;
      }
      return {
        id: `mb-${servico.toLowerCase()}`,
        name: servico,
        company: "Correios",
        price: r.price,
        deliveryDays: r.deliveryDays,
        currency: "BRL",
      } satisfies ShippingQuote;
    })
  );

  return results
    .filter((q): q is NonNullable<typeof q> => q !== null)
    .sort((a, b) => a.price - b.price);
}

export function isMandaBemShippingId(id?: string | null) {
  return Boolean(id && String(id).startsWith("mb-"));
}
