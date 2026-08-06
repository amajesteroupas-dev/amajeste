import { prisma } from "@/lib/prisma";

export type MarketingContact = {
  email: string;
  name: string | null;
  sources: ("newsletter" | "cadastro")[];
};

/** Lista unificada de e-mails (newsletter + cadastros), sem duplicata. */
export async function getUnifiedMarketingContacts(): Promise<
  MarketingContact[]
> {
  const [subscribers, customers] = await Promise.all([
    prisma.newsletterSubscriber.findMany({
      where: { active: true },
      select: { email: true, name: true },
    }),
    prisma.customer.findMany({
      select: { email: true, name: true },
    }),
  ]);

  const map = new Map<string, MarketingContact>();

  for (const s of subscribers) {
    const email = s.email.trim().toLowerCase();
    if (!email) continue;
    map.set(email, {
      email,
      name: s.name,
      sources: ["newsletter"],
    });
  }

  for (const c of customers) {
    const email = c.email.trim().toLowerCase();
    if (!email) continue;
    const existing = map.get(email);
    if (existing) {
      if (!existing.sources.includes("cadastro")) {
        existing.sources.push("cadastro");
      }
      if (!existing.name && c.name) existing.name = c.name;
    } else {
      map.set(email, {
        email,
        name: c.name,
        sources: ["cadastro"],
      });
    }
  }

  return [...map.values()].sort((a, b) => a.email.localeCompare(b.email));
}
