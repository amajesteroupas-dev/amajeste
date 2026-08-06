import { absoluteMediaUrl, siteBaseUrl } from "@/lib/catalog-api";
import { siteContact } from "@/lib/site";

const GRAPH_VERSION = "v21.0";
const BATCH_SIZE = 50;

export type WhatsAppCatalogConfig = {
  accessToken: string;
  catalogId: string;
};

export type CatalogSyncItem = {
  retailerId: string;
  title: string;
  description: string;
  price: number;
  link: string;
  imageLink: string;
  availability: "in stock" | "out of stock";
  brand: string;
};

export type CatalogSyncResult = {
  ok: boolean;
  synced: number;
  skipped: number;
  batches: number;
  errors: string[];
  handle?: string;
};

type ProductForSync = {
  id: string;
  name: string;
  slug: string;
  description: string;
  price: { toString(): string } | number;
  active: boolean;
  images: Array<{ url: string; isPrimary: boolean; sortOrder: number }>;
  variants: Array<{
    sku: string;
    size: string;
    color: string;
    stock: number;
    active: boolean;
    price: { toString(): string } | number | null;
  }>;
};

export function getWhatsAppCatalogConfig(): WhatsAppCatalogConfig | null {
  const accessToken =
    process.env.META_CATALOG_ACCESS_TOKEN?.trim() ||
    process.env.WHATSAPP_CATALOG_ACCESS_TOKEN?.trim() ||
    process.env.INSTAGRAM_ACCESS_TOKEN?.trim() ||
    "";
  const catalogId =
    process.env.META_CATALOG_ID?.trim() ||
    process.env.WHATSAPP_CATALOG_ID?.trim() ||
    "";
  if (!accessToken || !catalogId) return null;
  return { accessToken, catalogId };
}

function money(value: { toString(): string } | number | null | undefined) {
  if (value == null) return 0;
  return Number(typeof value === "object" ? value.toString() : value);
}

function plainText(htmlOrText: string, max = 5000) {
  const text = htmlOrText
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.slice(0, max) || "Produto Majesté";
}

function primaryImageUrl(images: ProductForSync["images"]) {
  const ordered = [...images].sort((a, b) => {
    if (a.isPrimary !== b.isPrimary) return a.isPrimary ? -1 : 1;
    return a.sortOrder - b.sortOrder;
  });
  return absoluteMediaUrl(ordered[0]?.url);
}

/** Monta itens do catálogo Meta (1 por variante ativa; senão 1 pelo produto). */
export function buildCatalogItems(products: ProductForSync[]): {
  items: CatalogSyncItem[];
  skipped: number;
} {
  const brand = siteContact.brand;
  const base = siteBaseUrl();
  const items: CatalogSyncItem[] = [];
  let skipped = 0;

  for (const product of products) {
    if (!product.active) {
      skipped += 1;
      continue;
    }

    const imageLink = primaryImageUrl(product.images);
    if (!imageLink) {
      skipped += 1;
      continue;
    }

    const link = `${base}/produto/${product.slug}`;
    const description = plainText(product.description);
    const activeVariants = product.variants.filter((v) => v.active);

    if (activeVariants.length === 0) {
      items.push({
        retailerId: product.id,
        title: product.name.slice(0, 200),
        description,
        price: money(product.price),
        link,
        imageLink,
        availability: "out of stock",
        brand,
      });
      continue;
    }

    for (const variant of activeVariants) {
      const titleParts = [product.name];
      if (variant.size) titleParts.push(variant.size);
      if (variant.color) titleParts.push(variant.color);
      items.push({
        retailerId: variant.sku,
        title: titleParts.join(" · ").slice(0, 200),
        description,
        price: money(variant.price ?? product.price),
        link,
        imageLink,
        availability: variant.stock > 0 ? "in stock" : "out of stock",
        brand,
      });
    }
  }

  return { items, skipped };
}

function toBatchRequest(item: CatalogSyncItem) {
  return {
    method: "UPDATE",
    data: {
      id: item.retailerId,
      title: item.title,
      description: item.description,
      availability: item.availability,
      condition: "new",
      price: `${item.price.toFixed(2)} BRL`,
      link: item.link,
      image_link: item.imageLink,
      brand: item.brand,
    },
  };
}

async function postItemsBatch(
  config: WhatsAppCatalogConfig,
  requests: ReturnType<typeof toBatchRequest>[]
): Promise<{ ok: boolean; error?: string; handle?: string }> {
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${config.catalogId}/items_batch`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      item_type: "PRODUCT_ITEM",
      allow_upsert: true,
      access_token: config.accessToken,
      requests,
    }),
    next: { revalidate: 0 },
  });

  const json = (await res.json()) as {
    handles?: string[];
    handle?: string;
    error?: { message?: string; error_user_msg?: string };
  };

  if (!res.ok || json.error) {
    return {
      ok: false,
      error:
        json.error?.error_user_msg ||
        json.error?.message ||
        "Falha ao enviar lote para o catálogo Meta",
    };
  }

  return {
    ok: true,
    handle: json.handle || json.handles?.[0],
  };
}

/** Envia itens ao Commerce Manager (catálogo usado pelo WhatsApp Business). */
export async function syncCatalogItems(
  config: WhatsAppCatalogConfig,
  items: CatalogSyncItem[]
): Promise<CatalogSyncResult> {
  const errors: string[] = [];
  let synced = 0;
  let batches = 0;
  let lastHandle: string | undefined;

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const chunk = items.slice(i, i + BATCH_SIZE);
    batches += 1;
    const result = await postItemsBatch(
      config,
      chunk.map(toBatchRequest)
    );
    if (!result.ok) {
      errors.push(result.error || `Erro no lote ${batches}`);
      break;
    }
    synced += chunk.length;
    lastHandle = result.handle || lastHandle;
  }

  return {
    ok: errors.length === 0,
    synced,
    skipped: 0,
    batches,
    errors,
    handle: lastHandle,
  };
}
