export const colors = {
  bg: "#f4efe8",
  surface: "#ffffff",
  ink: "#2a2420",
  muted: "#8a827a",
  line: "rgba(0,0,0,0.1)",
  rose: "#a85f64",
  roseSoft: "#faf3f3",
  gold: "#c2a45b",
  success: "#3d6b45",
};

export function formatBRL(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(n) ? n : 0);
}
