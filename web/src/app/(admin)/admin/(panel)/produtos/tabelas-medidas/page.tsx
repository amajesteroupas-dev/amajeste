import Link from "next/link";
import { SizeGuidesManager } from "@/components/admin/SizeGuidesManager";
import { getSizeGuidesCatalog } from "@/lib/site-settings";

export const dynamic = "force-dynamic";

export default async function TabelasMedidasPage() {
  const guides = await getSizeGuidesCatalog();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-3xl mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Tabelas de medidas
          </h1>
          <p className="text-sm text-muted max-w-2xl">
            Adicione, edite ou remova tabelas. Em cada produto, escolha qual
            tabela aparece no botão Guia de medidas.
          </p>
        </div>
        <Link
          href="/admin/produtos"
          className="text-sm px-3 py-2 border border-black/15 bg-white hover:bg-[#f7f1ea]"
        >
          Voltar aos produtos
        </Link>
      </div>
      <SizeGuidesManager initialGuides={guides} />
    </div>
  );
}
