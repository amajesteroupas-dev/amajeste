import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { WhatsAppIcon } from "@/components/store/WhatsAppIcon";
import {
  instagramUrl,
  siteContact,
  whatsappUrl,
} from "@/lib/site";

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const metadata = { title: "Contato" };

export default function ContactPage() {
  return (
    <div className="bg-[#f7f3ee]">
      <div className="container-maj py-12 md:py-16 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          Fale conosco
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#2a2420] mb-4"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Contato
        </h1>
        <p className="text-[#5c534c] mb-8 leading-relaxed">
          Atendimento pelo WhatsApp, Instagram ou e-mail. Estamos prontas para
          ajudar com pedidos, trocas e dúvidas.
        </p>

        <div className="grid gap-4 sm:grid-cols-2 mb-8">
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-black/8 p-5 flex items-start gap-3 hover:border-ink/30"
          >
            <WhatsAppIcon className="text-[#25D366] mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-sm">WhatsApp</p>
              <p className="text-sm text-muted mt-1">{siteContact.phoneDisplay}</p>
            </div>
          </a>
          <a
            href={instagramUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-white border border-black/8 p-5 flex items-start gap-3 hover:border-ink/30"
          >
            <span className="text-[#a85f64] mt-0.5">
              <InstagramIcon />
            </span>
            <div>
              <p className="font-semibold text-sm">Instagram</p>
              <p className="text-sm text-muted mt-1">@{siteContact.instagram}</p>
            </div>
          </a>
          <a
            href={`mailto:${siteContact.email}`}
            className="bg-white border border-black/8 p-5 flex items-start gap-3 hover:border-ink/30"
          >
            <Mail className="text-[#a85f64] mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-sm">E-mail</p>
              <p className="text-sm text-muted mt-1 break-all">
                {siteContact.email}
              </p>
            </div>
          </a>
          <a
            href={`tel:${siteContact.phoneDigits}`}
            className="bg-white border border-black/8 p-5 flex items-start gap-3 hover:border-ink/30"
          >
            <Phone className="text-[#a85f64] mt-0.5" size={20} />
            <div>
              <p className="font-semibold text-sm">Telefone</p>
              <p className="text-sm text-muted mt-1">{siteContact.phoneDisplay}</p>
            </div>
          </a>
        </div>

        <form className="space-y-3 bg-white border border-black/8 p-6">
          <input className="input" placeholder="Nome" required />
          <input className="input" type="email" placeholder="E-mail" required />
          <input className="input" placeholder="WhatsApp" />
          <textarea className="input min-h-32" placeholder="Mensagem" required />
          <button type="submit" className="btn btn-primary">
            Enviar
          </button>
          <p className="text-xs text-muted">
            Ou{" "}
            <Link href={whatsappUrl()} className="underline">
              chame no WhatsApp
            </Link>
            .
          </p>
        </form>
      </div>
    </div>
  );
}
