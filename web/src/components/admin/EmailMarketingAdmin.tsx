"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { HelpTip } from "@/components/admin/HelpTip";
import {
  EmailCampaignPreview,
  IG_FORMATS,
  InstagramArtPreview,
  type IgFormat,
} from "@/components/admin/MarketingPreviews";
import {
  absoluteSiteUrl,
  downloadEmailHtmlArt,
  downloadInstagramPngArt,
} from "@/lib/marketing-download";

type Contact = {
  email: string;
  name: string | null;
  sources: ("newsletter" | "cadastro")[];
};

type Creative = {
  id: string;
  title: string;
  channel: "EMAIL" | "INSTAGRAM";
  format: string;
  subject: string | null;
  body: string | null;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  hashtags: string | null;
  status: string;
  sentAt: string | null;
  sentCount: number;
  createdAt: string;
};

type Stats = { unique: number; newsletter: number; cadastro: number };
type Tab = "contatos" | "email" | "instagram";

const FIELD_HELP = {
  title:
    "Nome interno da arte e título que aparece na peça (e-mail ou Instagram).",
  subject:
    "Linha de assunto da caixa de entrada. Se ficar vazio, usamos o título.",
  bodyEmail:
    "Texto do e-mail. Use Enter para quebrar linhas. Evite blocos muito longos.",
  bodyIg:
    "Legenda / texto sobre a arte. Nos Stories aparece na parte de baixo da prévia.",
  image:
    "Cole o link do produto da loja para carregar as fotos e escolher qual usar. Também pode enviar uma imagem avulsa.",
  productLink:
    "Cole o endereço da página do produto (ex.: https://equilibra.tech/produto/conjunto-gisele). As fotos dele aparecem para você escolher.",
  ctaLabel:
    "Texto do botão clicável (ex.: Ver coleção, Comprar agora, Saiba mais).",
  ctaHref:
    "Preenchido automaticamente ao carregar o produto. Pode editar se quiser outro destino.",
  hashtags:
    "Hashtags da legenda do Instagram. Copie junto com o texto ao publicar.",
  format:
    "Escolha o tamanho oficial do Instagram. Stories e Reels usam 1080×1920 (9:16).",
  send:
    "Envios usam o Gmail da loja (Josianesantosmajeste@gmail.com) via SMTP. Sem Senha de app configurada no servidor, use a prévia e baixe/copie a arte.",
};

