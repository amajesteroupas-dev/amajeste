import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Galeria Majesté",
  description:
    "Galeria de looks reais das clientes e creators Majesté — estilo, influência e comunidade.",
};

export default async function PublicLooksPage() {
  const session = await auth();
  const isCustomer =
    session?.user &&
    (session.user as { role?: string }).role === "CUSTOMER";

  const looks = await prisma.lookPost.findMany({
    where: { status: "APPROVED" },
    orderBy: { createdAt: "desc" },
    take: 60,
    include: { customer: { select: { name: true } } },
  });

  return (
    <div className="relative min-h-[70vh] overflow-hidden bg-[#f4efe9]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 10% 0%, rgba(196,122,126,0.18) 0%, transparent 50%), linear-gradient(180deg, #faf6f1 0%, #f4efe9 100%)",
        }}
      />

      <div className="container-maj relative py-12 md:py-16">
        <header className="max-w-2xl mb-10 md:mb-14">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#8a7468] mb-2">
            Comunidade · Influence Majesté
          </p>
          <h1
            className="text-4xl md:text-5xl text-[#2a2420] mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Galeria Majesté
          </h1>
          <p className="text-sm md:text-base text-[#5c534c] leading-relaxed mb-6">
            Looks reais de quem veste a marca. Quer aparecer aqui e ganhar cupom?
            Entre no programa Seja Influence Majesté.
          </p>
          <div className="flex flex-wrap gap-3">
            {isCustomer ? (
              <Link href="/academia/galeria" className="btn btn-primary !py-2.5">
                Seja Influence — publicar look
              </Link>
            ) : (
              <Link
                href="/entrar?callbackUrl=/academia/galeria"
                className="btn btn-primary !py-2.5"
              >
                Entrar e ser Influence
              </Link>
            )}
            <Link href="/" className="btn btn-outline !py-2.5">
              Ver loja
            </Link>
          </div>
        </header>

        {looks.length === 0 ? (
          <div className="border border-dashed border-[#2a2420]/15 bg-white/70 px-6 py-14 text-center">
            <p className="text-sm text-[#5c534c] mb-4">
              Em breve os primeiros looks aprovados aparecem aqui.
            </p>
            <Link
              href={
                isCustomer
                  ? "/academia/galeria"
                  : "/entrar?callbackUrl=/academia/galeria"
              }
              className="text-sm text-[#a85f64] underline underline-offset-2"
            >
              Seja a primeira a publicar
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5">
            {looks.map((l) => {
              const first = l.customer.name.split(" ")[0] || "Cliente";
              return (
                <article
                  key={l.id}
                  className="group border border-[#2a2420]/08 bg-white overflow-hidden"
                >
                  <div className="relative aspect-[3/4] bg-[#ece6df] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={l.imageUrl}
                      alt={l.caption || `Look de ${first}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </div>
                  <div className="p-3.5">
                    <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a7468]">
                      {first}
                      {l.productName ? ` · ${l.productName}` : ""}
                    </p>
                    {l.caption ? (
                      <p className="text-sm text-[#5c534c] mt-1.5 line-clamp-2">
                        {l.caption}
                      </p>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
