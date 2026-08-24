/** Rótulos em português para pedidos e pagamentos */

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  PAID: "Pago",
  PROCESSING: "Em preparação",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovado",
  REJECTED: "Recusado",
  REFUNDED: "Reembolsado",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  pix: "Pix",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  boleto: "Boleto",
  whatsapp: "WhatsApp",
  mercadopago_wallet: "Carteira Mercado Pago",
  pagseguro: "Majeste",
  pagseguro_card: "Cartão Majeste",
  pagseguro_pix: "Pix Majeste",
  infinitypay: "Infinity Pay",
  cash: "Dinheiro",
  transfer: "Transferência",
};

export function orderStatusLabel(status?: string | null) {
  if (!status) return "—";
  return ORDER_STATUS_LABEL[status] || status;
}

export function paymentStatusLabel(status?: string | null) {
  if (!status) return "—";
  return PAYMENT_STATUS_LABEL[status] || status;
}

export function paymentMethodLabel(method?: string | null) {
  if (!method) return "—";
  return PAYMENT_METHOD_LABEL[method] || method;
}
