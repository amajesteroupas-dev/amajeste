"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CANVA_ART_SPECS,
  CANVA_MANUAL_CHECKLIST,
  CANVA_OPEN_URL,
  canvaSizeCopyText,
  formatPx,
  suggestCanvaSpec,
  type CanvaArtSpec,
} from "@/lib/banner-canva-specs";

type Props = {
  layout: string;
  bannerSize: string;
  bannerTitle?: string;
};

type CanvaStatus = {
  configured: boolean;
  connected: boolean;
};

export function BannerCanvaPanel({ layout, bannerSize, bannerTitle }: Props) {
  const [open, setOpen] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [status, setStatus] = useState<CanvaStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const suggested = useMemo(
    () => suggestCanvaSpec(layout, bannerSize),
    [layout, bannerSize]
  );

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/canva/status")
      .then((r) => r.json())
      .then((data: CanvaStatus) => {
        if (!cancelled) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatus({ configured: false, connected: false });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function copySize(spec: CanvaArtSpec) {
    const text = canvaSizeCopyText(spec.width, spec.height);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(spec.id);
      setTimeout(() => setCopiedId(null), 1600);
    } catch {
      setMsg(`Copie manualmente: ${text}`);
    }
  }

  async function createInCanva(spec: CanvaArtSpec) {
    setBusy(true);
    setMsg("");
    try {
      const res = await fetch("/api/admin/canva/create-design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          specId: spec.id,
          title: bannerTitle
            ? `Majesté — ${bannerTitle}`
            : `Majesté — ${spec.label}`,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        needsConnect?: boolean;
        design?: { editUrl?: string };
      };
      if (!res.ok) {
        if (data.needsConnect) {
          setMsg("Conecte sua conta Canva primeiro.");
        } else {
          setMsg(data.error || "Não foi possível criar a arte.");
        }
        return;
      }
      if (data.design?.editUrl) {
        window.open(data.design.editUrl, "_blank", "noopener,noreferrer");
        setMsg("Arte criada — editando no Canva.");
      }
    } catch {
      setMsg("Falha de rede ao falar com o Canva.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-black/10 bg-[#faf7f2]">
      <button
        type="button"
        className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <span className="text-xs uppercase tracking-wider text-ink font-semibold">
          Canva — manual de artes
        </span>
        <span className="text-[11px] text-muted">
          {open ? "Ocultar" : "Mostrar"}
        </span>
      </button>

      {open ? (
        <div className="px-3 pb-3 space-y-3 border-t border-black/8">
          <div className="pt-3 rounded-sm bg-white border border-black/10 p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted mb-1">
              Tamanho sugerido para este banner
            </p>
            <p className="text-sm font-semibold text-ink">
              {suggested.label}{" "}
              <span className="text-[var(--rose)]">
                {formatPx(suggested.width, suggested.height)}
              </span>
            </p>
            <ul className="mt-2 space-y-1 text-[12px] text-muted leading-snug">
              {suggested.tips.slice(0, 2).map((t) => (
                <li key={t}>• {t}</li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn btn-outline !py-1.5 !px-3 text-xs"
                onClick={() => copySize(suggested)}
              >
                {copiedId === suggested.id ? "Copiado!" : "Copiar tamanho"}
              </button>
              <a
                href={CANVA_OPEN_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-outline !py-1.5 !px-3 text-xs"
              >
                Abrir Canva
              </a>
              {status?.configured && status.connected ? (
                <button
                  type="button"
                  className="btn btn-dark !py-1.5 !px-3 text-xs"
                  disabled={busy}
                  onClick={() => createInCanva(suggested)}
                >
                  {busy ? "Criando…" : "Criar arte neste tamanho"}
                </button>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              Todos os tamanhos Majesté
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {CANVA_ART_SPECS.map((spec) => {
                const active = spec.id === suggested.id;
                return (
                  <div
                    key={spec.id}
                    className={`border p-2.5 bg-white ${
                      active ? "border-[var(--rose)]" : "border-black/10"
                    }`}
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-1">
                      <p className="text-sm font-medium text-ink">
                        {spec.label}
                      </p>
                      <code className="text-[11px] text-[var(--rose)]">
                        {formatPx(spec.width, spec.height)}
                      </code>
                    </div>
                    <p className="text-[11px] text-muted mt-1 leading-snug">
                      {spec.tips[0]}
                    </p>
                    <p className="text-[10px] text-muted/80 mt-1">
                      Export: {spec.exportNote}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className="btn btn-outline !py-1 !px-2 text-[10px]"
                        onClick={() => copySize(spec)}
                      >
                        {copiedId === spec.id ? "Copiado" : "Copiar px"}
                      </button>
                      {status?.configured && status.connected ? (
                        <button
                          type="button"
                          className="btn btn-outline !py-1 !px-2 text-[10px]"
                          disabled={busy}
                          onClick={() => createInCanva(spec)}
                        >
                          Criar no Canva
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="border border-black/10 bg-white p-3">
            <p className="text-[11px] uppercase tracking-wider text-muted mb-2">
              Passo a passo
            </p>
            <ol className="list-decimal pl-4 space-y-1.5 text-[12px] text-ink/80 leading-snug">
              {CANVA_MANUAL_CHECKLIST.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          </div>

          <div className="border border-dashed border-black/15 bg-white/70 p-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted">
              API Canva
            </p>
            {!status ? (
              <p className="text-[12px] text-muted">Verificando…</p>
            ) : !status.configured ? (
              <p className="text-[12px] text-muted leading-snug">
                Ainda sem chaves. Em{" "}
                <a
                  href="https://www.canva.com/developers/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  canva.com/developers
                </a>
                , crie a integração e coloque{" "}
                <code className="text-[11px]">CANVA_CLIENT_ID</code> /{" "}
                <code className="text-[11px]">CANVA_CLIENT_SECRET</code> no
                servidor. Redirect:{" "}
                <code className="text-[10px] break-all">
                  /api/admin/canva/callback
                </code>
              </p>
            ) : status.connected ? (
              <p className="text-[12px] text-emerald-800">
                Conta Canva conectada. Use “Criar arte neste tamanho”.
              </p>
            ) : (
              <div className="space-y-2">
                <p className="text-[12px] text-muted">
                  Chaves ok — falta autorizar sua conta.
                </p>
                <a
                  href="/api/admin/canva/connect"
                  className="btn btn-dark !py-1.5 !px-3 text-xs inline-flex"
                >
                  Conectar Canva
                </a>
              </div>
            )}
            {msg ? (
              <p className="text-[12px] text-[var(--rose)]">{msg}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
