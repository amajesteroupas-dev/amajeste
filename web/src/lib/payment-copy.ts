/** Textos de pagamento exibidos em todos os produtos (editáveis no painel). */

export type PaymentCopySettings = {
  /** Linha sob o preço nos cards da loja */
  productCardLine: string;
  /** Linha sob o preço nos cards quando a promoção do site está ativa */
  productCardLinePromo: string;
  /**
   * Título do bloco Pix na página do produto.
   * Use {percent} / {pixPercent} (ex.: "5% de desconto comprando no Pix").
   */
  pixHeadline: string;
  /** Detalhe sob o título Pix. Use {price}, {listPrice}, {percent}. */
  pixDetail: string;
  /** Título quando a promoção do site está ativa. Use {percent}. */
  pixHeadlinePromo: string;
  /** Detalhe com promoção do site. Use {price}, {percent}, {pixPercent}. */
  pixDetailPromo: string;
  /** Texto do rodapé (meios de pagamento). */
  footerPaymentLine: string;
};

export const DEFAULT_PAYMENT_COPY: PaymentCopySettings = {
  productCardLine:
    "{pixPercent}% de desconto no Pix · Não acumulável · {price}",
  productCardLinePromo:
    "{percent}% OFF no site · no Pix o desconto de {pixPercent}% já está incluso · {price}",
  pixHeadline: "{pixPercent}% de desconto comprando no Pix",
  pixDetail: "Não acumulável com outras promoções",
  pixHeadlinePromo: "{percent}% de desconto em todo o site",
  pixDetailPromo:
    "No Pix o desconto de {pixPercent}% já está incluso · Não acumulável",
  footerPaymentLine:
    "Ganhe 5% de desconto no Pix. Não acumulável com outras promoções. Pagamentos processados com segurança.",
};

export type PaymentCopyVars = {
  percent?: number | string;
  pixPercent?: number | string;
  /** Preço final no Pix (ou com promoção do site). */
  price?: string;
  /** Preço cheio / de tabela, antes do desconto Pix. */
  listPrice?: string;
  installments?: number | string;
};

export function fillPaymentCopy(
  template: string,
  vars: PaymentCopyVars
): string {
  return template
    .replaceAll("{percent}", String(vars.percent ?? ""))
    .replaceAll("{pixPercent}", String(vars.pixPercent ?? ""))
    .replaceAll("{listPrice}", String(vars.listPrice ?? ""))
    .replaceAll("{price}", String(vars.price ?? ""))
    .replaceAll("{installments}", String(vars.installments ?? ""));
}

/**
 * Detecta textos que viram só um número no card (ex.: "{percent}" → "15"),
 * duplicando o badge −15% do preço.
 */
export function isBarePercentCopy(template: string): boolean {
  const t = template.trim();
  if (!t) return true;
  if (/^\{percent\}\s*%?$/i.test(t)) return true;
  if (/^\d{1,2}\s*%?$/.test(t)) return true;
  return false;
}

/** Texto do card com promoção ativa. `null` = não mostrar linha nenhuma. */
export function resolveProductCardPromoLine(
  template: string,
  vars: PaymentCopyVars
): string | null {
  if (isBarePercentCopy(template)) return null;
  const filled = fillPaymentCopy(template, vars).trim();
  if (!filled || isBarePercentCopy(filled)) return null;
  return filled;
}
