export type SizeGuideId = "mg" | "pmg" | "casaco" | "top";

export type SizeGuideColumn = {
  key: string;
  label: string;
};

export type SizeGuideRow = {
  label: string;
  values: Record<string, string>;
};

export type SizeGuideMarker = {
  label: string;
  top: string;
};

export type SizeGuide = {
  id: SizeGuideId;
  adminLabel: string;
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
  /** Foto própria da guia (senão usa a foto global da loja). */
  imageUrl?: string;
  markers?: SizeGuideMarker[];
  modelTitle?: string;
  modelLines?: string[];
  note?: string;
};

const DEFAULT_MARKERS: SizeGuideMarker[] = [
  { label: "BUSTO", top: "29%" },
  { label: "CINTURA", top: "41%" },
  { label: "QUADRIL", top: "51%" },
];

const DEFAULT_MODEL = {
  modelTitle: "Referência da modelo",
  modelLines: [
    "A modelo veste 36/38.",
    "Medidas aproximadas:",
    "Busto 88 cm",
    "Cintura 73 cm",
    "Quadril 96 cm",
  ],
};

const MG: SizeGuide = {
  id: "mg",
  adminLabel: "Tabela atual — M e G",
  columns: [
    { key: "m", label: "M" },
    { key: "g", label: "G" },
  ],
  rows: [
    { label: "VESTE", values: { m: "36 - 38", g: "40 - 42" } },
    { label: "BUSTO", values: { m: "80 - 100 CM", g: "101 - 112 CM" } },
    { label: "CINTURA", values: { m: "68 - 80 CM", g: "81 - 94 CM" } },
    { label: "QUADRIL", values: { m: "90 - 105 CM", g: "105 - 122 CM" } },
  ],
  markers: DEFAULT_MARKERS,
  ...DEFAULT_MODEL,
};

const PMG: SizeGuide = {
  id: "pmg",
  adminLabel: "Novo fornecedor — P, M e G",
  columns: [
    { key: "p", label: "P" },
    { key: "m", label: "M" },
    { key: "g", label: "G" },
  ],
  rows: [
    {
      label: "VESTE",
      values: { p: "36 - 38", m: "40 - 42", g: "42 - 44" },
    },
    {
      label: "BUSTO",
      values: { p: "80 - 100 CM", m: "101 - 112 CM", g: "108 - 120 CM" },
    },
    {
      label: "CINTURA",
      values: { p: "68 - 80 CM", m: "81 - 94 CM", g: "88 - 99 CM" },
    },
    {
      label: "QUADRIL",
      values: { p: "90 - 105 CM", m: "105 - 122 CM", g: "106 - 126 CM" },
    },
  ],
  markers: DEFAULT_MARKERS,
  ...DEFAULT_MODEL,
};

const CASACO: SizeGuide = {
  id: "casaco",
  adminLabel: "Casaco — P, M e G (com comprimento)",
  columns: [
    { key: "p", label: "P" },
    { key: "m", label: "M" },
    { key: "g", label: "G" },
  ],
  rows: [
    {
      label: "VESTE",
      values: { p: "36", m: "38 / 40", g: "42 / 44" },
    },
    {
      label: "BUSTO",
      values: { p: "84 – 88 CM", m: "88 – 94 CM", g: "94 – 100 CM" },
    },
    {
      label: "CINTURA",
      values: { p: "68 – 72 CM", m: "72 – 78 CM", g: "78 – 84 CM" },
    },
    {
      label: "QUADRIL",
      values: { p: "58 CM", m: "60 CM", g: "62 CM" },
    },
    {
      label: "COMPRIMENTO",
      values: { p: "60 CM", m: "61 CM", g: "62 CM" },
    },
  ],
  imageUrl: "/brand/size-guide-casaco.png",
  markers: [
    { label: "BUSTO", top: "34%" },
    { label: "CINTURA", top: "48%" },
    { label: "COMPRIMENTO", top: "72%" },
  ],
  modelTitle: "Referência da modelo",
  modelLines: [
    "A modelo veste P e M.",
    "Altura 1,59 m · 62 kg.",
  ],
  note: "Tecido com elastano e modelagem acinturada.",
};

const TOP: SizeGuide = {
  id: "top",
  adminLabel: "Top — P, M e G (busto, manga, comprimento)",
  columns: [
    { key: "p", label: "P" },
    { key: "m", label: "M" },
    { key: "g", label: "G" },
  ],
  rows: [
    {
      label: "BUSTO",
      values: { p: "81 CM", m: "88 CM", g: "93 CM" },
    },
    {
      label: "MANGA",
      values: { p: "19 CM", m: "20 CM", g: "21 CM" },
    },
    {
      label: "COMPRIMENTO",
      values: { p: "54 CM", m: "56 CM", g: "57 CM" },
    },
  ],
  imageUrl: "/brand/size-guide-top.png",
  markers: [
    { label: "MANGA", top: "22%" },
    { label: "BUSTO", top: "42%" },
    { label: "COMPRIMENTO", top: "78%" },
  ],
  modelTitle: "Referência da modelo",
  modelLines: ["A modelo veste M."],
  note: "Tamanho único, veste do P ao G.",
};

export const SIZE_GUIDES: SizeGuide[] = [MG, PMG, CASACO, TOP];

const SIZE_GUIDE_IDS = new Set<string>(SIZE_GUIDES.map((g) => g.id));

export function normalizeSizeGuide(value: unknown): SizeGuideId {
  const raw = String(value || "").trim().toLowerCase();
  if (SIZE_GUIDE_IDS.has(raw)) return raw as SizeGuideId;
  return "mg";
}

export function getSizeGuide(value: unknown): SizeGuide {
  const id = normalizeSizeGuide(value);
  return SIZE_GUIDES.find((g) => g.id === id) || MG;
}

export type SizeGuideLabelMap = Partial<Record<SizeGuideId, string>>;

export function defaultSizeGuideLabels(): Record<SizeGuideId, string> {
  return Object.fromEntries(
    SIZE_GUIDES.map((g) => [g.id, g.adminLabel])
  ) as Record<SizeGuideId, string>;
}

export function resolveSizeGuideLabel(
  guide: SizeGuide,
  labels?: SizeGuideLabelMap | null
): string {
  const custom = labels?.[guide.id]?.trim();
  return custom || guide.adminLabel;
}
