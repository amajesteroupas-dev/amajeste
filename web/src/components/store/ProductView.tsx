"use client";

import { useState } from "react";
import { ProductGallery } from "@/components/store/ProductGallery";
import { ProductPurchase } from "@/components/store/ProductPurchase";
import { normalizeColor } from "@/lib/colors";

type Img = { url: string; alt: string | null };
type Variant = {
  id: string;
  size: string;
  color: string;
  colorHex: string | null;
  stock: number;
  price: string | null;
};

type Props = {
  name: string;
  categoryName: string;
  images: Img[];
  initialColor?: string | null;
  product: {
    id: string;
    name: string;
    slug: string;
    description: string;
    price: string;
    compareAt?: string | null;
    images: Img[];
    variants: Variant[];
    installmentsMax?: number;
    interestFree?: boolean;
    pixDiscountPercent?: number;
    showPaymentFlags?: boolean;
    videoUrl?: string | null;
    priceAdjustPercent?: number;
  };
  descriptionBlocks: string[];
  sizeGuideImageUrl?: string | null;
};

const SECTION_HEADING =
  /^(DESCRI[CÇ][AÃ]O(?:\s+COMPLETA)?|CUIDADOS(?:\s+COM\s+(?:A\s+PE[CÇ]A|O\s+PRODUTO))?|COMPOSI[CÇ][AÃ]O)\s*[:：]?\s*/i;

function renderDescriptionBody(body: string) {
  const lines = body.split("\n");
  return (
    <div className="text-sm leading-relaxed text-[#555] space-y-1">
      {lines.map((line, i) => {
        const isAttention = /^\*?\s*ATEN[CÇ][AÃ]O\b/i.test(line.trim());
        if (!line.trim()) {
          return <div key={i} className="h-2" aria-hidden />;
        }
        return (
          <p
            key={i}
            className={isAttention ? "font-bold text-ink" : undefined}
          >
            {line}
          </p>
        );
      })}
    </div>
  );
}

function parseDescriptionBlock(block: string, index: number) {
  const trimmed = block.trim();
  const match = trimmed.match(SECTION_HEADING);
  if (match) {
    return {
      title: match[1].replace(/\s+/g, " ").trim(),
      body: trimmed.slice(match[0].length).replace(/^[:：]\s*/, "").trim(),
    };
  }
  return {
    title: index === 0 ? "Descrição" : null,
    body: trimmed.replace(/^[:：]\s*/, ""),
  };
}

export function ProductView({
  name,
  categoryName,
  images,
  initialColor,
  product,
  descriptionBlocks,
  sizeGuideImageUrl,
}: Props) {
  const preferred = initialColor ? normalizeColor(initialColor) : null;
  const firstInStock = product.variants.find((v) => v.stock > 0);
  const firstColor =
    preferred ||
    (firstInStock
      ? normalizeColor(firstInStock.color)
      : product.variants[0]
        ? normalizeColor(product.variants[0].color)
        : "");
  const [color, setColor] = useState(firstColor);

  const sections = descriptionBlocks
    .map((block, i) => parseDescriptionBlock(block, i))
    .filter((s) => s.body || s.title);

  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      <ProductGallery
        images={images}
        name={name}
        selectedColor={color}
        productId={product.id}
        videoUrl={product.videoUrl}
      />

      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted mb-1.5">
          {categoryName}
        </p>
        <h1
          className="text-3xl md:text-4xl mb-3 leading-tight"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {name}
        </h1>

        <ProductPurchase
          product={product}
          selectedColor={color}
          onColorChange={setColor}
          sizeGuideImageUrl={sizeGuideImageUrl}
        />

        {sections.length > 0 ? (
          <div className="mt-8 border-t border-line pt-6 space-y-5">
            {sections.map((section, i) => (
              <div key={i}>
                {section.title ? (
                  <h2 className="text-[10px] uppercase tracking-[0.16em] text-ink mb-2">
                    {section.title}
                  </h2>
                ) : null}
                {section.body ? renderDescriptionBody(section.body) : null}
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
