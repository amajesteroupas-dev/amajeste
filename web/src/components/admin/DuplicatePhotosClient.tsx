"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { DuplicatePhotoGroup } from "@/lib/product-image-duplicates";
import { mediaSrc } from "@/lib/media-src";

type Props = {
  groups: DuplicatePhotoGroup[];
};

export function DuplicatePhotosClient({ groups: initial }: Props) {
  const router = useRouter();
  const [groups, setGroups] = useState(initial);
  const [keepByGroup, setKeepByGroup] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  async function applyKeep(g: DuplicatePhotoGroup) {
    const keepProductId = keepByGroup[g.key];
    if (!keepProductId) {
      alert("Selecione o produto que deve ficar com esta foto.");
      return;
    }
    const keepName =
      g.products.find((p) => p.productId === keepProductId)?.productName ||
      "produto";
    const others = g.products
      .filter((p) => p.productId !== keepProductId)
      .map((p) => p.productName);
    if (
      !confirm(
        `Manter a foto só em “${keepName}”?\n\nSerá removida de:\n• ${others.join("\n• ")}`
      )
    ) {
      return;
    }

    setBusyKey(g.key);
    setMsg("");
    try {
      const body =
        g.kind === "url"
          ? {
              keepProductId,
              kind: "url",
              matchUrl: g.matchUrl,
            }
          : {
              keepProductId,
              kind: "arquivo",
              removeImageIds: g.products
                .filter((p) => p.productId !== keepProductId)
                .flatMap((p) => p.imageIds),
            };

      const res = await fetch("/api/admin/products/dedupe-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Falha ao corrigir");
        return;
      }
      setMsg(data.message || "Corrigido");
      setGroups((prev) => prev.filter((x) => x.key !== g.key));
      router.refresh();
    } finally {
      setBusyKey(null);
    }
  }

  if (groups.length === 0) {
    return (
      <p className="text-sm text-[#5c534c]">
        {msg ? (
          <span className="text-emerald-800 font-medium">{msg} </span>
        ) : null}
        Nenhuma foto compartilhada entre produtos no momento.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {msg ? (
        <p className="text-sm text-emerald-800 font-medium">{msg}</p>
      ) : null}
      <p className="text-sm text-[#5c534c]">
        Em cada grupo, marque o <strong>produto certo</strong> e clique em{" "}
        <strong>Manter só neste produto</strong>. A foto some dos outros
        automaticamente.
      </p>
      {groups.map((g) => {
        const selected = keepByGroup[g.key] || "";
        const busy = busyKey === g.key;
        return (
          <article
            key={g.key}
            className="border border-black/10 bg-white p-4 grid gap-4 md:grid-cols-[120px_1fr]"
          >
            <div className="aspect-[3/4] overflow-hidden bg-[#ebe4db]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={mediaSrc(g.url)}
                alt=""
                className="h-full w-full object-cover object-top"
              />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[#8a7468]">
                {g.kind === "url"
                  ? "Mesma URL"
                  : "Mesmo arquivo (conteúdo idêntico)"}{" "}
                · {g.products.length} produtos
                {g.dangerous ? " · BLOQUEADO" : ""}
              </p>
              <p className="text-[11px] text-muted mt-1 break-all">{g.url}</p>
              {g.dangerous ? (
                <p className="mt-2 text-sm text-red-800 bg-red-50 border border-red-200 px-3 py-2">
                  {g.dangerReason ||
                    "Grupo perigoso — não remova daqui. Reenvie as fotos de cada produto."}
                </p>
              ) : null}

              <fieldset className="mt-3 space-y-2">
                <legend className="text-xs font-medium text-[#2a2420] mb-1">
                  Qual produto deve ficar com esta foto?
                </legend>
                {g.products.map((p) => (
                  <label
                    key={`${g.key}-${p.productId}`}
                    className={`flex items-start gap-2 text-sm cursor-pointer rounded border px-2.5 py-2 ${
                      selected === p.productId
                        ? "border-[#2a2420] bg-[#faf7f3]"
                        : "border-black/10 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`keep-${g.key}`}
                      className="mt-1"
                      checked={selected === p.productId}
                      disabled={busy}
                      onChange={() =>
                        setKeepByGroup((prev) => ({
                          ...prev,
                          [g.key]: p.productId,
                        }))
                      }
                    />
                    <span className="min-w-0">
                      <span className="font-medium text-[#2a2420]">
                        {p.productName}
                      </span>
                      {!p.active ? (
                        <span className="ml-2 text-[11px] text-rose-800">
                          (inativo)
                        </span>
                      ) : null}
                      <span className="block text-[11px] text-muted">
                        /{p.productSlug}
                      </span>
                      <Link
                        href={`/admin/produtos/${p.productId}`}
                        className="text-[11px] underline text-[#5c534c]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Abrir produto
                      </Link>
                    </span>
                  </label>
                ))}
              </fieldset>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary !py-2 !px-3 text-sm"
                  disabled={busy || !selected || Boolean(g.dangerous)}
                  title={
                    g.dangerous
                      ? "Bloqueado — reenvie as fotos de cada produto"
                      : undefined
                  }
                  onClick={() => void applyKeep(g)}
                >
                  {busy
                    ? "Corrigindo…"
                    : g.dangerous
                      ? "Remoção bloqueada"
                      : "Manter só neste produto"}
                </button>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

