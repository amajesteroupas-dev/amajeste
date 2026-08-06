import Link from "next/link";
import { PromotionsAdmin } from "@/components/admin/PromotionsAdmin";

export const dynamic = "force-dynamic";

export default function PromocoesAdminPage() {
  return (
    <div>
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Promoções
      </h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Cadastre promoções para todo o site, só Pix ou só cartão (incluindo
        apenas 1x). Ative ou desative cada uma quando quiser. Cupons de looks
        ficam em{" "}
        <Link href="/admin/looks" className="underline underline-offset-2">
          Looks &amp; cupons
        </Link>
        .
      </p>
      <PromotionsAdmin />
    </div>
  );
}
