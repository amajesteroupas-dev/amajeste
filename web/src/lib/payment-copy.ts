/** Textos de pagamento exibidos em todos os produtos (editáveis no painel). */

export type PaymentCopySettings = {
  /** Linha sob o preço nos cards da loja */
  productCardLine: string;
  /** Linha sob o preço nos cards quando a promoção do site está ativa */
  productCardLinePromo: string;
  /**
   * Título do bloco Pix na página do produto.
   * Use {percent} para o % (ex.: "5% de desconto pagando com Pix").
   */
  pixHeadline: string;
  /** Detalhe sob o título Pix. Use {price} e {percent}. */
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
    "Parcele em 2x sem juros ou ganhe 5% de desconto no pix.",
  productCardLinePromo:
    "{percent}% OFF no site · no Pix o desconto de {pixPercent}% já está incluso.",
  pixHeadline: "{percent}% de desconto pagando com Pix",
  pixDetail: "{price} no Pix · Não acumulável com outras promoções",
  pixHeadlinePromo: "{percent}% de desconto em todo o site",
  pixDetailPromo:
    "{price} · no Pix o desconto de {pixPercent}% já está incluso",
  footerPaymentLine:
    "Parcele em 2x sem juros ou ganhe 5% de desconto no pix. Pagamentos processados com segurança via Mercado Pago.",
};

export type PaymentCopyVars = {
  percent?: number | string;
  pixPercent?: number | string;
  price?: string;
  installments?: number | string;
};

export function fillPaymentCopy(
  template: string,
  vars: PaymentCopyVars
): string {
  return template
    .replaceAll("{percent}", String(vars.percent ?? ""))
    .replaceAll("{pixPercent}", String(vars.pixPercent ?? ""))
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
