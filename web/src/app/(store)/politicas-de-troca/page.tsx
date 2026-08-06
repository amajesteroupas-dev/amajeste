import Link from "next/link";
import {
  ArrowLeftRight,
  BadgeCheck,
  Clock3,
  PackageCheck,
  ShieldAlert,
  Wallet,
} from "lucide-react";
import { whatsappUrl } from "@/lib/site";

export const metadata = {
  title: "Políticas de Troca",
  description: "Regras de troca e diferença de valor da Majesté.",
};

export default function ExchangePolicyPage() {
  return (
    <div className="bg-[#f7f3ee]">
      <div className="container-maj py-12 md:py-16">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          Atendimento
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#2a2420] max-w-2xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Políticas de Troca
        </h1>
        <p className="mt-4 max-w-2xl text-[#5c534c] leading-relaxed">
          Transparência para você trocar com segurança. Confira prazos,
          condições e como solicitar.
        </p>

        <div className="mt-10 grid gap-5 lg:grid-cols-3">
          <article className="bg-white border border-black/8 p-6 space-y-3">
            <Clock3 className="text-[#a85f64]" size={22} />
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Prazo
            </h2>
            <p className="text-sm text-[#555] leading-relaxed">
              Até <strong>7 dias corridos</strong> após o recebimento do pedido.
            </p>
          </article>
          <article className="bg-white border border-black/8 p-6 space-y-3">
            <PackageCheck className="text-[#a85f64]" size={22} />
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Estado da peça
            </h2>
            <p className="text-sm text-[#555] leading-relaxed">
              Sem uso, com etiqueta e na embalagem original. Sem marca de
              desodorante, suor, perfume ou maquiagem.
            </p>
          </article>
          <article className="bg-white border border-black/8 p-6 space-y-3">
            <ArrowLeftRight className="text-[#a85f64]" size={22} />
            <h2
              className="text-xl text-[#2a2420]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Como funciona
            </h2>
            <p className="text-sm text-[#555] leading-relaxed">
              1 troca por pedido. Você paga o frete da troca, exceto em erro
              nosso de envio ou tamanho.
            </p>
          </article>
        </div>

        <div className="mt-5 grid gap-5 lg:grid-cols-2">
          <section className="bg-white border border-black/8 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <BadgeCheck className="text-emerald-700" size={20} />
              <h2
                className="text-2xl text-[#2a2420]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Motivos que aceitamos
              </h2>
            </div>
            <ul className="space-y-3 text-sm text-[#444]">
              {[
                "Tamanho não serviu",
                "Defeito de fabricação",
                "Cor/modelo diferente do enviado por erro nosso",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 border-b border-black/5 pb-3 last:border-0 last:pb-0"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-700" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="bg-white border border-black/8 p-6 md:p-8">
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="text-[#a85f64]" size={20} />
              <h2
                className="text-2xl text-[#2a2420]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Motivos que não aceitamos
              </h2>
            </div>
            <ul className="space-y-3 text-sm text-[#444]">
              {[
                "Peça usada, lavada ou com cheiro",
                "Arrependimento após 7 dias",
                "Peça de coleção promocional / Liquida",
              ].map((item) => (
                <li
                  key={item}
                  className="flex gap-3 border-b border-black/5 pb-3 last:border-0 last:pb-0"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#a85f64]" />
                  {item}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <section className="mt-5 bg-white border border-[#2a2420]/10 text-[#2a2420] p-6 md:p-8 grid gap-4 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <div className="flex items-center gap-2 mb-2 text-[#a85f64]">
              <Wallet size={18} />
              <h2
                className="text-2xl text-[#2a2420]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Diferença de valor
              </h2>
            </div>
            <p className="text-sm text-[#5c534c] leading-relaxed max-w-2xl">
              Se trocar por peça mais cara: paga a diferença via Pix. Se trocar
              por peça mais barata: o valor fica como crédito na loja por até 12
              meses.
            </p>
          </div>
          <a
            href={whatsappUrl(
              "Olá! Quero solicitar uma troca na Majesté."
            )}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary justify-self-start md:justify-self-end"
          >
            Solicitar troca
          </a>
        </section>

        <p className="mt-8 text-sm text-[#6b635c]">
          Dúvidas?{" "}
          <Link href="/contato" className="underline underline-offset-2">
            Fale conosco
          </Link>{" "}
          ou chame no WhatsApp.
        </p>
      </div>
    </div>
  );
}
