/** Revise ao reprocessar cutouts / SDR — quebra cache immutable antigo */
export const MEDIA_CACHE_REV = "sdr3";

/** Acrescenta ?v= nas URLs de cutout/produto SDR para forçar reload */
export function mediaSrc(url: string | null | undefined): string {
  if (!url) return "";
  const needs =
    /\/cutout/i.test(url) ||
    /cutout-/i.test(url) ||
    /\/products-sdr\//i.test(url) ||
    /\/products\//i.test(url);
  if (!needs) return url;
  if (/[?&]v=/.test(url)) return url;
  return `${url}${url.includes("?") ? "&" : "?"}v=${MEDIA_CACHE_REV}`;
}