export function EmailMarketingAdmin() {
  const [tab, setTab] = useState<Tab>("contatos");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [creatives, setCreatives] = useState<Creative[]>([]);
  const [stats, setStats] = useState<Stats>({
    unique: 0,
    newsletter: 0,
    cadastro: 0,
  });
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);

  const [channel, setChannel] = useState<"EMAIL" | "INSTAGRAM">("EMAIL");
  const [igFormat, setIgFormat] = useState<IgFormat>("IG_STORY");
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [ctaLabel, setCtaLabel] = useState("Ver coleção");
  const [ctaHref, setCtaHref] = useState("/");
  const [hashtags, setHashtags] = useState("#majesté #fitness #modafitness");
  const [showLogo, setShowLogo] = useState(false);
  const [productLink, setProductLink] = useState("");
  const [productImages, setProductImages] = useState<
    { id: string; url: string; alt: string | null }[]
  >([]);
  const [productMeta, setProductMeta] = useState<{
    name: string;
    price: string;
    focusColor: string | null;
  } | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(false);

  const emailArts = useMemo(
    () => creatives.filter((c) => c.channel === "EMAIL"),
    [creatives]
  );
  const igArts = useMemo(
    () => creatives.filter((c) => c.channel === "INSTAGRAM"),
    [creatives]
  );
  const previewCreative = creatives.find((c) => c.id === previewId) || null;

  async function reload() {
    setLoading(true);
    const res = await fetch("/api/admin/marketing");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMsg(data.error || "Falha ao carregar");
      return;
    }
    setContacts(data.contacts || []);
    setCreatives(data.creatives || []);
    setStats(data.stats || { unique: 0, newsletter: 0, cadastro: 0 });
  }

  useEffect(() => {
    reload();
  }, []);

  function resetForm(next: "EMAIL" | "INSTAGRAM") {
    setChannel(next);
    setTitle(next === "EMAIL" ? "Novidades Majesté" : "Look da semana");
    setSubject("");
    setBody(
      next === "EMAIL"
        ? "Acabaram de chegar peças novas. Parcele em 2x sem juros ou ganhe 5% no Pix."
        : "Performance e presença no mesmo look. Toque no botão e confira na loja."
    );
    setImageUrl("");
    setCtaLabel(next === "EMAIL" ? "Ver coleção" : "Comprar agora");
    setCtaHref("/");
    setHashtags("#majesté #fitness #modafitness");
    setIgFormat("IG_STORY");
    setProductLink("");
    setProductImages([]);
    setProductMeta(null);
  }

  async function loadProductFromLink(link?: string) {
    const raw = (link ?? productLink).trim();
    if (!raw) {
      alert("Cole o link do produto da loja");
      return;
    }
    setLoadingProduct(true);
    setMsg("");
    const res = await fetch(
      `/api/admin/marketing/product-from-url?url=${encodeURIComponent(raw)}`
    );
    const data = await res.json().catch(() => ({}));
    setLoadingProduct(false);
    if (!res.ok) {
      alert(data.error || "Não foi possível carregar o produto");
      return;
    }

    const imgs = (data.images || []) as {
      id: string;
      url: string;
      alt: string | null;
    }[];
    setProductImages(imgs);
    setProductMeta({
      name: data.name,
      price: data.price,
      focusColor: data.focusColor,
    });
    setProductLink(data.absoluteHref || raw);
    setTitle(data.name || title);
    if (channel === "EMAIL") {
      setSubject(data.name || subject);
      setBody(
        `${data.name} — ${data.price}. Parcele em 2x sem juros ou ganhe 5% no Pix.`
      );
      setCtaLabel("Ver produto");
    } else {
      setBody(
        `${data.name} — ${data.price}. Toque no botão e confira na loja.`
      );
      setCtaLabel("Comprar agora");
    }
    setCtaHref(data.href || `/produto/${data.slug}`);
    if (imgs[0]?.url) {
      setImageUrl(imgs[0].url);
    }
    setMsg(
      imgs.length > 1
        ? `${data.name}: ${imgs.length} fotos — escolha a da arte`
        : `${data.name} carregado`
    );
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setBusy(true);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/admin/media", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(data.error || "Falha no upload");
      return;
    }
    setImageUrl(data.url || data.thumbUrl || "");
    setMsg("Imagem enviada — veja a prévia ao lado");
  }

  async function saveCreative(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      alert("Informe o título");
      return;
    }
    setBusy(true);
    const res = await fetch("/api/admin/marketing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        channel,
        format: channel === "EMAIL" ? "EMAIL" : igFormat,
        subject: channel === "EMAIL" ? subject || title : null,
        body: body.trim() || null,
        imageUrl: imageUrl || null,
        ctaLabel: ctaLabel || null,
        ctaHref: channel === "EMAIL" || ctaLabel ? ctaHref || null : null,
        hashtags: channel === "INSTAGRAM" ? hashtags || null : null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(data.error || "Falha ao salvar");
      return;
    }
    setMsg("Arte salva — clique em Visualizar na lista para ver de novo");
    setPreviewId(data.id || null);
    await reload();
  }

  async function removeCreative(id: string) {
    if (!confirm("Excluir esta arte?")) return;
    setBusy(true);
    await fetch(`/api/admin/marketing/${id}`, { method: "DELETE" });
    setBusy(false);
    if (previewId === id) setPreviewId(null);
    await reload();
  }

  async function sendCreative(id: string, testOnly = false) {
    const confirmMsg = testOnly
      ? "Enviar e-mail de teste para o seu usuário admin?"
      : `Enviar campanha para ${stats.unique} contato(s) únicos?`;
    if (!confirm(confirmMsg)) return;
    setBusy(true);
    setMsg("");
    const res = await fetch(`/api/admin/marketing/${id}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testOnly }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      alert(
        data.error ||
          "Falta Senha de app do Gmail no servidor. Enquanto isso, use a prévia e copie a arte."
      );
      return;
    }
    setMsg(
      testOnly
        ? "E-mail de teste enviado"
        : `Campanha enviada: ${data.sent}/${data.total}`
    );
    await reload();
  }

  function copyCaption(c: Creative) {
    const link = absoluteSiteUrl(c.ctaHref || "/");
    const text = [c.body || c.title, link, c.hashtags || ""]
      .filter(Boolean)
      .join("\n\n");
    navigator.clipboard.writeText(text);
    setMsg("Legenda + link copiados — cole no Instagram");
  }

  function copyLinkOnly(href?: string | null) {
    const link = absoluteSiteUrl(href || ctaHref || "/");
    navigator.clipboard.writeText(link);
    setMsg("Link do produto copiado (use no sticker do Stories)");
  }

  async function downloadCurrent() {
    if (!imageUrl && tab === "instagram") {
      alert("Escolha uma foto do produto antes de baixar");
      return;
    }
    if (!ctaHref) {
      alert("Defina o link do botão (carregue o produto)");
      return;
    }
    setBusy(true);
    try {
      if (tab === "email") {
        downloadEmailHtmlArt({
          title,
          body,
          imageUrl,
          ctaLabel,
          ctaHref,
        });
        setMsg("HTML baixado — botão e imagem já abrem o produto");
      } else {
        const link = await downloadInstagramPngArt({
          format: igFormat,
          title,
          body,
          imageUrl,
          ctaLabel,
          ctaHref,
          hashtags,
          showLogo,
        });
        setMsg(
          `PNG baixado. Link copiado — no Stories use o sticker de link com “${ctaLabel || "Comprar agora"}”.`
        );
        await navigator.clipboard.writeText(link).catch(() => undefined);
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Falha ao baixar a arte");
    } finally {
      setBusy(false);
    }
  }

  async function downloadSaved(c: Creative) {
    if (!c.imageUrl && c.channel === "INSTAGRAM") {
      alert("Esta arte não tem imagem");
      return;
    }
    setBusy(true);
    try {
      if (c.channel === "EMAIL") {
        downloadEmailHtmlArt({
          title: c.title,
          body: c.body || "",
          imageUrl: c.imageUrl || "",
          ctaLabel: c.ctaLabel || "Ver produto",
          ctaHref: c.ctaHref || "/",
        });
        setMsg("HTML da arte baixado");
      } else {
        const format = (
          ["IG_FEED", "IG_PORTRAIT", "IG_STORY", "IG_REELS"].includes(c.format)
            ? c.format
            : "IG_STORY"
        ) as IgFormat;
        const link = await downloadInstagramPngArt({
          format,
          title: c.title,
          body: c.body || "",
          imageUrl: c.imageUrl || "",
          ctaLabel: c.ctaLabel || "Ver produto",
          ctaHref: c.ctaHref || "/",
          hashtags: c.hashtags || undefined,
          showLogo,
        });
        await navigator.clipboard.writeText(link).catch(() => undefined);
        setMsg(
          `PNG baixado. Link copiado — cole no sticker “${c.ctaLabel || "Comprar agora"}”.`
        );
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : "Falha ao baixar");
    } finally {
      setBusy(false);
    }
  }

  function exportContacts() {
    const lines = ["email,nome,origem"];
    for (const c of contacts) {
      lines.push(
        `"${c.email}","${(c.name || "").replace(/"/g, '""')}","${c.sources.join("+")}"`
      );
    }
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "contatos-majeste.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "contatos", label: "Contatos" },
    { id: "email", label: "Artes de e-mail" },
    { id: "instagram", label: "Artes Instagram" },
  ];

  return (
    <div className="space-y-6">
      <div className="border border-[#e8d9a8] bg-[#fbf6eb] p-4 space-y-2">
        <button
          type="button"
          className="flex w-full items-center justify-between text-left"
          onClick={() => setGuideOpen((v) => !v)}
        >
          <span className="text-sm font-medium text-[#2a2420]">
            Como usar este painel
          </span>
          <span className="text-xs text-[#9a782f]">
            {guideOpen ? "Ocultar" : "Abrir"}
          </span>
        </button>
        {guideOpen ? (
          <ol className="text-sm text-[#5c534c] space-y-1.5 list-decimal pl-5 leading-relaxed">
            <li>
              Monte a arte nos campos (passe o mouse no{" "}
              <strong className="text-[#9a782f]">?</strong> de cada um).
            </li>
            <li>
              Cole o <strong>link do produto</strong> da loja — as fotos
              aparecem para você escolher (se tiver várias, clique na desejada).
            </li>
            <li>
              Veja a <strong>prévia ao vivo</strong> — não precisa de e-mail
              configurado para visualizar.
            </li>
            <li>
              Salve a arte. Depois use <strong>Visualizar</strong> na lista.
            </li>
            <li>
              Clique em <strong>Baixar arte</strong>: e-mail gera HTML com
              botão clicável; Instagram gera PNG limpo e copia o link para você
              colar no sticker “Comprar agora” do Stories.
            </li>
            <li>
              E-mail em massa: quando a Senha de app do Gmail estiver no
              servidor, use Teste /
              Enviar para todos.{" "}
              <HelpTip text={FIELD_HELP.send} />
            </li>
          </ol>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-[#6b5f56]">
            Contatos únicos
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {stats.unique}
          </p>
        </div>
        <div className="border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-[#6b5f56]">
            Newsletter (home)
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {stats.newsletter}
          </p>
        </div>
        <div className="border border-black/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wider text-[#6b5f56]">
            Cadastros na loja
          </p>
          <p className="text-2xl font-semibold tabular-nums mt-1">
            {stats.cadastro}
          </p>
        </div>
      </div>

      {msg ? <p className="text-sm text-[#2e7d32]">{msg}</p> : null}

      <div className="flex flex-wrap gap-2 border-b border-black/10 pb-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              if (t.id === "email") resetForm("EMAIL");
              if (t.id === "instagram") resetForm("INSTAGRAM");
              setPreviewId(null);
            }}
            className={`px-3 py-2 text-sm ${
              tab === t.id
                ? "bg-[#2a2420] text-white"
                : "bg-white border border-black/15 text-[#2a2420]"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="text-sm text-[#6b5f56]">Carregando…</p>
      ) : null}

      {tab === "contatos" && !loading && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#6b5f56]">
              Lista unificada sem duplicatas (newsletter + cadastro).
            </p>
            <button
              type="button"
              className="btn btn-outline !py-2"
              onClick={exportContacts}
              disabled={!contacts.length}
            >
              Exportar CSV
            </button>
          </div>
          <div className="border border-black/10 bg-white overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#e5dfd6] text-left text-xs uppercase tracking-wider text-[#6b5f56]">
                  <th className="px-3 py-3">E-mail</th>
                  <th className="px-3 py-3">Nome</th>
                  <th className="px-3 py-3">Origem</th>
                </tr>
              </thead>
              <tbody>
                {contacts.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-3 py-8 text-center text-[#6b5f56]"
                    >
                      Nenhum contato ainda.
                    </td>
                  </tr>
                )}
                {contacts.map((c) => (
                  <tr key={c.email} className="border-b border-[#f0ebe4]">
                    <td className="px-3 py-2.5">{c.email}</td>
                    <td className="px-3 py-2.5">{c.name || "—"}</td>
                    <td className="px-3 py-2.5 text-xs">
                      {c.sources
                        .map((s) =>
                          s === "newsletter" ? "Newsletter" : "Cadastro"
                        )
                        .join(" + ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {(tab === "email" || tab === "instagram") && !loading && (
        <div className="grid gap-6 xl:grid-cols-2">
          <form
            onSubmit={saveCreative}
            className="border border-black/10 bg-white p-5 space-y-3 order-2 xl:order-1"
          >
            <h2 className="text-lg font-medium text-[#2a2420]">
              {tab === "email"
                ? "Criar arte de e-mail"
                : "Criar arte Instagram"}
            </h2>

            {tab === "instagram" && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted">
                  Formato oficial
                  <HelpTip text={FIELD_HELP.format} />
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {IG_FORMATS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setIgFormat(f.id)}
                      className={`text-left border px-2.5 py-2 ${
                        igFormat === f.id
                          ? "border-[#2a2420] bg-[#f7f1ea]"
                          : "border-black/15 bg-white"
                      }`}
                    >
                      <span className="block text-sm font-medium">
                        {f.label}
                      </span>
                      <span className="text-[10px] text-[#6b5f56] tabular-nums">
                        {f.size}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <label className="block text-xs uppercase tracking-wider text-muted">
              Título
              <HelpTip text={FIELD_HELP.title} />
              <input
                className="input mt-1"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </label>

            {tab === "email" && (
              <label className="block text-xs uppercase tracking-wider text-muted">
                Assunto do e-mail
                <HelpTip text={FIELD_HELP.subject} />
                <input
                  className="input mt-1"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Se vazio, usa o título"
                />
              </label>
            )}

            <label className="block text-xs uppercase tracking-wider text-muted">
              {tab === "email" ? "Texto do e-mail" : "Legenda / texto na arte"}
              <HelpTip
                text={tab === "email" ? FIELD_HELP.bodyEmail : FIELD_HELP.bodyIg}
              />
              <textarea
                className="input mt-1 min-h-[88px]"
                value={body}
                onChange={(e) => setBody(e.target.value)}
              />
            </label>

            {tab === "instagram" && (
              <label className="block text-xs uppercase tracking-wider text-muted">
                Hashtags
                <HelpTip text={FIELD_HELP.hashtags} />
                <input
                  className="input mt-1"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                />
              </label>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs uppercase tracking-wider text-muted">
                Texto do botão
                <HelpTip text={FIELD_HELP.ctaLabel} />
                <input
                  className="input mt-1"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Ver coleção"
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Link do botão
                <HelpTip text={FIELD_HELP.ctaHref} />
                <input
                  className="input mt-1"
                  value={ctaHref}
                  onChange={(e) => setCtaHref(e.target.value)}
                  placeholder="/"
                />
              </label>
            </div>

            <div className="space-y-2 border border-[#e8d9a8] bg-[#fbf6eb] p-3">
              <p className="text-xs uppercase tracking-wider text-muted">
                Link do produto da loja
                <HelpTip text={FIELD_HELP.productLink} />
              </p>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="input flex-1"
                  value={productLink}
                  onChange={(e) => setProductLink(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      loadProductFromLink();
                    }
                  }}
                  placeholder="https://equilibra.tech/produto/conjunto-gisele"
                />
                <button
                  type="button"
                  className="btn btn-outline !py-2 shrink-0"
                  disabled={loadingProduct || busy}
                  onClick={() => loadProductFromLink()}
                >
                  {loadingProduct ? "Buscando…" : "Buscar fotos"}
                </button>
              </div>
              {productMeta ? (
                <p className="text-xs text-[#5c534c]">
                  <strong>{productMeta.name}</strong> · {productMeta.price}
                  {productMeta.focusColor
                    ? ` · cor: ${productMeta.focusColor}`
                    : ""}
                </p>
              ) : null}
              {productImages.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[11px] text-[#6b5f56]">
                    {productImages.length === 1
                      ? "1 foto encontrada (já selecionada)"
                      : `Escolha a foto da arte (${productImages.length} disponíveis)`}
                  </p>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {productImages.map((img) => {
                      const selected = imageUrl === img.url;
                      return (
                        <button
                          key={img.id}
                          type="button"
                          title={img.alt || "Selecionar foto"}
                          onClick={() => {
                            setImageUrl(img.url);
                            setMsg("Foto selecionada — veja a prévia");
                          }}
                          className={`relative aspect-[3/4] overflow-hidden border-2 bg-white ${
                            selected
                              ? "border-[#a85f64] ring-1 ring-[#a85f64]"
                              : "border-black/10 hover:border-[#c2a45b]"
                          }`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img.url}
                            alt={img.alt || ""}
                            className="h-full w-full object-cover object-top"
                          />
                          {selected ? (
                            <span className="absolute bottom-1 left-1 right-1 bg-[#a85f64] text-white text-[9px] uppercase tracking-wide py-0.5 text-center">
                              Selecionada
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted">
                Imagem da arte
                <HelpTip text={FIELD_HELP.image} />
              </p>
              <input
                className="input"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="Preenchida ao escolher a foto do produto"
              />
              <label className="btn btn-outline !py-2 inline-flex cursor-pointer">
                Ou enviar imagem avulsa
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => onUpload(e.target.files?.[0] || null)}
                />
              </label>
            </div>

            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? "Salvando…" : "Salvar arte"}
            </button>
          </form>

          <div className="space-y-4 order-1 xl:order-2">
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <h2 className="text-lg font-medium text-[#2a2420]">
                  Prévia ao vivo
                </h2>
                <div className="flex flex-wrap gap-2">
                  {tab === "instagram" ? (
                    <button
                      type="button"
                      className={`btn !py-2 !text-xs ${
                        showLogo ? "btn-primary" : "btn-outline"
                      }`}
                      onClick={() => setShowLogo((v) => !v)}
                      title="Mostrar ou ocultar a logo Majesté no topo da arte"
                    >
                      {showLogo ? "Com logo" : "Sem logo"}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="btn btn-primary !py-2 !text-xs"
                    disabled={busy}
                    onClick={downloadCurrent}
                  >
                    Baixar arte
                  </button>
                  {tab === "instagram" ? (
                    <button
                      type="button"
                      className="btn btn-outline !py-2 !text-xs"
                      onClick={() => copyLinkOnly()}
                    >
                      Copiar link
                    </button>
                  ) : null}
                </div>
              </div>
              {tab === "email" ? (
                <EmailCampaignPreview
                  title={title}
                  body={body}
                  imageUrl={imageUrl}
                  ctaLabel={ctaLabel}
                  ctaHref={ctaHref}
                />
              ) : (
                <InstagramArtPreview
                  format={igFormat}
                  title={title}
                  body={body}
                  imageUrl={imageUrl}
                  ctaLabel={ctaLabel}
                  ctaHref={ctaHref}
                  hashtags={hashtags}
                  showLogo={showLogo}
                />
              )}
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-medium text-[#2a2420]">
                Artes salvas
              </h2>
              {(tab === "email" ? emailArts : igArts).length === 0 && (
                <p className="text-sm text-[#6b5f56]">
                  Nenhuma arte ainda. Preencha ao lado e salve — a prévia já
                  mostra o exemplo.
                </p>
              )}
              {(tab === "email" ? emailArts : igArts).map((c) => (
                <article
                  key={c.id}
                  className="border border-black/10 bg-white p-3 flex gap-3"
                >
                  {c.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={c.imageUrl}
                      alt=""
                      className="h-20 w-16 object-cover border border-black/10 shrink-0"
                    />
                  ) : (
                    <div className="h-20 w-16 bg-[#f4f1ec] shrink-0" />
                  )}
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="font-medium text-[#2a2420] truncate">
                      {c.title}
                    </p>
                    <p className="text-[11px] text-[#6b5f56]">
                      {c.format !== "EMAIL" ? `${c.format} · ` : ""}
                      {c.status}
                      {c.sentAt ? ` · enviado (${c.sentCount})` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        className="text-xs underline"
                        onClick={() => setPreviewId(c.id)}
                      >
                        Visualizar
                      </button>
                      <button
                        type="button"
                        className="text-xs underline font-medium"
                        disabled={busy}
                        onClick={() => downloadSaved(c)}
                      >
                        Baixar
                      </button>
                      {tab === "email" ? (
                        <>
                          <button
                            type="button"
                            className="text-xs underline"
                            disabled={busy}
                            onClick={() => sendCreative(c.id, true)}
                          >
                            Teste
                          </button>
                          <button
                            type="button"
                            className="text-xs underline text-[#a85f64]"
                            disabled={busy}
                            onClick={() => sendCreative(c.id, false)}
                          >
                            Enviar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="text-xs underline"
                            onClick={() => copyCaption(c)}
                          >
                            Copiar legenda+link
                          </button>
                          <button
                            type="button"
                            className="text-xs underline"
                            onClick={() => copyLinkOnly(c.ctaHref)}
                          >
                            Copiar link
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className="text-xs text-red-700 underline"
                        disabled={busy}
                        onClick={() => removeCreative(c.id)}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

      {previewCreative ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setPreviewId(null)}
        >
          <div
            className="max-h-[92vh] w-full max-w-lg overflow-y-auto bg-[#f4f1ec] p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium">Visualizar arte salva</p>
              <button
                type="button"
                className="text-xs underline"
                onClick={() => setPreviewId(null)}
              >
                Fechar
              </button>
            </div>
            {previewCreative.channel === "EMAIL" ? (
              <EmailCampaignPreview
                title={previewCreative.title}
                body={previewCreative.body || ""}
                imageUrl={previewCreative.imageUrl || ""}
                ctaLabel={previewCreative.ctaLabel || ""}
                ctaHref={previewCreative.ctaHref || ""}
              />
            ) : (
              <InstagramArtPreview
                format={
                  (["IG_FEED", "IG_PORTRAIT", "IG_STORY", "IG_REELS"].includes(
                    previewCreative.format
                  )
                    ? previewCreative.format
                    : "IG_STORY") as IgFormat
                }
                title={previewCreative.title}
                body={previewCreative.body || ""}
                imageUrl={previewCreative.imageUrl || ""}
                ctaLabel={previewCreative.ctaLabel || ""}
                ctaHref={previewCreative.ctaHref || ""}
                hashtags={previewCreative.hashtags || ""}
                showLogo={showLogo}
              />
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
