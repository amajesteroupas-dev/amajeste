export type SizeGuideId = string;

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
  /**
   * Quando true, a loja mostra só a foto da tabela (já pronta),
   * sem grade editável nem linhas de medida.
   */
  photoOnly?: boolean;
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

/** Tabelas iniciais (usadas se ainda não houver catálogo salvo no admin). */
export const BUILTIN_SIZE_GUIDES: SizeGuide[] = [MG, PMG, CASACO, TOP];

/** @deprecated use BUILTIN_SIZE_GUIDES / getSizeGuidesCatalog */
export const SIZE_GUIDES: SizeGuide[] = BUILTIN_SIZE_GUIDES;

export function cloneBuiltinSizeGuides(): SizeGuide[] {
  return structuredClone(BUILTIN_SIZE_GUIDES);
}

export function slugifySizeGuideId(raw: string): string {
  return String(raw || "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function uniqueSizeGuideId(
  preferred: string,
  existing: Iterable<string>
): string {
  const used = new Set(
    [...existing].map((id) => String(id).toLowerCase()).filter(Boolean)
  );
  let base = slugifySizeGuideId(preferred) || "tabela";
  if (base === "new") base = "tabela";
  let id = base;
  let n = 2;
  while (used.has(id)) {
    id = `${base}-${n}`.slice(0, 40);
    n += 1;
  }
  return id;
}

function cleanText(value: unknown, max = 120): string {
  return String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

export function sanitizeSizeGuide(
  raw: unknown,
  opts?: { existingIds?: Iterable<string> }
): SizeGuide | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Partial<SizeGuide>;
  const preferred =
    cleanText(g.id, 40) || cleanText(g.adminLabel, 40) || "tabela";
  const finalId = uniqueSizeGuideId(preferred, opts?.existingIds || []);
  const adminLabel =
    cleanText(g.adminLabel, 80) || `Tabela ${finalId.toUpperCase()}`;

  let columns: SizeGuideColumn[] = Array.isArray(g.columns)
    ? g.columns
        .map((c, i) => {
          const label = cleanText(c?.label, 24) || `T${i + 1}`;
          const key =
            slugifySizeGuideId(cleanText(c?.key, 24) || label) || `c${i + 1}`;
          return { key, label };
        })
        .filter((c) => c.key && c.label)
        .slice(0, 8)
    : [];
  if (!columns.length) {
    columns = [
      { key: "p", label: "P" },
      { key: "m", label: "M" },
      { key: "g", label: "G" },
    ];
  }
  const seenKeys = new Set<string>();
  columns = columns.filter((c) => {
    if (seenKeys.has(c.key)) return false;
    seenKeys.add(c.key);
    return true;
  });

  const rows: SizeGuideRow[] = Array.isArray(g.rows)
    ? g.rows
        .map((r) => {
          const label = cleanText(r?.label, 40).toUpperCase();
          if (!label) return null;
          const values: Record<string, string> = {};
          for (const col of columns) {
            values[col.key] = cleanText(
              r?.values?.[col.key] ?? "",
              40
            ).toUpperCase();
          }
          return { label, values };
        })
        .filter((r): r is SizeGuideRow => Boolean(r))
        .slice(0, 12)
    : [];

  if (!rows.length) {
    rows.push({
      label: "BUSTO",
      values: Object.fromEntries(columns.map((c) => [c.key, ""])),
    });
  }

  const markers: SizeGuideMarker[] | undefined = Array.isArray(g.markers)
    ? g.markers
        .map((m) => ({
          label: cleanText(m?.label, 24).toUpperCase(),
          top: cleanText(m?.top, 12) || "40%",
        }))
        .filter((m) => m.label)
        .slice(0, 6)
    : undefined;

  const modelLines = Array.isArray(g.modelLines)
    ? g.modelLines.map((l) => cleanText(l, 120)).filter(Boolean).slice(0, 8)
    : undefined;

  const imageUrl = cleanText(g.imageUrl, 300) || undefined;
  const modelTitle = cleanText(g.modelTitle, 80) || undefined;
  const note = cleanText(g.note, 200) || undefined;
  const photoOnly = Boolean(g.photoOnly);

  return {
    id: finalId,
    adminLabel,
    columns: photoOnly ? [{ key: "foto", label: "FOTO" }] : columns,
    rows: photoOnly
      ? [{ label: "TABELA", values: { foto: "VER FOTO" } }]
      : rows,
    ...(imageUrl ? { imageUrl } : {}),
    ...(photoOnly ? { photoOnly: true } : {}),
    ...(photoOnly
      ? {}
      : markers?.length
        ? { markers }
        : {}),
    ...(modelTitle ? { modelTitle } : {}),
    ...(modelLines?.length ? { modelLines } : {}),
    ...(note ? { note } : {}),
  };
}

export function sanitizeSizeGuidesCatalog(raw: unknown): SizeGuide[] {
  if (!Array.isArray(raw) || !raw.length) return cloneBuiltinSizeGuides();
  const out: SizeGuide[] = [];
  const used = new Set<string>();
  for (const item of raw.slice(0, 30)) {
    const guide = sanitizeSizeGuide(item, { existingIds: used });
    if (!guide) continue;
    used.add(guide.id);
    out.push(guide);
  }
  return out.length ? out : cloneBuiltinSizeGuides();
}

export function findSizeGuide(
  guides: SizeGuide[],
  value: unknown
): SizeGuide {
  const raw = String(value || "").trim().toLowerCase();
  return (
    guides.find((g) => g.id === raw) ||
    guides[0] ||
    MG
  );
}

export function normalizeSizeGuide(
  value: unknown,
  guides?: SizeGuide[] | null
): SizeGuideId {
  const list = guides?.length ? guides : BUILTIN_SIZE_GUIDES;
  const raw = String(value || "").trim().toLowerCase();
  if (list.some((g) => g.id === raw)) return raw;
  return list[0]?.id || "mg";
}

/** Sync fallback (builtins only). Prefer findSizeGuide with catalog. */
export function getSizeGuide(value: unknown): SizeGuide {
  return findSizeGuide(BUILTIN_SIZE_GUIDES, value);
}

export type SizeGuideLabelMap = Record<string, string>;

export function defaultSizeGuideLabels(
  guides: SizeGuide[] = BUILTIN_SIZE_GUIDES
): Record<string, string> {
  return Object.fromEntries(guides.map((g) => [g.id, g.adminLabel]));
}

export function resolveSizeGuideLabel(
  guide: SizeGuide,
  labels?: SizeGuideLabelMap | null
): string {
  const custom = labels?.[guide.id]?.trim();
  return custom || guide.adminLabel;
}

export function emptySizeGuideDraft(existingIds: Iterable<string>): SizeGuide {
  const id = uniqueSizeGuideId("nova-tabela", existingIds);
  return {
    id,
    adminLabel: "Nova tabela de medidas",
    columns: [
      { key: "p", label: "P" },
      { key: "m", label: "M" },
      { key: "g", label: "G" },
    ],
    rows: [
      {
        label: "BUSTO",
        values: { p: "", m: "", g: "" },
      },
      {
        label: "CINTURA",
        values: { p: "", m: "", g: "" },
      },
      {
        label: "QUADRIL",
        values: { p: "", m: "", g: "" },
      },
    ],
    markers: DEFAULT_MARKERS,
    modelTitle: "Referência da modelo",
    modelLines: ["A modelo veste M."],
  };
}

/** Tabela só com foto pronta (sem grade digitável). */
export function emptyPhotoOnlySizeGuideDraft(
  existingIds: Iterable<string>
): SizeGuide {
  const id = uniqueSizeGuideId("tabela-foto", existingIds);
  return {
    id,
    adminLabel: "Tabela em foto",
    columns: [{ key: "foto", label: "FOTO" }],
    rows: [{ label: "TABELA", values: { foto: "VER FOTO" } }],
    photoOnly: true,
    modelTitle: "Referência da modelo",
    modelLines: [],
  };
}
