"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Camera, Copy, Check, ImagePlus, X, FileCheck2 } from "lucide-react";
import {
  LOOK_IMAGE_CONSENT_PATH,
  LOOK_IMAGE_CONSENT_SUMMARY,
  LOOK_IMAGE_CONSENT_VERSION,
  formatConsentDate,
} from "@/lib/look-image-consent";

type ProductOpt = { id: string; name: string; slug: string };

type Look = {
  id: string;
  imageUrl: string;
  caption: string | null;
  productName: string | null;
  status: string;
  rewardCode: string | null;
  rewardPercent: number;
  rewardUsed: boolean;
  createdAt: string;
  imageConsentAcceptedAt?: string | null;
  imageConsentVersion?: string | null;
  coupon?: { code: string; used: boolean; percent: number } | null;
};

const STATUS_UI: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Aguardando aprovação",
    className: "bg-[#f0e6d8] text-[#8a6a4a]",
  },
  APPROVED: {
    label: "Aprovado · no site",
    className: "bg-[#e8f0e4] text-[#4a6a3a]",
  },
  REJECTED: {
    label: "Não aprovado",
    className: "bg-[#f5e4e4] text-[#8a3a3a]",
  },
};

export function GaleriaLooksClient({ products }: { products: ProductOpt[] }) {
  const [items, setItems] = useState<Look[]>([]);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [productName, setProductName] = useState("");
  const [productId, setProductId] = useState("");
  const [caption, setCaption] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [imageConsent, setImageConsent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function load() {
    const res = await fetch("/api/academia/looks");
    if (res.ok) setItems(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  function onFileChange(file: File | null) {
    if (preview) URL.revokeObjectURL(preview);
    if (!file) {
      setPreview(null);
      setFileName("");
      return;
    }
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
  }

  function clearFile() {
    if (fileRef.current) fileRef.current.value = "";
    onFileChange(null);
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg("");
    setErr("");

    if (!productId) {
      setErr("Selecione a peça Majesté (nome igual ao do site).");
      return;
    }
    if (caption.trim().length < 10) {
      setErr("Conte um pouco mais como a peça combina (mín. 10 caracteres).");
      return;
    }
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setErr("Escolha uma foto do look.");
      return;
    }
    if (!imageConsent) {
      setErr(
        "Aceite o Termo de consentimento de imagem para enviar o look."
      );
      return;
    }

    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    fd.set("productId", productId);
    fd.set("productName", productName.trim());
    fd.set("caption", caption.trim());
    fd.set("imageConsent", "true");

    const res = await fetch("/api/academia/looks", { method: "POST", body: fd });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Erro ao enviar");
      return;
    }
    setMsg(
      data.message ||
        "Look enviado! Assim que a equipe aprovar, você recebe o cupom de Influence (10%)."
    );
    setProductName("");
    setCaption("");
    setImageConsent(false);
    clearFile();
    load();
  }

  async function remove(id: string) {
    if (!confirm("Remover este look pendente?")) return;
    await fetch(`/api/academia/looks?id=${id}`, { method: "DELETE" });
    load();
  }

  async function copyCoupon(code: string, lookId: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(lookId);
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch {
      window.prompt("Copie o cupom:", code);
    }
  }

  const latestConsented = items.find((l) => l.imageConsentAcceptedAt);

  return (
    <div className="space-y-10">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(280px,0.85fr)]">
        <div className="border border-[#2a2420]/08 bg-[#faf7f3] p-5 md:p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#a85f64] mb-2">
            Programa Influence
          </p>
          <h2
            className="text-2xl md:text-3xl text-[#2a2420] mb-2"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Seja Influence Majesté
          </h2>
          <p className="text-sm text-[#5c534c] mb-5 leading-relaxed">
            Você cria conteúdo. A Majesté te recompensa. Publique um look com
            peça da marca, inspire a comunidade e, após aprovação, receba um{" "}
            <strong>cupom exclusivo de 10%</strong> — um código novo a cada look
            aprovado. O cupom não acumula com o desconto do Pix (fica só os 10%).
            Ideal para quem quer crescer como creator e vestir presença.
          </p>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a7468] mb-2">
                Foto do look *
              </p>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => onFileChange(e.target.files?.[0] || null)}
              />
              {preview ? (
                <div className="relative border border-[#2a2420]/10 bg-white overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Prévia do look"
                    className="aspect-[3/4] w-full max-h-72 object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-[#2a2420]/75 px-3 py-2 text-white text-xs">
                    <span className="truncate">{fileName}</span>
                    <button
                      type="button"
                      onClick={clearFile}
                      className="inline-flex items-center gap-1 shrink-0 hover:text-[#f0c9c9]"
                    >
                      <X size={14} /> Trocar
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="w-full border border-dashed border-[#2a2420]/25 bg-white/80 px-4 py-10 text-center hover:border-[#a85f64] hover:bg-white transition-colors"
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center bg-[#faf7f3] text-[#a85f64] mb-3">
                    <Camera size={22} strokeWidth={1.5} />
                  </span>
                  <span className="block text-sm font-medium text-[#2a2420]">
                    Toque para escolher a foto
                  </span>
                  <span className="block text-xs text-[#8a7468] mt-1">
                    JPG ou PNG · mostre a peça com clareza
                  </span>
                </button>
              )}
              {!preview ? (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-[#a85f64] hover:underline"
                >
                  <ImagePlus size={14} /> Abrir galeria do celular
                </button>
              ) : null}
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-[0.14em] text-[#8a7468]">
                Nome da peça *{" "}
                <span className="normal-case tracking-normal text-[#a67c6a]">
                  (igual ao produto no site)
                </span>
              </label>
              <select
                className="input mt-1.5"
                required
                value={productId}
                onChange={(e) => {
                  const id = e.target.value;
                  setProductId(id);
                  const found = products.find((p) => p.id === id);
                  setProductName(found?.name || "");
                }}
              >
                <option value="">Selecione o produto Majesté</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[11px] uppercase tracking-[0.14em] text-[#8a7468]">
                Como a peça combina *
              </label>
              <textarea
                className="input mt-1.5 min-h-[100px]"
                required
                minLength={10}
                maxLength={800}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="Conte como a peça combina com seu estilo, rotina ou conteúdo…"
              />
              <p className="text-[11px] text-[#8a7468] mt-1">
                {caption.trim().length}/800 · mínimo 10 caracteres
              </p>
            </div>

            <label className="flex items-start gap-2.5 cursor-pointer border border-[#2a2420]/10 bg-white px-3 py-3">
              <input
                type="checkbox"
                className="mt-0.5 shrink-0"
                checked={imageConsent}
                onChange={(e) => setImageConsent(e.target.checked)}
                required
              />
              <span className="text-sm text-[#3a322c] leading-snug">
                Li e aceito o{" "}
                <Link
                  href={LOOK_IMAGE_CONSENT_PATH}
                  target="_blank"
                  className="underline text-[#a85f64] font-medium"
                >
                  Termo de consentimento de imagem
                </Link>{" "}
                (versão {LOOK_IMAGE_CONSENT_VERSION}). Autorizo o uso desta foto
                pela Majesté conforme o termo.
              </span>
            </label>

            {err ? <p className="text-sm text-red-700">{err}</p> : null}
            {msg ? (
              <p className="text-sm text-[#5a7a4a] bg-[#eef5ea] border border-[#c5d9bc] px-3 py-2">
                {msg}
              </p>
            ) : null}

            <button
              type="submit"
              className="btn btn-primary w-full sm:w-auto"
              disabled={busy || !imageConsent}
            >
              {busy ? "Enviando…" : "Quero ser Influence — enviar look"}
            </button>
          </form>

          <p className="text-xs text-[#8a7468] mt-4">
            Looks aprovados entram na{" "}
            <Link href="/looks" className="underline text-[#a85f64]">
              Galeria Majesté
            </Link>{" "}
            — vitrine pública para quem te segue e para novas clientes.
          </p>
        </div>

        <aside className="space-y-6">
          <div className="border border-[#2a2420]/10 bg-white p-5 sticky top-4">
            <div className="flex items-start gap-3 mb-3">
              <span className="inline-flex h-9 w-9 items-center justify-center bg-[#faf7f3] text-[#a85f64] shrink-0">
                <FileCheck2 size={18} strokeWidth={1.5} />
              </span>
              <div>
                <h3
                  className="text-lg text-[#2a2420]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Consentimento de imagem
                </h3>
                <p className="text-[11px] uppercase tracking-[0.14em] text-[#8a7468] mt-0.5">
                  Versão {LOOK_IMAGE_CONSENT_VERSION}
                </p>
              </div>
            </div>
            <p className="text-sm text-[#5c534c] leading-relaxed mb-4">
              {LOOK_IMAGE_CONSENT_SUMMARY}
            </p>
            <Link
              href={LOOK_IMAGE_CONSENT_PATH}
              target="_blank"
              className="text-sm underline text-[#a85f64] font-medium"
            >
              Ler termo completo
            </Link>

            {imageConsent ? (
              <div className="mt-4 border border-[#c5d9bc] bg-[#eef5ea] px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#4a6a3a]">
                  Pronto para assinar no envio
                </p>
                <p className="text-sm text-[#3a4a32] mt-1">
                  Checkbox marcado. Ao enviar o look, o aceite fica registrado
                  com data e versão do termo.
                </p>
              </div>
            ) : latestConsented?.imageConsentAcceptedAt ? (
              <div className="mt-4 border border-[#e8dfd4] bg-[#faf7f3] px-3 py-2.5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8a6a4a]">
                  Último aceite registrado
                </p>
                <p className="text-sm text-[#3a322c] mt-1">
                  Você já aceitou em{" "}
                  <strong>
                    {formatConsentDate(latestConsented.imageConsentAcceptedAt)}
                  </strong>
                  {latestConsented.imageConsentVersion
                    ? ` · termo ${latestConsented.imageConsentVersion}`
                    : ""}
                  . Cada novo look exige um novo aceite.
                </p>
              </div>
            ) : (
              <div className="mt-4 border border-dashed border-[#2a2420]/15 px-3 py-2.5">
                <p className="text-sm text-[#8a7468]">
                  Ainda sem aceite neste envio. Marque o checkbox no formulário
                  para continuar.
                </p>
              </div>
            )}
          </div>

          <div>
            <h2
              className="text-xl text-[#2a2420] mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Meus envios
            </h2>
            {items.length === 0 ? (
              <p className="text-sm text-[#5c534c]">
                Você ainda não enviou nenhum look.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {items.map((l) => {
                  const st = STATUS_UI[l.status] || STATUS_UI.PENDING;
                  const code = l.rewardCode || l.coupon?.code;
                  const used = l.rewardUsed || l.coupon?.used;
                  const copied = copiedId === l.id;
                  const consentLabel = formatConsentDate(
                    l.imageConsentAcceptedAt
                  );
                  return (
                    <article
                      key={l.id}
                      className="border border-[#2a2420]/08 bg-white overflow-hidden"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={l.imageUrl}
                        alt={l.caption || "Look"}
                        className="block w-full h-auto bg-[#ece6df]"
                      />
                      <div className="p-3 space-y-2">
                        <span
                          className={`inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 ${st.className}`}
                        >
                          {st.label}
                        </span>
                        {consentLabel ? (
                          <p className="text-[10px] text-[#4a6a3a] bg-[#e8f0e4] px-2 py-0.5 inline-block">
                            Aceito · {consentLabel}
                            {l.imageConsentVersion
                              ? ` · ${l.imageConsentVersion}`
                              : ""}
                          </p>
                        ) : (
                          <p className="text-[10px] text-[#8a7468]">
                            Sem registro de consentimento
                          </p>
                        )}
                        {l.productName ? (
                          <p className="text-xs text-[#8a7468]">{l.productName}</p>
                        ) : null}
                        {l.caption ? (
                          <p className="text-xs text-[#3a322c] leading-relaxed whitespace-pre-wrap">
                            {l.caption}
                          </p>
                        ) : null}
                        {code ? (
                          <div className="space-y-1.5">
                            <p className="text-xs font-semibold text-[#a85f64]">
                              Cupom {code} · −{l.rewardPercent}%
                              {used ? " (usado)" : ""}
                            </p>
                            {!used ? (
                              <button
                                type="button"
                                onClick={() => copyCoupon(code, l.id)}
                                className="inline-flex w-full items-center justify-center gap-1.5 border border-[#a85f64]/40 bg-[#a85f64]/08 px-2 py-1.5 text-[11px] uppercase tracking-wider text-[#8a4a4f] hover:bg-[#a85f64]/15"
                              >
                                {copied ? (
                                  <>
                                    <Check size={13} /> Copiado
                                  </>
                                ) : (
                                  <>
                                    <Copy size={13} /> Copiar cupom
                                  </>
                                )}
                              </button>
                            ) : null}
                          </div>
                        ) : l.status === "PENDING" ? (
                          <p className="text-[11px] text-[#8a7468]">
                            Cupom chega após aprovação
                          </p>
                        ) : null}
                        {l.status === "PENDING" || l.status === "REJECTED" ? (
                          <button
                            type="button"
                            className="text-xs text-red-700 hover:underline"
                            onClick={() => remove(l.id)}
                          >
                            Remover
                          </button>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
