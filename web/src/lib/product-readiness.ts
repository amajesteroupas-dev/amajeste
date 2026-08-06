import { prisma } from "@/lib/prisma";
import { normalizeColor } from "@/lib/colors";

export type ReadinessIssue = {
  code: string;
  message: string;
  hint: string;
};

export type ProductReadinessInput = {
  price: number | null | undefined;
  categoryId: string | null | undefined;
  weightKg: number | null | undefined;
  lengthCm: number | null | undefined;
  widthCm: number | null | undefined;
  heightCm: number | null | undefined;
  variants: { color: string; active: boolean }[];
  images: { url: string; alt: string | null }[];
};

export type ProductReadinessResult = {
  ok: boolean;
  issues: ReadinessIssue[];
};

/** Placeholder SVG gerado no create — não conta como foto de catálogo. */
export function isPlaceholderImage(url: string): boolean {
  const u = (url || "").trim().toLowerCase();
  return u.includes("/placeholders/") || /^placeholders\//.test(u);
}

export function isRealProductImage(url: string): boolean {
  return Boolean(url?.trim()) && !isPlaceholderImage(url);
}

function positive(n: number | null | undefined): boolean {
  return n != null && Number(n) > 0 && !Number.isNaN(Number(n));
}

/** Avalia se o produto pode ficar ativo na loja (puro, sem I/O). */
export function evaluateProductReadiness(
  input: ProductReadinessInput
): ProductReadinessResult {
  const issues: ReadinessIssue[] = [];

  const price = Number(input.price);
  if (!positive(price)) {
    issues.push({
      code: "price",
      message: "Preço inválido ou zerado.",
      hint: "Informe um preço de venda maior que R$ 0,00 em Dados do produto.",
    });
  }

  if (!String(input.categoryId || "").trim()) {
    issues.push({
      code: "category",
      message: "Categoria obrigatória.",
      hint: "Escolha uma categoria (ou crie uma nova) em Dados do produto.",
    });
  }

  if (
    !positive(input.weightKg) ||
    !positive(input.lengthCm) ||
    !positive(input.widthCm) ||
    !positive(input.heightCm)
  ) {
    issues.push({
      code: "shipping",
      message: "Dimensões de frete incompletas.",
      hint: "Preencha peso (kg) e comprimento × largura × altura (cm) em Frete — valores maiores que zero.",
    });
  }

  const activeVariants = (input.variants || []).filter((v) => v.active !== false);
  if (activeVariants.length === 0) {
    issues.push({
      code: "variants",
      message: "Nenhuma variante ativa.",
      hint: "Cadastre ou reative pelo menos uma opção de tamanho + cor em Variantes.",
    });
  }

  const realImages = (input.images || []).filter((img) =>
    isRealProductImage(img.url)
  );
  if (realImages.length === 0) {
    issues.push({
      code: "photos",
      message: "Falta foto real do produto.",
      hint: "Remova o placeholder e envie ou anexe fotos em Fotos do produto (banco de imagens ou upload).",
    });
  }

  if (activeVariants.length > 0 && realImages.length > 0) {
    const linkedColors = new Set<string>();
    for (const img of realImages) {
      if (!img.alt?.trim()) continue;
      linkedColors.add(normalizeColor(img.alt));
    }

    const missingColors: string[] = [];
    const seen = new Set<string>();
    for (const v of activeVariants) {
      const c = normalizeColor(v.color);
      if (!c || seen.has(c)) continue;
      seen.add(c);
      if (!linkedColors.has(c)) missingColors.push(c);
    }

    if (missingColors.length > 0) {
      issues.push({
        code: "photo_per_color",
        message:
          missingColors.length === 1
            ? `Cor “${missingColors[0]}” sem foto vinculada.`
            : `Cores sem foto: ${missingColors.map((c) => `“${c}”`).join(", ")}.`,
        hint: "Em cada foto, use o seletor “Cor desta foto” para vincular a cor correspondente. Uma foto por cor.",
      });
    }
  }

  return { ok: issues.length === 0, issues };
}

/** Carrega do banco e avalia (opcionalmente com overrides do body do PATCH). */
export async function getProductReadiness(
  productId: string,
  overrides?: Partial<{
    price: number | null;
    categoryId: string | null;
    weightKg: number | null;
    lengthCm: number | null;
    widthCm: number | null;
    heightCm: number | null;
  }>
): Promise<ProductReadinessResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      price: true,
      categoryId: true,
      weightKg: true,
      lengthCm: true,
      widthCm: true,
      heightCm: true,
      variants: { select: { color: true, active: true } },
      images: { select: { url: true, alt: true } },
    },
  });

  if (!product) {
    return {
      ok: false,
      issues: [
        {
          code: "not_found",
          message: "Produto não encontrado.",
          hint: "Recarregue a página e tente de novo.",
        },
      ],
    };
  }

  return evaluateProductReadiness({
    price:
      overrides?.price !== undefined ? overrides.price : Number(product.price),
    categoryId:
      overrides?.categoryId !== undefined
        ? overrides.categoryId
        : product.categoryId,
    weightKg:
      overrides?.weightKg !== undefined ? overrides.weightKg : product.weightKg,
    lengthCm:
      overrides?.lengthCm !== undefined ? overrides.lengthCm : product.lengthCm,
    widthCm:
      overrides?.widthCm !== undefined ? overrides.widthCm : product.widthCm,
    heightCm:
      overrides?.heightCm !== undefined ? overrides.heightCm : product.heightCm,
    variants: product.variants,
    images: product.images,
  });
}

export function readinessErrorPayload(result: ProductReadinessResult) {
  const first = result.issues[0];
  return {
    error:
      first?.message ||
      "Produto incompleto. Corrija os itens abaixo para ativar na loja.",
    issues: result.issues,
  };
}
