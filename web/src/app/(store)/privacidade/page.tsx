import Link from "next/link";
import { siteContact, whatsappUrl } from "@/lib/site";

export const metadata = {
  title: "Política de Privacidade (LGPD)",
  description:
    "Como a Majesté trata dados pessoais em conformidade com a Lei Geral de Proteção de Dados.",
};

export default function PrivacidadePage() {
  return (
    <div className="bg-[#f7f3ee]">
      <div className="container-maj py-12 md:py-16 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          LGPD · Segurança
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#2a2420]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Política de Privacidade
        </h1>
        <p className="mt-4 text-[#5c534c] leading-relaxed">
          A Majesté respeita a sua privacidade. Este aviso explica quais dados
          coletamos, para que usamos e como você pode exercer seus direitos
          previstos na Lei nº 13.709/2018 (LGPD).
        </p>

        <div className="mt-10 space-y-8 text-sm text-[#3a322c] leading-relaxed">
          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              1. Quem somos
            </h2>
            <p>
              Controladora dos dados: Majesté (loja online). Contato:{" "}
              <a
                className="underline text-[#95752c]"
                href={`mailto:${siteContact.email}`}
              >
                {siteContact.email}
              </a>{" "}
              · WhatsApp:{" "}
              <a
                className="underline text-[#95752c]"
                href={whatsappUrl("Olá! Quero falar sobre privacidade / LGPD.")}
                target="_blank"
                rel="noopener noreferrer"
              >
                {siteContact.phoneDisplay}
              </a>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              2. Quais dados coletamos
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Identificação: nome, e-mail, telefone, CPF (quando necessário ao pagamento/entrega).</li>
              <li>Endereço de entrega e dados de frete.</li>
              <li>Dados do pedido, pagamento (status/método via parceiros) e rastreio.</li>
              <li>Conta: senha criptografada, favoritos, histórico.</li>
              <li>Comunicações: newsletter, WhatsApp e avisos de estoque (se você solicitar).</li>
              <li>Dados técnicos básicos de navegação (cookies essenciais ao carrinho e login).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              3. Para que usamos
            </h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Processar pedidos, pagamentos e entregas.</li>
              <li>Prevenir fraudes e cumprir obrigações legais/fiscais.</li>
              <li>Atendimento, trocas e suporte.</li>
              <li>Melhorar a experiência da loja (com base no legítimo interesse, quando aplicável).</li>
              <li>Envio de novidades apenas com o seu consentimento (newsletter).</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              4. Com quem compartilhamos
            </h2>
            <p>
              Operadores necessários à compra: processadores de pagamento
              (ex.: Mercado Pago), serviços de frete (ex.: Melhor Envio /
              Correios), hospedagem e ferramentas técnicas. Não vendemos seus
              dados.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              5. Seus direitos (LGPD)
            </h2>
            <p>
              Você pode solicitar confirmação de tratamento, acesso, correção,
              anonimização, portabilidade, eliminação (quando cabível),
              informação sobre compartilhamentos e revogação de consentimento.
              Peça pelo e-mail ou WhatsApp acima. Responderemos no prazo legal.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              6. Segurança
            </h2>
            <p>
              Usamos conexão HTTPS, senhas com hash, acesso restrito ao painel
              administrativo e processamento de cartão via token do gateway
              (sem armazenar número completo do cartão em nossos servidores).
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              7. Cookies
            </h2>
            <p>
              Utilizamos cookies essenciais para carrinho, sessão e segurança.
              Veja também nossa{" "}
              <Link href="/cookies" className="underline text-[#95752c]">
                Política de Cookies
              </Link>
              .
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              8. Atualizações
            </h2>
            <p>
              Esta política pode ser atualizada. A data de referência é o
              lançamento da loja online. Em caso de dúvida, fale conosco.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
