import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMelhorEnvioConfig } from "@/lib/melhor-envio-settings";
import {
  DEFAULT_SHIPPING_DIMS,
  quoteShipping,
  type ShippingProductInput,
} from "@/lib/shipping";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const toZip = String(body.toZip || "").replace(/\D/g, "");
    if (toZip.length < 8) {
      return NextResponse.json({ error: "CEP inválido" }, { status: 400 });
    }

    const items = Array.isArray(body.items)
      ? (body.items as { variantId?: string; quantity?: number }[])
      : [];

    let products: ShippingProductInput[] = [];

    if (items.length > 0) {
      const variantIds = [
        ...new Set(
          items.map((i) => String(i.variantId || "")).filter(Boolean)
        ),
      ];
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: {
          id: true,
          product: {
            select: {
              id: true,
              price: true,
              weightKg: true,
              lengthCm: true,
              widthCm: true,
              heightCm: true,
            },
          },
        },
      });
      const byId = new Map(variants.map((v) => [v.id, v]));

      for (const item of items) {
        const v = byId.get(String(item.variantId || ""));
        if (!v) continue;
        const qty = Math.max(1, Number(item.quantity) || 1);
        const p = v.product;
        products.push({
          id: p.id,
          weightKg:
            p.weightKg && p.weightKg > 0
              ? p.weightKg
              : DEFAULT_SHIPPING_DIMS.weightKg,
          lengthCm:
            p.lengthCm && p.lengthCm > 0
              ? p.lengthCm
              : DEFAULT_SHIPPING_DIMS.lengthCm,
          widthCm:
            p.widthCm && p.widthCm > 0
              ? p.widthCm
              : DEFAULT_SHIPPING_DIMS.widthCm,
          heightCm:
            p.heightCm && p.heightCm > 0
              ? p.heightCm
              : DEFAULT_SHIPPING_DIMS.heightCm,
          insuranceValue: Number(p.price) || 0,
          quantity: qty,
        });
      }
    }

    if (products.length === 0) {
      products = [
        {
          id: "1",
          weightKg: Number(body.weightKg) || DEFAULT_SHIPPING_DIMS.weightKg,
          lengthCm: Number(body.lengthCm) || DEFAULT_SHIPPING_DIMS.lengthCm,
          widthCm: Number(body.widthCm) || DEFAULT_SHIPPING_DIMS.widthCm,
          heightCm: Number(body.heightCm) || DEFAULT_SHIPPING_DIMS.heightCm,
          insuranceValue: Number(body.insuranceValue) || 0,
          quantity: 1,
        },
      ];
    }

    const cfg = await getMelhorEnvioConfig();
    const quotes = await quoteShipping({
      fromZip: cfg.storeZip,
      toZip,
      products,
    });

    return NextResponse.json({
      quotes,
      mock: !cfg.token,
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Falha ao cotar frete" }, { status: 500 });
  }
}
