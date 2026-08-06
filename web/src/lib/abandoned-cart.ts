import { prisma } from "@/lib/prisma";
import { isMailConfigured, sendMarketingEmail } from "@/lib/mail";
import { formatBRL } from "@/lib/utils";
import { whatsappUrl } from "@/lib/site";

export type AbandonedCartItem = {
  variantId: string;
  productId: string;
  productName: string;
  slug: string;
  size: string;
  color: string;
  price: number;
  imageUrl: string;
  quantity: number;
};

const ABANDON_MINUTES = 60;

export async function upsertAbandonedCart(input: {
  sessionId: string;
  email?: string | null;
  phone?: string | null;
  items: AbandonedCartItem[];
}) {
  const sessionId = String(input.sessionId || "")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 64);
  if (!sessionId) return { ok: false as const, reason: "session" };

  const items = Array.isArray(input.items) ? input.items.slice(0, 40) : [];
  const itemCount = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  const subtotal = items.reduce(
    (s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
    0
  );

  if (itemCount <= 0) {
    await prisma.abandonedCart.updateMany({
      where: { sessionId, status: "open" },
      data: { status: "closed", itemCount: 0, subtotal: 0, itemsJson: "[]" },
    });
    return { ok: true as const, closed: true };
  }

  const email = input.email
    ? String(input.email).trim().toLowerCase().slice(0, 180)
    : null;
  const phone = input.phone
    ? String(input.phone).replace(/\D/g, "").slice(0, 20)
    : null;

  await prisma.abandonedCart.upsert({
    where: { sessionId },
    create: {
      sessionId,
      email: email || null,
      phone: phone || null,
      itemsJson: JSON.stringify(items),
      itemCount,
      subtotal,
      status: "open",
      lastSeenAt: new Date(),
    },
    update: {
      email: email || undefined,
      phone: phone || undefined,
      itemsJson: JSON.stringify(items),
      itemCount,
      subtotal,
      status: "open",
      lastSeenAt: new Date(),
      recoveredAt: null,
    },
  });

  return { ok: true as const };
}

export async function markCartRecovered(sessionId: string) {
  const sid = String(sessionId || "").slice(0, 64);
  if (!sid) return;
  await prisma.abandonedCart.updateMany({
    where: { sessionId: sid, status: { in: ["open", "reminded"] } },
    data: { status: "recovered", recoveredAt: new Date() },
  });
}

export async function processAbandonedCartReminders(limit = 30) {
  const cutoff = new Date(Date.now() - ABANDON_MINUTES * 60 * 1000);
  const carts = await prisma.abandonedCart.findMany({
    where: {
      status: "open",
      lastSeenAt: { lte: cutoff },
      OR: [{ email: { not: null } }, { phone: { not: null } }],
    },
    orderBy: { lastSeenAt: "asc" },
    take: limit,
  });

  const site = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://amajeste.com.br"
  ).replace(/\/$/, "");
  let emailed = 0;
  const results: { id: string; ok: boolean; channel?: string; error?: string }[] =
    [];

  for (const cart of carts) {
    let items: AbandonedCartItem[] = [];
    try {
      items = JSON.parse(cart.itemsJson) as AbandonedCartItem[];
    } catch {
      items = [];
    }
    const names = items
      .slice(0, 3)
      .map((i) => i.productName)
      .join(", ");
    const checkoutUrl = `${site}/carrinho?utm_source=abandoned&utm_medium=email&utm_campaign=carrinho`;
    const waText = `Oi! Vi que você deixou ${names || "itens"} no carrinho da Majesté (${formatBRL(Number(cart.subtotal))}). Quer finalizar? ${checkoutUrl}`;

    try {
      if (cart.email && isMailConfigured()) {
        await sendMarketingEmail({
          to: cart.email,
          subject: "Seu carrinho Majesté ainda está te esperando",
          html: `
            <div style="font-family:Georgia,serif;color:#2a2420;max-width:560px;margin:0 auto">
              <h1 style="font-size:22px">Você esqueceu algo?</h1>
              <p>Seu carrinho com <strong>${names || "peças Majesté"}</strong> (${formatBRL(Number(cart.subtotal))}) ainda está reservado por pouco tempo.</p>
              <p><a href="${checkoutUrl}" style="display:inline-block;background:#2a2420;color:#fff;padding:12px 18px;text-decoration:none">Voltar ao carrinho</a></p>
              <p style="font-size:12px;color:#8a7468">Se já comprou, ignore este e-mail.</p>
            </div>
          `,
        });
        emailed += 1;
        results.push({ id: cart.id, ok: true, channel: "email" });
      } else if (cart.phone) {
        // Sem SMTP: marca como reminded e devolve link WhatsApp para o admin
        results.push({
          id: cart.id,
          ok: true,
          channel: "whatsapp_pending",
          error: whatsappUrl(waText),
        });
      } else {
        results.push({ id: cart.id, ok: false, error: "sem contato" });
        continue;
      }

      await prisma.abandonedCart.update({
        where: { id: cart.id },
        data: { status: "reminded", remindedAt: new Date() },
      });
    } catch (e) {
      results.push({
        id: cart.id,
        ok: false,
        error: e instanceof Error ? e.message : "erro",
      });
    }
  }

  return {
    scanned: carts.length,
    emailed,
    results,
    abandonMinutes: ABANDON_MINUTES,
  };
}
