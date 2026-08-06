"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { WhatsAppIcon } from "@/components/store/WhatsAppIcon";
import { InstagramIcon } from "@/components/store/InstagramIcon";

type SyncChannel = "whatsapp" | "instagram" | "all";

type SyncResponse = {
  error?: string;
  message?: string;
  synced?: number;
  skipped?: number;
  configured?: boolean;
};

/**
 * Sincroniza o catálogo da loja com o Commerce Manager da Meta
 * (mesmo catálogo usado pelo WhatsApp Business e pela Loja do Instagram).
 */
export function MetaCatalogSyncButtons() {
  const [busy, setBusy] = useState<SyncChannel | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function sync(channel: SyncChannel) {
    if (busy) return;

    const confirms: Record<SyncChannel, string> = {
      whatsapp:
        "Sincronizar os produtos ativos (com foto) com o catálogo do WhatsApp Business?",
      instagram:
        "Sincronizar os produtos ativos (com foto) com a Loja do Instagram (catálogo Meta)?",
      all: "Atualizar todos os produtos no catálogo Meta (WhatsApp Business + Loja do Instagram)?",
    };

    if (!confirm(confirms[channel])) return;

    setBusy(channel);
    setMessage("");
    setError("");

    try {
      const res = await fetch("/api/admin/whatsapp/catalog/sync", {
        method: "POST",
      });
      const data = (await res.json().catch(() => ({}))) as SyncResponse;

      if (!res.ok) {
        setError(
          data.error ||
            "Não foi possível sincronizar o catálogo. Configure META_CATALOG_ID e META_CATALOG_ACCESS_TOKEN no servidor."
        );
        return;
      }

      const channelsLabel =
        channel === "whatsapp"
          ? "WhatsApp"
          : channel === "instagram"
            ? "Instagram"
            : "WhatsApp e Instagram";

      setMessage(
        data.message
          ? `${data.message} (${channelsLabel})`
          : `${data.synced ?? 0} itens atualizados em ${channelsLabel}${
              data.skipped ? ` · ${data.skipped} ignorados` : ""
            }.`
      );
    } catch {
      setError("Falha de rede ao sincronizar o catálogo.");
    } finally {
      setBusy(null);
    }
  }

  const disabled = busy !== null;

  return (
    <div className="inline-flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => sync("whatsapp")}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-none border border-[#128C7E] bg-[#25D366] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#1ebe57] disabled:opacity-50"
          title="Envia produtos para o catálogo Meta / WhatsApp Business"
        >
          <WhatsAppIcon size={18} className="shrink-0" />
          {busy === "whatsapp" ? "Sincronizando…" : "Integrar com WhatsApp"}
        </button>

        <button
          type="button"
          onClick={() => sync("instagram")}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-none border border-[#c13584] bg-gradient-to-r from-[#f58529] via-[#dd2a7b] to-[#8134af] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
          title="Envia produtos para a Loja do Instagram (mesmo catálogo Meta)"
        >
          <InstagramIcon size={18} className="shrink-0" />
          {busy === "instagram" ? "Sincronizando…" : "Integrar com Instagram"}
        </button>

        <button
          type="button"
          onClick={() => sync("all")}
          disabled={disabled}
          className="inline-flex items-center justify-center gap-2 rounded-none border border-black/20 bg-[#2a2420] px-4 py-2.5 text-sm font-semibold uppercase tracking-wide text-white shadow-sm transition hover:bg-black disabled:opacity-50"
          title="Atualiza o catálogo Meta completo (WhatsApp + Instagram)"
        >
          <RefreshCw
            size={16}
            className={`shrink-0 ${busy === "all" ? "animate-spin" : ""}`}
          />
          {busy === "all" ? "Atualizando…" : "Atualizar todos"}
        </button>
      </div>

      {message ? (
        <p className="text-xs text-muted max-w-xl">{message}</p>
      ) : null}
      {error ? (
        <p className="text-xs text-red-700 max-w-xl whitespace-pre-wrap">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** @deprecated use MetaCatalogSyncButtons */
export function WhatsAppCatalogSyncButton() {
  return <MetaCatalogSyncButtons />;
}
