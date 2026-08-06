import type { Metadata } from "next";
import Link from "next/link";
import { PaymentFlagsRow } from "@/components/store/PaymentFlags";
import { siteContact, whatsappUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Meios de pagamento",
  description:
    "Como funcionam Pix, cartão e parcelamento na Majesté. Pagamentos processados com segurança.",
  robots: { index: false, follow: true },
};

export default function MeiosDePagamentoPage() {
  return (
    <div className="bg-[#f7f3ee]">
      <div className="container-maj py-12 md:py-16 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          Checkout · Segurança
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#2a2420]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Meios de pagamento
        </h1>
        <p className="mt-4 text-[#5c534c] leading-relaxed">
          Na Majesté você paga com Pix ou cartão de crédito. O valor e as
          condições aparecem no produto e são confirmados no checkout.
        </p>

        <div className="mt-8 border border-[#e0d6ca] bg-white px-4 py-4">
          <p className="text-xs uppercase tracking-[0.14em] text-[#95752c] mb-3">
            Bandeiras e Pix
          </p>
          <PaymentFlagsRow variant="main" showPix />
        </div>

        <div className="mt-10 space-y-8 text-sm text-[#3a322c] leading-relaxed">
          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Pix
            </h2>
            <p>
              Pagamento à vista, com aprovação rápida. Quando houver desconto no
              Pix ou promoção no site, o valor já aparece destacado na página do
              produto e no carrinho.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Cartão de crédito
            </h2>
            <p>
              Aceitamos as principais bandeiras. Em produtos com parcelamento
              liberado, você pode parcelar conforme a condição indicada (ex.:
              2x sem juros). O número de parcelas e o valor de cada parcela
              aparecem no checkout antes de finalizar.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Promoções e descontos
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                O preço riscado e o percentual (−%) no produto mostram o
                desconto da promoção ativa.
              </li>
              <li>
                Desconto de Pix e promoção do site não se acumulam de forma
                automática — vale a condição destacada na página do produto.
              </li>
              <li>
                Cupons, quando disponíveis, são aplicados no checkout.
              </li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Segurança
            </h2>
            <p>
              Os dados do cartão e do Pix são processados pelos parceiros de
              pagamento da loja. A Majesté não armazena o número completo do
              cartão. Em caso de dúvida sobre cobrança ou status do pedido,
              fale conosco.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Precisa de ajuda?
            </h2>
            <p>
              WhatsApp:{" "}
              <a
                className="underline text-[#95752c]"
                href={whatsappUrl(
                  "Olá! Tenho uma dúvida sobre meios de pagamento."
                )}
                target="_blank"
                rel="noopener noreferrer"
              >
                {siteContact.phoneDisplay}
              </a>
              {" · "}
              E-mail:{" "}
              <a
                className="underline text-[#95752c]"
                href={`mailto:${siteContact.email}`}
              >
                {siteContact.email}
              </a>
              {" · "}
              <Link href="/contato" className="underline text-[#95752c]">
                Página de contato
              </Link>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
