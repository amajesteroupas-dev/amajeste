import Link from "next/link";
import { siteContact, whatsappUrl } from "@/lib/site";
import {
  LOOK_IMAGE_CONSENT_PATH,
  LOOK_IMAGE_CONSENT_TITLE,
  LOOK_IMAGE_CONSENT_VERSION,
} from "@/lib/look-image-consent";

export const metadata = {
  title: "Consentimento de imagem — Influence",
  description:
    "Termo de autorização de uso de imagem para o programa Seja Influence Majesté.",
};

export default function TermosImagemLooksPage() {
  return (
    <div className="bg-[#f7f3ee]">
      <div className="container-maj py-12 md:py-16 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          Legal · Influence
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#2a2420]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {LOOK_IMAGE_CONSENT_TITLE}
        </h1>
        <p className="mt-4 text-[#5c534c] leading-relaxed">
          Ao enviar um look no programa Seja Influence Majesté, você declara ter
          lido e aceito este termo. Versão{" "}
          <strong>{LOOK_IMAGE_CONSENT_VERSION}</strong>.
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
              Este termo regula a autorização de uso da imagem (foto do look),
              legenda e demais conteúdos enviados por você à Majesté no
              programa Influence, para divulgação da marca e dos produtos.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              2. Autorização de uso
            </h2>
            <p>
              Você autoriza a Majesté, de forma gratuita (exceto o benefício do
              programa Influence, como cupom de desconto quando aplicável), a
              utilizar a imagem e a legenda enviadas, no todo ou em parte, em:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>site e aplicativo da loja (ex.: galeria de looks);</li>
              <li>redes sociais e canais digitais da marca;</li>
              <li>anúncios, campanhas e materiais de marketing;</li>
              <li>
                folders, e-mails, stories e demais peças promocionais, online ou
                offline.
              </li>
            </ul>
            <p>
              A autorização inclui edição razoável (recorte, redimensionamento,
              legendas institucionais), desde que não distorça o sentido da
              imagem de forma pejorativa.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              3. Direitos de imagem e titularidade
            </h2>
            <p>
              Você declara ser a titular dos direitos sobre a foto enviada (ou
              ter autorização de quem nela aparece) e que o conteúdo não viola
              direitos de terceiros. Você mantém a titularidade da imagem; a
              Majesté recebe apenas a licença de uso prevista neste termo.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              4. Maioridade
            </h2>
            <p>
              Ao aceitar, você declara ser maior de 18 anos. Se for menor,
              somente com autorização do responsável legal (que deverá
              contatar a Majesté antes do envio).
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              5. Prazo e revogação
            </h2>
            <p>
              O aceite é registrado por envio (cada look). Enquanto o look
              estiver pendente de aprovação, você pode removê-lo pela sua conta.
              Após aprovação e publicação, a Majesté poderá manter o uso já
              iniciado em materiais e arquivos históricos; pedidos de remoção
              da galeria pública podem ser feitos pelo contato abaixo e serão
              analisados em prazo razoável, sem prejuízo de usos já veiculados.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              6. Privacidade
            </h2>
            <p>
              O tratamento de dados pessoais segue a{" "}
              <Link
                href="/privacidade"
                className="underline text-[#95752c]"
              >
                Política de Privacidade
              </Link>
              . O registro do aceite (data, versão do termo e, quando disponível,
              endereço IP) fica vinculado ao envio para fins de comprovação.
            </p>
          </section>

          <section className="space-y-2">
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              7. Contato
            </h2>
            <p>
              Dúvidas sobre este termo:{" "}
              <a
                className="underline text-[#95752c]"
                href={`mailto:${siteContact.email}`}
              >
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
            <p className="text-xs text-[#8a7468] mt-4">
              Documento: {LOOK_IMAGE_CONSENT_PATH} · versão{" "}
              {LOOK_IMAGE_CONSENT_VERSION}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
