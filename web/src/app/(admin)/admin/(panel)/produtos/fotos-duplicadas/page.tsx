import Link from "next/link";
import { findDuplicateProductPhotos } from "@/lib/product-image-duplicates";
import { DuplicatePhotosClient } from "@/components/admin/DuplicatePhotosClient";

export const dynamic = "force-dynamic";

export default async function DuplicateProductPhotosPage() {
  const { groups, totalImages, productsWithDupes } =
    await findDuplicateProductPhotos();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl" style={{ fontFamily: "var(--font-display)" }}>
            Fotos duplicadas
          </h1>
          <p className="text-sm text-muted mt-2 max-w-2xl">
            Lista fotos usadas em <strong>2 ou mais produtos</strong> diferentes.
            Escolha o produto certo e remova a foto dos outros com um clique.
          </p>
        </div>
        <Link
          href="/admin/produtos"
          className="text-sm px-3 py-2 border border-black/15 bg-white hover:bg-[#f7f1ea]"
        >
          ← Voltar aos produtos
        </Link>
      </div>

      <div className="border border-black/10 bg-[#faf7f3] p-4 text-sm text-[#5c534c] space-y-2 max-w-3xl">
        <p className="font-medium text-[#2a2420]">Como corrigir</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Veja a foto e os produtos que a compartilham.</li>
          <li>
            Marque o <strong>produto certo</strong> (o que realmente usa essa
            foto).
          </li>
          <li>
            Clique em <strong>Manter só neste produto</strong> — a imagem é
            removida dos demais.
          </li>
        </ol>
        <p className="text-xs">
          Depois, nos outros produtos, envie a foto correta de cada um se ainda
          faltar imagem.
        </p>
      </div>

      {groups.length > 0 ? (
        <p className="text-sm text-[#5c534c]">
          <strong>{groups.length}</strong> grupo(s) ·{" "}
          <strong>{productsWithDupes}</strong> produto(s) envolvidos ·{" "}
          {totalImages} imagens no total
        </p>
      ) : null}

      <DuplicatePhotosClient groups={groups} />
    </div>
  );
}

