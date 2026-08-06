"use client";

import Link from "next/link";
import { Mail, Phone } from "lucide-react";
import { PaymentFlagsRow } from "@/components/store/PaymentFlags";
import { BrandLogo } from "@/components/store/BrandLogo";
import { WhatsAppIcon } from "@/components/store/WhatsAppIcon";
import { useSitePromo } from "@/components/store/SitePromoContext";
import {
  instagramUrl,
  siteContact,
  whatsappUrl,
} from "@/lib/site";
import { fillPaymentCopy } from "@/lib/payment-copy";

function InstagramIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <rect
        x="2"
        y="2"
        width="20"
        height="20"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
    </svg>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  const sitePromo = useSitePromo();
  const paymentCopy = fillPaymentCopy(sitePromo.paymentCopy.footerPaymentLine, {
    percent: sitePromo.active ? sitePromo.percent : 5,
    pixPercent: sitePromo.pixPercentIncluded,
  });

  return (
    <footer className="mt-16 border-t border-[#e8e0d6] bg-[#f7f3ee] text-[#3a322c]">
      <div className="mx-auto max-w-6xl px-4 py-12 md:py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <BrandLogo size="md" className="mb-4" />
            <p className="text-sm leading-relaxed text-[#5c534c] max-w-xs">
              Moda feminina com presença e cuidado em cada detalhe. Peças para
              mulheres que escolhem se vestir com intenção.
            </p>
            <div className="mt-5 flex items-center gap-3">
              <a
                href={instagramUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9cfc3] text-[#3a322c] hover:border-[#c9a24a] hover:text-[#95752c] transition-colors"
                aria-label="Instagram"
              >
                <InstagramIcon />
              </a>
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9cfc3] text-[#3a322c] hover:border-[#25D366] hover:text-[#128C7E] transition-colors"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon size={18} />
              </a>
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#95752c] mb-4">
              Contato
            </p>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href={`tel:${siteContact.phoneDigits}`}
                  className="inline-flex items-center gap-2 hover:text-[#95752c]"
                >
                  <Phone size={15} strokeWidth={1.75} />
                  {siteContact.phoneDisplay}
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${siteContact.email}`}
                  className="inline-flex items-center gap-2 hover:text-[#95752c]"
                >
                  <Mail size={15} strokeWidth={1.75} />
                  {siteContact.email}
                </a>
              </li>
              <li>
                <a
                  href={whatsappUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 hover:text-[#95752c]"
                >
                  <WhatsAppIcon size={15} />
                  WhatsApp
                </a>
              </li>
            </ul>
          </div>

          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[#95752c] mb-4">
              Meios de pagamento
            </p>
            <PaymentFlagsRow variant="main" className="mb-4" />
            <p className="text-xs text-[#5c534c] leading-relaxed mb-5">
              {paymentCopy}
            </p>
            <p className="text-xs uppercase tracking-[0.16em] text-[#95752c] mb-3">
              Confiança
            </p>
            <ul className="space-y-2.5 text-sm text-[#3a322c]">
              <li>
                <Link href="/privacidade" className="hover:text-[#95752c]">
                  Site protegido · LGPD
                </Link>
              </li>
              <li>
                <Link
                  href="/termos-imagem-looks"
                  className="hover:text-[#95752c]"
                >
                  Consentimento de imagem (Influence)
                </Link>
              </li>
              <li>
                <Link href="/trocas" className="hover:text-[#95752c]">
                  Trocas e devoluções
                </Link>
              </li>
              <li>
                <Link href="/contato" className="hover:text-[#95752c]">
                  Fale conosco
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-[#e0d6ca] flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between text-xs text-[#7a7168]">
          <p>
            © {year} {siteContact.brand}. Todos os direitos reservados.
          </p>
          <p>amajeste.com.br</p>
        </div>
      </div>
    </footer>
  );
}
