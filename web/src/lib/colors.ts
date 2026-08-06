/** Canonical color names + aliases from messy WooCommerce attributes */

const ALIASES: Record<string, string> = {
  // azul
  azul: "Azul",
  azul3: "Azul",
  "azul marinho": "Azul Marinho",
  "azul bebê": "Azul bebê",
  "azul bebe": "Azul bebê",
  azulbebe: "Azul bebê",
  azulclaro: "Azul bebê",
  "azul claro": "Azul bebê",
  "azul agua": "Azul água",
  "azul água": "Azul água",
  // rosa
  rosa: "Rosa",
  "rosa bebê": "Rosa bebê",
  "rosa bebe": "Rosa bebê",
  rosabb: "Rosa bebê",
  "rosa pink": "Rosa pink",
  "rosa claro": "Rosa claro",
  "rosa ciclete": "Rosa chiclete",
  "rosa chiclete": "Rosa chiclete",
  "rosa salmao": "Rosa salmão",
  "rosa salmão": "Rosa salmão",
  // vermelho / bordo
  vermelho: "Vermelho",
  vermelhovaness: "Vermelho",
  bordo: "Bordô",
  bordô: "Bordô",
  vinho: "Vinho",
  // marrom
  marrom: "Marrom",
  marrom1: "Marrom",
  marromvaness: "Marrom",
  chocolate: "Chocolate",
  // neutros
  preto: "Preto",
  branco: "Branco",
  off: "Off-white",
  "off-white": "Off-white",
  "off white": "Off-white",
  bege: "Bege",
  nude: "Nude",
  cinza: "Cinza",
  "cinza claro": "Cinza claro",
  // verde / roxo / laranja
  verde: "Verde",
  "verde militar": "Verde militar",
  "verde siciliano": "Verde siciliano",
  "verde florescente": "Verde fluorescente",
  "verde fluorescente": "Verde fluorescente",
  roxo: "Roxo",
  roxo1: "Roxo",
  "roxo médio": "Roxo médio",
  "roxo medio": "Roxo médio",
  laranja: "Laranja",
  laranjado: "Laranja",
  amarelo: "Amarelo",
};

const HEX: Record<string, string> = {
  Preto: "#111111",
  Branco: "#f5f5f5",
  "Off-white": "#f2eee8",
  Vermelho: "#c62828",
  Bordô: "#7a1218",
  Vinho: "#6b1320",
  Rosa: "#e91e8c",
  "Rosa pink": "#e91e8c",
  "Rosa bebê": "#f8bbd0",
  "Rosa claro": "#f8bbd0",
  "Rosa chiclete": "#ff6eb4",
  "Rosa salmão": "#e8a090",
  Azul: "#3b6ea5",
  "Azul Marinho": "#1a2a4a",
  "Azul bebê": "#a8d4e6",
  "Azul água": "#7ec8e3",
  Marrom: "#6d4c41",
  Chocolate: "#4e342e",
  Cinza: "#9e9e9e",
  "Cinza claro": "#c4c4c4",
  Verde: "#2e7d32",
  "Verde militar": "#4a5d23",
  "Verde siciliano": "#7cb342",
  "Verde fluorescente": "#76ff03",
  Roxo: "#6a1b9a",
  "Roxo médio": "#8e24aa",
  Laranja: "#e07a3d",
  Bege: "#d7ccc8",
  Nude: "#e8c4b0",
  Amarelo: "#f9a825",
};

/** Keywords used to match gallery filenames/alt to a color */
const KEYWORDS: Record<string, string[]> = {
  Preto: ["preto", "black", "noir"],
  Branco: ["branco", "white"],
  "Off-white": ["off", "offwhite"],
  Vermelho: ["vermelho", "red", "vaness"],
  Bordô: ["bordo", "bordô", "wine"],
  Vinho: ["vinho"],
  Rosa: ["rosa", "pink"],
  "Rosa pink": ["pink", "rosa"],
  "Rosa bebê": ["bebe", "bebê", "rosabb", "rosa"],
  "Rosa claro": ["rosa", "claro"],
  "Rosa chiclete": ["ciclete", "chiclete", "rosa"],
  "Rosa salmão": ["salmao", "salmão", "salmon"],
  Azul: ["azul", "blue"],
  "Azul Marinho": ["marinho", "navy"],
  "Azul bebê": ["bebe", "bebê", "baby"],
  "Azul água": ["agua", "água"],
  Marrom: ["marrom", "brown", "vaness"],
  Chocolate: ["chocolate"],
  Cinza: ["cinza", "grey", "gray"],
  "Cinza claro": ["cinza", "claro"],
  Verde: ["verde", "green"],
  "Verde militar": ["militar"],
  "Verde siciliano": ["siciliano"],
  "Verde fluorescente": ["florescente", "fluorescente"],
  Roxo: ["roxo", "purple"],
  "Roxo médio": ["roxo"],
  Laranja: ["laranja", "laranjado", "orange"],
  Bege: ["bege", "beige"],
  Nude: ["nude"],
  Amarelo: ["amarelo", "yellow"],
};

