/** Contato e redes — sobrescreva via .env (NEXT_PUBLIC_*) */

function digitsOnly(value?: string | null) {
  return (value || "").replace(/\D/g, "");
}

/** Normaliza para wa.me (Brasil: 55 + DDD + número) */
function toWhatsAppDigits(raw?: string | null) {
  const d = digitsOnly(raw);
  if (!d) return "5561999039007";
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length === 11 || d.length === 10) return `55${d}`;
  return d;
}

export const siteContact = {
  brand: "Majesté",
  phoneDisplay: process.env.NEXT_PUBLIC_CONTACT_PHONE || "(61) 99903-9007",
  phoneDigits: toWhatsAppDigits(
    process.env.NEXT_PUBLIC_WHATSAPP ||
      process.env.NEXT_PUBLIC_CONTACT_PHONE ||
      "5561999039007"
  ),
  email:
    process.env.NEXT_PUBLIC_CONTACT_EMAIL ||
    "Josianesantosmajeste@gmail.com",
  instagram: process.env.NEXT_PUBLIC_INSTAGRAM || "amajeste_",
  whatsappMessage:
    process.env.NEXT_PUBLIC_WHATSAPP_MSG ||
    "Olá! Vim pelo site da Majesté e gostaria de atendimento.",
};

export function whatsappUrl(text?: string) {
  const msg = encodeURIComponent(text || siteContact.whatsappMessage);
  return `https://wa.me/${siteContact.phoneDigits}?text=${msg}`;
}

/** Link wa.me para o telefone do cliente (sem fallback para a loja). */
export function customerWhatsAppUrl(
  phone?: string | null,
  text?: string
): string | null {
  const d = digitsOnly(phone);
  if (!d) return null;
  let digits = d;
  if (digits.startsWith("55") && digits.length >= 12) {
    // ok
  } else if (digits.length === 11 || digits.length === 10) {
    digits = `55${digits}`;
  }
  const msg = encodeURIComponent(text || "");
  return `https://wa.me/${digits}?text=${msg}`;
}

export function instagramUrl() {
  const handle = siteContact.instagram.replace(/^@/, "").replace(/\/$/, "");
  return `https://www.instagram.com/${handle}/`;
}

/** Padrões de pagamento na loja */
export const defaultPayment = {
  installmentsMax: 2,
  interestFree: true,
  pixDiscountPercent: 5,
  showCardFlags: true,
};
