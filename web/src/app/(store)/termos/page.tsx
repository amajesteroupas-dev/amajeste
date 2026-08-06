import Link from "next/link";
import { siteContact, whatsappUrl } from "@/lib/site";

export const metadata = {
  title: "Termos de Uso",
  description: "Condições de uso da loja online Majesté.",
};

export default function TermosPage() {
  return (
    <div className="bg-[#f7f3ee]">
      <div className="container-maj py-12 md:py-16 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          Legal
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#2a2420]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Termos de Uso
        </h1>
        <p className="mt-4 text-[#5c534c] leading-relaxed">
          Ao navegar e comprar na Majesté, você concorda com estes termos.
        </p>

        <div className="mt-10 space-y-8 text-sm text-[#3a322c] leading-relaxed">
          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              1. Objeto
            </h2>
            <p>
              A loja oferece produtos de vestuário fitness para venda online,
              com pagamento e entrega conforme opções disponíveis no checkout.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              2. Cadastro e pedidos
            </h2>
            <p>
              Você se compromete a informar dados verdadeiros. Pedidos estão
              sujeitos à confirmação de pagamento e disponibilidade de estoque.
              Preços e promoções podem mudar sem aviso prévio, respeitando o
              valor vigente no momento da compra confirmada.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              3. Pagamentos
            </h2>
            <p>
              Pagamentos são processados por parceiros (ex.: Mercado Pago). A
              Majesté não armazena o número completo do cartão. A aprovação
              depende da operadora/gateway.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              4. Entrega e trocas
            </h2>
            <p>
              Prazos de frete são estimativas. Consulte a{" "}
              <Link href="/politicas-de-troca" className="underline text-[#95752c]">
                Política de Trocas
              </Link>
              . Entrega local segue combinação via WhatsApp.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              5. Conduta
            </h2>
            <p>
              É proibido usar o site para fraude, abuso de APIs, scraping
              agressivo ou qualquer ato ilícito. Podemos cancelar pedidos
              suspeitos e restringir acessos.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              6. Contato
            </h2>
            <p>
              Dúvidas:{" "}
              <a className="underline text-[#95752c]" href={`mailto:${siteContact.email}`}>
                {siteContact.email}
              </a>{" "}
              ou{" "}
              <a
                className="underline text-[#95752c]"
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
              >
                WhatsApp
              </a>
              .
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
