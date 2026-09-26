export type SizeGuideId = "mg" | "pmg";

export type SizeGuideColumn = {
  key: string;
  label: string;
};

export type SizeGuideRow = {
  label: string;
  values: Record<string, string>;
};

export type SizeGuide = {
  id: SizeGuideId;
  adminLabel: string;
  columns: SizeGuideColumn[];
  rows: SizeGuideRow[];
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
};

export const SIZE_GUIDES: SizeGuide[] = [MG, PMG];

export function normalizeSizeGuide(value: unknown): SizeGuideId {
  return value === "pmg" ? "pmg" : "mg";
}

export function getSizeGuide(value: unknown): SizeGuide {
  const id = normalizeSizeGuide(value);
  return SIZE_GUIDES.find((g) => g.id === id) || MG;
}
