import crypto from "crypto";

function secret() {
  return (
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.ORDER_ACCESS_SECRET ||
    ""
  );
}

/** Token curto na URL do comprovante — impede adivinhar pedido só pelo número. */
export function signOrderAccess(orderNumber: string) {
  const s = secret();
  if (!s) return "";
  return crypto
    .createHmac("sha256", s)
    .update(`majesté-order:${orderNumber}`)
    .digest("hex")
    .slice(0, 32);
}

export function verifyOrderAccess(
  orderNumber: string,
  token?: string | null
): boolean {
  if (!token || !secret()) return false;
  const expected = signOrderAccess(orderNumber);
  if (!expected || expected.length !== token.length) return false;
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf8"),
      Buffer.from(token, "utf8")
    );
  } catch {
    return false;
  }
}

export function checkoutSuccessPath(orderNumber: string, extra?: string) {
  const t = signOrderAccess(orderNumber);
  const params = new URLSearchParams({ order: orderNumber });
  if (t) params.set("t", t);
  if (extra) {
    const more = new URLSearchParams(extra);
    more.forEach((v, k) => params.set(k, v));
  }
  return `/checkout/sucesso?${params.toString()}`;
}
