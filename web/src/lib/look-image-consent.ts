/** Termo de consentimento de imagem — Looks Influence Majesté */

export const LOOK_IMAGE_CONSENT_VERSION = "v1";

export const LOOK_IMAGE_CONSENT_PATH = "/termos-imagem-looks";

export const LOOK_IMAGE_CONSENT_TITLE =
  "Termo de consentimento de imagem — Influence Majesté";

/** Resumo curto para o painel lateral / checkbox. */
export const LOOK_IMAGE_CONSENT_SUMMARY =
  "Ao enviar o look, você autoriza a Majesté a usar a foto (e a legenda) no site, redes sociais, anúncios e materiais da marca, sem remuneração adicional além do cupom do programa Influence.";

export function formatConsentDate(iso: string | Date | null | undefined) {
  if (!iso) return null;
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function clientIpFromRequest(req: {
  headers: { get(name: string): string | null };
}) {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first.slice(0, 64);
  }
  const real = req.headers.get("x-real-ip");
  if (real) return real.trim().slice(0, 64);
  return null;
}