export function normalizeColor(raw: string): string {
  const key = raw.trim().toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  const keyWithAccents = raw.trim().toLowerCase();
  if (ALIASES[keyWithAccents]) return ALIASES[keyWithAccents];
  if (ALIASES[key]) return ALIASES[key];
  // Title-case fallback for unknown but clean names
  if (/^padr[aã]o$/i.test(raw.trim())) return "Padrão";
  return raw.trim().replace(/\s+/g, " ");
}

export function colorToHex(name: string, fallback?: string | null) {
  if (fallback) return fallback;
  const canonical = normalizeColor(name);
  return HEX[canonical] || HEX[name] || "#cccccc";
}

/** Aceita `#rgb`, `#rrggbb` ou `#rrggbb/#rrggbb` (bicolor). */
export function parseSwatchHex(raw?: string | null): {
  primary: string;
  secondary: string | null;
} {
  if (!raw) return { primary: "#cccccc", secondary: null };
  const parts = raw
    .split(/[/|,]/)
    .map((p) => p.trim())
    .filter(Boolean);
  const normalize = (h: string) => {
    let x = h.startsWith("#") ? h : `#${h}`;
    if (/^#[0-9a-fA-F]{3}$/.test(x)) {
      x = `#${x[1]}${x[1]}${x[2]}${x[2]}${x[3]}${x[3]}`;
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(x)) return "#cccccc";
    return x.toLowerCase();
  };
  const primary = normalize(parts[0] || "#cccccc");
  const secondary = parts[1] ? normalize(parts[1]) : null;
  return { primary, secondary };
}

export function formatSwatchHex(primary: string, secondary?: string | null) {
  const a = parseSwatchHex(primary).primary;
  if (!secondary) return a;
  const b = parseSwatchHex(secondary).primary;
  return `${a}/${b}`;
}

/** CSS background para bolinha (sólida ou metade/metade). */
export function swatchBackground(hex?: string | null) {
  const { primary, secondary } = parseSwatchHex(hex);
  if (!secondary || secondary === primary) return primary;
  return `linear-gradient(135deg, ${primary} 50%, ${secondary} 50%)`;
}

export function isLightSwatch(hex?: string | null) {
  const { primary, secondary } = parseSwatchHex(hex);
  const check = (h: string) => {
    const x = h.replace("#", "");
    const r = parseInt(x.slice(0, 2), 16);
    const g = parseInt(x.slice(2, 4), 16);
    const b = parseInt(x.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.82;
  };
  return check(primary) || (secondary ? check(secondary) : false);
}

/** Paleta para o admin escolher a cor da variante */
export const COLOR_PALETTE: { name: string; hex: string }[] = Object.entries(HEX)
  .map(([name, hex]) => ({ name, hex }))
  .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

export function isGenericColor(name: string) {
  const n = normalizeColor(name).toLowerCase();
  return n === "padrão" || n === "padrao" || n === "unica" || n === "único";
}

type Img = { url: string; alt?: string | null; sortOrder?: number };

/**
 * Prefer gallery image whose url/alt mentions the filtered color.
 * Returns null when nothing matches (caller may fall back).
 */
export function pickImageForColor(
  images: Img[],
  color: string | null | undefined
): string | null {
  if (!images.length) return null;
  if (!color) return images[0]?.url || null;

  const canonical = normalizeColor(color);
  const keys = KEYWORDS[canonical] || [
    canonical
      .toLowerCase()
      .normalize("NFD")
      .replace(/\p{M}/gu, ""),
  ];

  let best: Img | null = null;
  let bestScore = -1;

  for (const img of images) {
    const hay = `${img.url} ${img.alt || ""}`.toLowerCase();
    const altExact = (img.alt || "").trim().toLowerCase();
    let score = 0;

    // Exact alt match (vinculado no admin) wins
    if (altExact === canonical.toLowerCase()) {
      score += 1000;
    }

    for (const k of keys) {
      if (k && hay.includes(k)) score += k.length;
    }
    if (score > bestScore) {
      bestScore = score;
      best = img;
    }
  }

  if (bestScore > 0 && best) return best.url;
  return null;
}
