"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent,
} from "react";
import Link from "next/link";
import { Tag } from "lucide-react";
import { BannerTextToolbar } from "@/components/admin/BannerTextToolbar";
import {
  cssFromCtaButton,
  cssFromLayer,
  getLayerStyle,
  parseTextStyle,
  renderLayerText,
  runsForText,
  type BannerTextStyle,
  type TextLayerKey,
  type TextSelection,
} from "@/lib/banner-text";
import {
  cutoutFromUrl,
  normalizeCutoutFromUrl,
} from "@/lib/cutout-client";
import {
  addCutoutUrl,
  parseCutoutLayers,
  redistributeCutouts,
  replaceCutoutUrl as replaceLayerUrl,
  type CutoutLayer,
} from "@/lib/cutout-layout";
import {
  MediaGallery,
  type MediaBank,
} from "@/components/admin/MediaGallery";
import {
  BANNER_VIDEO_MAX,
  clampVideoSeconds,
  getClipFrame,
  isAnimatedImageCutout,
  isCutoutVideoUrl,
  parseBannerVideos,
  parseVideoLayout,
  type BannerVideoClip,
  type BannerVideoLayout,
} from "@/lib/banner-videos";
import { BannerCanvaPanel } from "@/components/admin/BannerCanvaPanel";
import { cutoutVideoFromUrl } from "@/lib/video-cutout-client";

type MediaItem = {
  id: string;
  url: string;
  thumbUrl: string;
  alt: string | null;
  source: string;
};

type Banner = {
  id: string;
  title: string;
  subtitle: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  imageUrl: string;
  textAlign: string;
  overlay: number;
  layout: string;
  bgColor: string;
  panelColor: string;
  highlight: string | null;
  promoText: string | null;
  couponCode: string | null;
  tagline: string | null;
  bannerSize: string;
  imageFit: string;
  focalX: number;
  focalY: number;
  imageZoom: number;
  textStyle: BannerTextStyle;
  cutoutImages: CutoutLayer[];
  videoUrl: string | null;
  videoSeconds: number | null;
  videoPlaylist: BannerVideoClip[];
  videoLayout: BannerVideoLayout;
  active: boolean;
};

type VideoBankItem = {
  id: string;
  url: string;
  thumbUrl: string | null;
  title: string | null;
  durationSec: number | null;
  kind?: string;
};

type Props = { bannerId: string };

/** Todas as cores — fundo (banner/vídeo) e painel promo. */
const COLOR_PRESETS = [
  { label: "Areia", value: "#f0e8df" },
  { label: "Champagne", value: "#f5efe6" },
  { label: "Nude", value: "#ebe0d4" },
  { label: "Pérola", value: "#f7f3ee" },
  { label: "Marinho", value: "#1a2744" },
  { label: "Café", value: "#3d2e28" },
  { label: "Rose", value: "#8a5a5e" },
  { label: "Preto", value: "#1a1a1a" },
];

const LAYOUTS = [
  {
    id: "cutouts",
    label: "Modelos + fundo marca",
    tip: "Modelos recortadas ou vídeo sobre cor de fundo",
  },
  {
    id: "studio",
    label: "Estúdio",
    tip: "Texto + foto ou vídeo com cor de fundo",
  },
  {
    id: "promo",
    label: "Promoção / cupom",
    tip: "Painel de desconto + foto ou vídeo",
  },
  {
    id: "overlay",
    label: "Texto na foto",
    tip: "Texto centrado sobre foto ou vídeo",
  },
  {
    id: "fullbleed",
    label: "Foto / vídeo cheio",
    tip: "Mídia em tela cheia (foto ou vídeo)",
  },
] as const;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function mediaStyle(b: Banner): CSSProperties {
  const fit = b.imageFit === "cover" ? "cover" : "contain";
  return {
    objectFit: fit,
    objectPosition:
      fit === "contain" ? `${b.focalX}% bottom` : `${b.focalX}% ${b.focalY}%`,
    transform: `scale(${b.imageZoom})`,
    transformOrigin: `${b.focalX}% ${b.focalY}%`,
  };
}

/**
 * Mesmo enquadramento da loja (BannerCarousel.videoClipStyle):
 * cutout → contain + fundo transparente; cover/contain conforme imageFit.
 */
function adminVideoClipStyle(
  clip: BannerVideoClip,
  b: Banner
): CSSProperties {
  const cutout = Boolean(clip.cutout || isCutoutVideoUrl(clip.url));
  const fit = cutout || b.imageFit === "contain" ? "contain" : "cover";
  const frame = getClipFrame(clip, b);
  const panX = ((50 - frame.focalX) / 50) * 32;
  const panY = ((50 - frame.focalY) / 50) * 32;
  return {
    objectFit: fit,
    objectPosition:
      fit === "cover"
        ? `${frame.focalX}% ${frame.focalY}%`
        : "center center",
    transform: `translate(${panX}%, ${panY}%) scale(${frame.zoom})`,
    transformOrigin: "center center",
    pointerEvents: "none",
    background: cutout ? "transparent" : undefined,
  };
}

function sizeClass(size: string) {
  if (size === "compact") return "banner-frame--size-compact";
  if (size === "normal") return "banner-frame--size-normal";
  return "banner-frame--size-tall";
}

function ColorPresetSwatches({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {COLOR_PRESETS.map((p) => (
          <button
            key={p.value}
            type="button"
            title={p.label}
            onClick={() => onChange(p.value)}
            className={`h-8 w-8 border-2 ${
              value.toLowerCase() === p.value.toLowerCase()
                ? "border-ink"
                : "border-black/10"
            }`}
            style={{ background: p.value }}
          />
        ))}
      </div>
    </div>
  );
}

export function BannerEditor({ bannerId }: Props) {
  const [banner, setBanner] = useState<Banner | null>(null);
  const [library, setLibrary] = useState<MediaItem[]>([]);
  const [mediaBank, setMediaBank] = useState<MediaBank>("cutout");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(true);
  const [q, setQ] = useState("");
  const [activeLayer, setActiveLayer] = useState<TextLayerKey>("highlight");
  const [textSelection, setTextSelection] = useState<TextSelection | null>(
    null
  );
  const [cutoutBusy, setCutoutBusy] = useState(false);
  const [cutoutMsg, setCutoutMsg] = useState("");
  const [selectedCutout, setSelectedCutout] = useState<string | null>(null);
  const [videoBank, setVideoBank] = useState<VideoBankItem[]>([]);
  const [videoCutoutBank, setVideoCutoutBank] = useState<VideoBankItem[]>([]);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoMsg, setVideoMsg] = useState("");
  const drag = useRef<{ x: number; y: number; clipIndex: number } | null>(
    null
  );
  const cutoutDrag = useRef<{
    url: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
    rectW: number;
    rectH: number;
  } | null>(null);
  const cutoutsStageRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    (async () => {
      const [bRes, mRes, vRes, vcRes] = await Promise.all([
        fetch("/api/admin/banners"),
        fetch("/api/admin/media?source=cutout,upload&includeProducts=1"),
        fetch("/api/admin/video-bank"),
        fetch("/api/admin/video-cutout-bank"),
      ]);
      const banners: Banner[] = await bRes.json();
      const media = await mRes.json();
      const found = banners.find((b) => b.id === bannerId);
      if (found) {
        const layout = found.layout || "studio";
        setBanner({
          ...found,
          layout,
          bgColor: found.bgColor || "#f0e8df",
          panelColor: found.panelColor || "#1a2744",
          highlight: found.highlight ?? null,
          promoText: found.promoText ?? null,
          couponCode: found.couponCode ?? null,
          tagline: found.tagline ?? null,
          bannerSize: found.bannerSize || "tall",
          imageFit: found.imageFit === "cover" ? "cover" : "contain",
          focalX: found.focalX ?? 50,
          focalY: found.focalY ?? 50,
          imageZoom: found.imageZoom ?? 1,
          overlay: found.overlay ?? 0,
          textStyle: parseTextStyle(found.textStyle),
          cutoutImages: parseCutoutLayers(
            (found as { cutoutImages?: unknown }).cutoutImages
          ),
          videoPlaylist: parseBannerVideos(
            (found as { videoPlaylist?: unknown }).videoPlaylist,
            found.videoUrl,
            found.videoSeconds
          ),
          videoLayout: parseVideoLayout(
            (found as { videoLayout?: unknown }).videoLayout
          ),
          videoUrl: found.videoUrl ?? null,
          videoSeconds: found.videoSeconds ?? 8,
        });
        setMediaBank(layout === "cutouts" ? "cutout" : "upload");
      }
      setLibrary(media.library || []);
      if (vRes.ok) {
        const vData = await vRes.json();
        setVideoBank(vData.videos || []);
      }
      if (vcRes.ok) {
        const vcData = await vcRes.json();
        setVideoCutoutBank(vcData.videos || []);
      }
    })();
  }, [bannerId]);

  async function save() {
    if (!banner) return;
    setSaving(true);
    setVideoMsg("");
    const playlist = banner.videoPlaylist || [];
    const payload = {
      ...banner,
      active: true,
      videoPlaylist: playlist,
      videoUrl: playlist[0]?.url ?? null,
      videoSeconds: playlist[0]?.seconds ?? null,
    };
    try {
      const res = await fetch("/api/admin/banners", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setVideoMsg(
          (err as { error?: string }).error ||
            "Falha ao salvar. Tente de novo."
        );
        setSaving(false);
        return;
      }
      setBanner({ ...banner, active: true, videoPlaylist: playlist });
      setSaved(true);
      setVideoMsg(
        playlist.length
          ? `Publicado na home com ${playlist.length} vídeo(s).`
          : "Banner publicado na home."
      );
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  }

  function setPlaylist(next: BannerVideoClip[], msg?: string) {
    setBanner((prev) => {
      if (!prev) return prev;
      const list = next.slice(0, BANNER_VIDEO_MAX);
      const addingFirst = (prev.videoPlaylist?.length || 0) === 0 && list.length > 0;
      return {
        ...prev,
        videoPlaylist: list,
        videoUrl: list[0]?.url ?? null,
        videoSeconds: list[0]?.seconds ?? null,
        active: list.length > 0 ? true : prev.active,
        // Corpo inteiro por padrão ao adicionar o 1º vídeo
        ...(addingFirst
          ? { imageFit: "contain", imageZoom: 1, focalX: 50, focalY: 50 }
          : {}),
      };
    });
    if (msg) setVideoMsg(msg);
  }

  async function replaceCutoutUrl(oldUrl: string, newUrl: string) {
    if (!banner) return;
    const list = replaceLayerUrl(banner.cutoutImages || [], oldUrl, newUrl);
    const imageUrl = banner.imageUrl === oldUrl ? newUrl : banner.imageUrl;
    setBanner({ ...banner, cutoutImages: list, imageUrl });
    if (selectedCutout === oldUrl) setSelectedCutout(newUrl);
    setLibrary((prev) => {
      if (prev.some((m) => m.url === newUrl)) return prev;
      return [
        {
          id: `cutout-${Date.now()}`,
          url: newUrl,
          thumbUrl: newUrl,
          alt: "Modelo recortada",
          source: "cutout",
        },
        ...prev,
      ];
    });
  }

  async function runCutoutOne(url: string) {
    setCutoutBusy(true);
    setCutoutMsg("Iniciando recorte da foto (só o corpo)…");
    try {
      const { url: next } = await cutoutFromUrl(url, setCutoutMsg);
      await replaceCutoutUrl(url, next);
      setCutoutMsg("Recorte pronto — salve o banner.");
    } catch (e) {
      setCutoutMsg(e instanceof Error ? e.message : "Falha no recorte");
    } finally {
      setCutoutBusy(false);
    }
  }

  async function runNormalizeSelected() {
    const url = selectedCutout;
    if (!url || !banner) {
      setCutoutMsg("Selecione uma modelo para padronizar o tamanho.");
      return;
    }
    setCutoutBusy(true);
    setCutoutMsg("Padronizando tamanho…");
    try {
      const { url: next } = await normalizeCutoutFromUrl(url);
      await replaceCutoutUrl(url, next);
      setCutoutMsg("Tamanho padronizado — salve o banner.");
    } catch (e) {
      setCutoutMsg(e instanceof Error ? e.message : "Falha ao padronizar");
    } finally {
      setCutoutBusy(false);
    }
  }

  function updateCutout(url: string, patch: Partial<CutoutLayer>) {
    setBanner((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        cutoutImages: (prev.cutoutImages || []).map((l) =>
          l.url === url ? { ...l, ...patch } : l
        ),
      };
    });
  }

  function onCutoutPointerDown(e: PointerEvent<HTMLDivElement>, layer: CutoutLayer) {
    e.preventDefault();
    e.stopPropagation();
    const stage = cutoutsStageRef.current;
    if (!stage) return;
    const rect = stage.getBoundingClientRect();
    setSelectedCutout(layer.url);
    cutoutDrag.current = {
      url: layer.url,
      startX: e.clientX,
      startY: e.clientY,
      origX: layer.x,
      origY: layer.y,
      rectW: rect.width,
      rectH: rect.height,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onCutoutPointerMove(e: PointerEvent<HTMLDivElement>) {
    const d = cutoutDrag.current;
    if (!d || !banner) return;
    const dx = ((e.clientX - d.startX) / d.rectW) * 100;
    const dy = ((d.startY - e.clientY) / d.rectH) * 100;
    updateCutout(d.url, {
      x: clamp(d.origX + dx, 5, 95),
      y: clamp(d.origY + dy, 0, 40),
    });
  }

  function onCutoutPointerUp() {
    cutoutDrag.current = null;
  }

  async function runCutoutSelected() {
    const url = selectedCutout;
    if (!url) {
      setCutoutMsg("Selecione uma modelo no preview (clique nela) para recortar.");
      return;
    }
    await runCutoutOne(url);
  }

  async function deleteMediaFromLibrary(id: string, url: string) {
    const res = await fetch(`/api/admin/media?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error || "Não foi possível excluir");
      return;
    }
    setLibrary((prev) => prev.filter((m) => m.id !== id));
    if (banner) {
      setBanner({
        ...banner,
        cutoutImages: (banner.cutoutImages || []).filter((l) => l.url !== url),
        imageUrl: banner.imageUrl === url ? "" : banner.imageUrl,
      });
    }
    if (selectedCutout === url) setSelectedCutout(null);
  }

  async function onUpload(files: File[]) {
    for (const file of files) {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("mode", mediaBank === "cutout" ? "cutout" : "upload");
      if (mediaBank === "cutout") fd.set("alt", "Modelo recortada");
      const res = await fetch("/api/admin/media", { method: "POST", body: fd });
      if (!res.ok) continue;
      const asset = await res.json();
      setLibrary((prev) => [
        {
          id: asset.id,
          url: asset.url,
          thumbUrl: asset.thumbUrl || asset.url,
          alt: asset.alt,
          source: mediaBank === "cutout" ? "cutout" : "upload",
        },
        ...prev,
      ]);
    }
  }

  async function uploadBannerVideo(file: File) {
    if (!banner) return;
    const max = 120 * 1024 * 1024;
    if (file.size > max) {
      setVideoMsg("Vídeo muito grande (máx. 120 MB).");
      return;
    }
    setVideoBusy(true);
    setVideoMsg(`Enviando ${file.name}…`);
    try {
      const title = file.name.replace(/\.[^.]+$/, "") || "Banner vídeo";
      const qs = `?title=${encodeURIComponent(title)}`;
      const res = await fetch(`/api/admin/video-bank${qs}`, {
        method: "POST",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
          "X-File-Name": encodeURIComponent(file.name),
        },
        body: file,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVideoMsg(
          (data as { error?: string }).error || "Falha no upload do vídeo"
        );
        return;
      }
      const asset = (data as { video?: VideoBankItem & { durationSec?: number | null } })
        .video;
      const url = String(asset?.url || "");
      if (!url) {
        setVideoMsg("Upload ok, mas sem URL do vídeo.");
        return;
      }
      const secs =
        typeof asset?.durationSec === "number" && asset.durationSec > 0
          ? Math.min(60, Math.max(2, Math.round(asset.durationSec)))
          : 8;
      setVideoBank((prev) => [
        {
          id: asset?.id || `v-${Date.now()}`,
          url,
          thumbUrl: asset?.thumbUrl || null,
          title: asset?.title || title,
          durationSec: asset?.durationSec ?? null,
        },
        ...prev.filter((v) => v.url !== url),
      ]);
      const playlist = banner.videoPlaylist || [];
      if (playlist.length >= BANNER_VIDEO_MAX) {
        setVideoMsg(`Máximo de ${BANNER_VIDEO_MAX} vídeos por banner.`);
        return;
      }
      setPlaylist(
        [...playlist, { url, seconds: secs, focalX: 50, focalY: 50, zoom: 1 }],
        `Vídeo ${playlist.length + 1} adicionado. Salve para publicar.`
      );
    } finally {
      setVideoBusy(false);
    }
  }

  async function cutoutPlaylistClip(index: number) {
    if (!banner) return;
    const clip = (banner.videoPlaylist || [])[index];
    if (!clip?.url) {
      setVideoMsg("Nenhum vídeo neste slot para recortar.");
      return;
    }
    if (clip.cutout || isCutoutVideoUrl(clip.url)) {
      setVideoMsg("Este vídeo já está no banco de vídeos recortados.");
      return;
    }
    setVideoBusy(true);
    setVideoMsg(
      "Recortando vídeo (só o corpo)… aguarde, a IA está processando."
    );
    try {
      const asset = await cutoutVideoFromUrl(clip.url, setVideoMsg, {
        title: `Banner recorte ${index + 1}`,
      });
      const url = asset.url;
      setVideoCutoutBank((prev) => [
        {
          id: asset.id,
          url,
          thumbUrl: asset.thumbUrl,
          title: asset.title,
          durationSec: asset.durationSec,
          kind: "cutout",
        },
        ...prev.filter((v) => v.url !== url),
      ]);
      setBanner((prev) => {
        if (!prev) return prev;
        const list = [...(prev.videoPlaylist || [])];
        if (!list[index]) return prev;
        list[index] = {
          ...list[index],
          url,
          cutout: true,
          seconds:
            asset.durationSec && asset.durationSec > 0
              ? clampVideoSeconds(asset.durationSec)
              : list[index].seconds,
        };
        return {
          ...prev,
          videoPlaylist: list,
          videoUrl: list[0]?.url ?? null,
          videoSeconds: list[0]?.seconds ?? null,
        };
      });
      setVideoMsg(
        "Pronto! Vídeo salvo no banco de vídeos recortados. Clique em Salvar e publicar."
      );
    } catch (e) {
      setVideoMsg(e instanceof Error ? e.message : "Falha ao recortar vídeo");
    } finally {
      setVideoBusy(false);
    }
  }

  function addClipFromBank(
    url: string,
    bank: VideoBankItem[],
    cutout: boolean
  ) {
    if (!banner || !url) return;
    const picked = bank.find((v) => v.url === url);
    const playlist = banner.videoPlaylist || [];
    if (playlist.some((c) => c.url === url)) {
      setVideoMsg("Este vídeo já está na lista.");
      return;
    }
    if (playlist.length >= BANNER_VIDEO_MAX) {
      setVideoMsg(`Máximo de ${BANNER_VIDEO_MAX} vídeos por banner.`);
      return;
    }
    setPlaylist(
      [
        ...playlist,
        {
          url,
          seconds:
            picked?.durationSec && picked.durationSec > 0
              ? clampVideoSeconds(picked.durationSec)
              : 8,
          focalX: 50,
          focalY: 50,
          zoom: 1,
          cutout: cutout || isCutoutVideoUrl(url) || undefined,
        },
      ],
      cutout
        ? "Vídeo recortado adicionado. Clique em Salvar e publicar."
        : "Vídeo adicionado. Clique em Salvar e publicar."
    );
  }

  function applyPromoExample() {
    if (!banner) return;
    setBanner({
      ...banner,
      layout: "promo",
      title: "Desconto",
      subtitle: "de boas-vindas",
      highlight: "10% off",
      promoText: "Na sua primeira compra, use o cupom",
      couponCode: "PRIMEIRACOMPRA",
      tagline: null,
      panelColor: "#1a2744",
      ctaLabel: "Comprar agora",
      ctaHref: "/categoria/conjunto-legging",
    });
  }

  function applyOverlayExample() {
    if (!banner) return;
    setBanner({
      ...banner,
      layout: "overlay",
      title: "detalhes.",
      subtitle: null,
      highlight: null,
      promoText:
        "Parcele em 3x sem juros ou ganhe 5% de desconto no PIX",
      couponCode: null,
      tagline: "Exclusividade",
      ctaLabel: "",
      ctaHref: "/categoria/conjunto-legging",
    });
  }

  function onVideoPointerDown(
    e: PointerEvent<HTMLDivElement>,
    clipIndex: number
  ) {
    if ((e.target as HTMLElement).closest("[data-no-pan]")) return;
    e.preventDefault();
    e.stopPropagation();
    drag.current = { x: e.clientX, y: e.clientY, clipIndex };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onVideoPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    e.preventDefault();
    const { clipIndex } = drag.current;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = { x: e.clientX, y: e.clientY, clipIndex };
    setBanner((prev) => {
      if (!prev) return prev;
      const list = [...(prev.videoPlaylist || [])];
      const clip = list[clipIndex];
      if (!clip) return prev;
      const frame = getClipFrame(clip, prev);
      const sens = 0.35 / Math.max(frame.zoom, 0.5);
      list[clipIndex] = {
        ...clip,
        focalX: clamp(frame.focalX - dx * sens, 0, 100),
        focalY: clamp(frame.focalY - dy * sens, 0, 100),
        zoom: frame.zoom,
      };
      // Mantém legado do banner alinhado ao 1º clipe
      const first = list[0];
      const firstFrame = first ? getClipFrame(first, prev) : null;
      return {
        ...prev,
        videoPlaylist: list,
        ...(clipIndex === 0 && firstFrame
          ? {
              focalX: firstFrame.focalX,
              focalY: firstFrame.focalY,
              imageZoom: firstFrame.zoom,
            }
          : null),
      };
    });
  }

  function onVideoPointerUp(e?: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("[data-no-pan]")) return;
    // Com vídeo limpo, o drag é por clipe (banner-video-drag-layer)
    if ((e.target as HTMLElement).closest(".banner-video-clean")) return;
    e.preventDefault();
    drag.current = { x: e.clientX, y: e.clientY, clipIndex: 0 };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return;
    // Se está arrastando clipe de vídeo, outro handler cuida
    if ((e.target as HTMLElement).closest(".banner-video-drag-layer")) return;
    e.preventDefault();
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    drag.current = {
      x: e.clientX,
      y: e.clientY,
      clipIndex: drag.current.clipIndex,
    };
    setBanner((prev) => {
      if (!prev) return prev;
      const sens = 0.35 / Math.max(prev.imageZoom, 0.5);
      return {
        ...prev,
        focalX: clamp(prev.focalX - dx * sens, 0, 100),
        focalY: clamp(prev.focalY - dy * sens, 0, 100),
      };
    });
  }

  function onPointerUp(e?: PointerEvent<HTMLDivElement>) {
    drag.current = null;
    if (e) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  if (!banner) {
    return <p className="text-muted">Carregando editor...</p>;
  }

  const current = banner;
  const layout = current.layout || "studio";

  function layerPlainText(key: TextLayerKey): string {
    if (key === "title") return current.title || "";
    if (key === "subtitle") return current.subtitle || "";
    if (key === "highlight") return current.highlight || "";
    if (key === "promo") return current.promoText || "";
    if (key === "tagline") return current.tagline || "";
    return current.ctaLabel || "";
  }

  function captureTextSelection(
    el: HTMLInputElement | HTMLTextAreaElement
  ) {
    setTextSelection({
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    });
  }

  function updateLayerText(key: TextLayerKey, value: string) {
    const layer = getLayerStyle(current.textStyle, key);
    const runs = runsForText(value, layer.runs);
    const textStyle: BannerTextStyle = {
      ...current.textStyle,
      [key]: {
        ...layer,
        runs: runs.length ? runs : undefined,
      },
    };
    if (key === "title") setBanner({ ...current, title: value, textStyle });
    else if (key === "subtitle")
      setBanner({ ...current, subtitle: value || null, textStyle });
    else if (key === "highlight")
      setBanner({ ...current, highlight: value || null, textStyle });
    else if (key === "promo")
      setBanner({ ...current, promoText: value || null, textStyle });
    else if (key === "tagline")
      setBanner({ ...current, tagline: value || null, textStyle });
    else if (key === "cta")
      setBanner({ ...current, ctaLabel: value || null, textStyle });
  }

  function focusLayer(key: TextLayerKey) {
    setActiveLayer(key);
  }

  return (
    <div className="space-y-4">
      {(cutoutBusy || videoBusy) && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4"
          role="alertdialog"
          aria-live="assertive"
          aria-busy="true"
        >
          <div className="w-full max-w-md border border-white/20 bg-[#1a1612] text-[#f4efe8] p-5 shadow-xl space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#c9a24a]">
              {videoBusy ? "Recorte de vídeo" : "Recorte de imagem"}
            </p>
            <p className="text-lg font-medium leading-snug">
              {videoBusy
                ? videoMsg || "Recortando vídeo (só o corpo)…"
                : cutoutMsg || "Recortando foto (só o corpo)…"}
            </p>
            <p className="text-sm text-white/70">
              Não feche esta página. A IA pode levar alguns minutos.
            </p>
            <div className="h-1.5 w-full overflow-hidden bg-white/15">
              <div className="h-full w-1/3 animate-pulse bg-[var(--rose)]" />
            </div>
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/banners" className="text-sm text-muted hover:text-ink">
            ← Banners
          </Link>
          <h1 className="text-2xl font-semibold mt-1">Editor de banner</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline !py-2 text-xs"
            onClick={applyPromoExample}
          >
            Exemplo cupom
          </button>
          <button
            type="button"
            className="btn btn-outline !py-2 text-xs"
            onClick={applyOverlayExample}
          >
            Exemplo detalhes
          </button>
          <button
            type="button"
            className="btn btn-outline !py-2"
            onClick={() => setGalleryOpen((v) => !v)}
          >
            {galleryOpen ? "Ocultar banco" : "Banco de imagens"}
          </button>
          <button
            type="button"
            className="btn btn-primary !py-2"
            onClick={save}
            disabled={saving}
          >
            {saving ? "Publicando..." : saved ? "Publicado!" : "Salvar e publicar"}
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <div className="bg-white border border-black/10 p-3 space-y-3">
          <p className="text-xs uppercase tracking-wider text-muted">
            Preview — arraste a foto ou o vídeo para enquadrar
          </p>

          <BannerTextToolbar
            textStyle={banner.textStyle || {}}
            activeLayer={activeLayer}
            onActiveLayerChange={(layer) => {
              setActiveLayer(layer);
              setTextSelection(null);
            }}
            onChange={(textStyle) => setBanner({ ...banner, textStyle })}
            layerText={layerPlainText(activeLayer)}
            selection={textSelection}
            textAlign={banner.textAlign}
            onTextAlignChange={(textAlign) =>
              setBanner({ ...banner, textAlign })
            }
          />

          <div
            className={`banner-frame cursor-grab active:cursor-grabbing touch-none select-none ${sizeClass(banner.bannerSize || "tall")} ${
              layout === "promo"
                ? "banner-frame--promo"
                : layout === "overlay"
                  ? "banner-frame--overlay"
                  : layout === "fullbleed"
                    ? "banner-frame--fullbleed"
                    : layout === "cutouts"
                      ? "banner-frame--cutouts"
                      : "banner-frame--studio"
            }${
              (banner.videoPlaylist?.length || 0) > 0 && layout !== "promo"
                ? " has-video"
                : ""
            }`}
            style={
              (banner.videoPlaylist?.length || 0) > 0 && layout !== "promo"
                ? {
                    background: banner.panelColor || banner.bgColor,
                    ["--banner-video-bg" as string]:
                      banner.panelColor || banner.bgColor,
                  }
                : layout === "studio" || layout === "cutouts"
                  ? { background: banner.bgColor }
                  : layout === "promo"
                    ? { background: banner.panelColor }
                    : layout === "fullbleed" && banner.imageFit === "contain"
                      ? {
                          background: banner.panelColor || banner.bgColor,
                        }
                      : undefined
            }
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {(banner.videoPlaylist?.length || 0) > 0 && layout !== "promo" ? (
              <div
                className="banner-video-clean"
                style={{
                  background: banner.panelColor || banner.bgColor,
                  ["--banner-video-bg" as string]:
                    banner.panelColor || banner.bgColor,
                }}
              >
                {banner.videoLayout === "pair" &&
                (banner.videoPlaylist?.length || 0) >= 2 ? (
                  <div className="banner-video-pair">
                    {banner.videoPlaylist.slice(0, 2).map((clip, i) => {
                      const cutout =
                        clip.cutout || isCutoutVideoUrl(clip.url);
                      const mediaClass = cutout
                        ? "banner-video-cutout pointer-events-none"
                        : "pointer-events-none";
                      return (
                        <div
                          key={`prev-pair-${i}-${clip.url}`}
                          className="banner-video-cell"
                          style={{
                            background: banner.panelColor || banner.bgColor,
                          }}
                        >
                          {isAnimatedImageCutout(clip.url) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={clip.url}
                              alt=""
                              className={mediaClass}
                              draggable={false}
                              style={adminVideoClipStyle(clip, banner)}
                            />
                          ) : (
                            <video
                              src={clip.url}
                              className={mediaClass}
                              muted
                              playsInline
                              autoPlay
                              loop
                              draggable={false}
                              style={adminVideoClipStyle(clip, banner)}
                            />
                          )}
                          <div
                            className="banner-video-drag-layer"
                            aria-label={`Arrastar vídeo ${i + 1}`}
                            onPointerDown={(e) => onVideoPointerDown(e, i)}
                            onPointerMove={onVideoPointerMove}
                            onPointerUp={onVideoPointerUp}
                            onPointerCancel={onVideoPointerUp}
                          />
                          <span className="banner-video-cell-label">
                            Vídeo {i + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className="banner-video-single banner-video-cell"
                    style={{
                      background: banner.panelColor || banner.bgColor,
                    }}
                  >
                    {(() => {
                      const clip = banner.videoPlaylist[0];
                      if (!clip) return null;
                      const cutout =
                        clip.cutout || isCutoutVideoUrl(clip.url);
                      const mediaClass = cutout
                        ? "banner-video-cutout pointer-events-none"
                        : "pointer-events-none";
                      return (
                        <>
                          {isAnimatedImageCutout(clip.url) ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={clip.url}
                              src={clip.url}
                              alt=""
                              className={mediaClass}
                              draggable={false}
                              style={adminVideoClipStyle(clip, banner)}
                            />
                          ) : (
                            <video
                              key={clip.url}
                              src={clip.url}
                              className={mediaClass}
                              muted
                              playsInline
                              autoPlay
                              loop
                              draggable={false}
                              poster={
                                cutout
                                  ? undefined
                                  : banner.imageUrl || undefined
                              }
                              style={adminVideoClipStyle(clip, banner)}
                            />
                          )}
                          <div
                            className="banner-video-drag-layer"
                            aria-label="Arrastar vídeo"
                            onPointerDown={(e) => onVideoPointerDown(e, 0)}
                            onPointerMove={onVideoPointerMove}
                            onPointerUp={onVideoPointerUp}
                            onPointerCancel={onVideoPointerUp}
                          />
                        </>
                      );
                    })()}
                  </div>
                )}
                {(banner.title?.trim() ||
                  banner.subtitle?.trim() ||
                  banner.highlight?.trim() ||
                  banner.promoText?.trim() ||
                  banner.tagline?.trim() ||
                  banner.ctaLabel) && (
                  <div
                    className={`banner-video-clean-copy pointer-events-none ${
                      banner.textAlign === "center"
                        ? "items-center text-center has-text-top"
                        : banner.textAlign === "right"
                          ? "items-end text-right"
                          : "items-start text-left"
                    }`}
                  >
                    {banner.tagline?.trim() ? (
                      <p
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "tagline"),
                          { scale: 0.75 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "tagline"),
                          banner.tagline,
                          { scale: 0.75 }
                        )}
                      </p>
                    ) : null}
                    {banner.highlight?.trim() ? (
                      <p
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "highlight"),
                          { scale: 0.75 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "highlight"),
                          banner.highlight,
                          { scale: 0.75 }
                        )}
                      </p>
                    ) : null}
                    {banner.title?.trim() ? (
                      <h2
                        className="banner-studio-title"
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "title"),
                          { scale: 0.72 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "title"),
                          banner.title,
                          { scale: 0.72 }
                        )}
                      </h2>
                    ) : null}
                    {banner.subtitle?.trim() ? (
                      <p
                        className="banner-studio-sub"
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "subtitle"),
                          { scale: 0.8 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "subtitle"),
                          banner.subtitle,
                          { scale: 0.8 }
                        )}
                      </p>
                    ) : null}
                    {banner.promoText?.trim() ? (
                      <p
                        className="banner-studio-sub"
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "promo"),
                          { scale: 0.8 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "promo"),
                          banner.promoText,
                          { scale: 0.8 }
                        )}
                      </p>
                    ) : null}
                    {banner.ctaLabel ? (
                      <div className="mt-3">
                        <span
                          className="banner-cta-btn !pointer-events-none"
                          style={cssFromCtaButton(
                            getLayerStyle(banner.textStyle, "cta"),
                            { scale: 0.75 }
                          )}
                        >
                          {renderLayerText(
                            getLayerStyle(banner.textStyle, "cta"),
                            banner.ctaLabel,
                            { scale: 0.75 }
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
            {layout === "promo" && (
              <div className="banner-promo-grid h-full">
                <div
                  data-no-pan
                  className="banner-promo-panel pointer-events-none"
                  style={{ background: banner.panelColor }}
                >
                  {banner.highlight && (
                    <p
                      className="banner-promo-highlight"
                      style={cssFromLayer(
                        getLayerStyle(banner.textStyle, "highlight"),
                        { scale: 0.85 }
                      )}
                    >
                      <span className="banner-promo-highlight-main">
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "highlight"),
                          banner.highlight,
                          { scale: 0.85 }
                        )}
                      </span>
                    </p>
                  )}
                  {banner.title?.trim() ? (
                    <p
                      className="banner-promo-kicker"
                      style={cssFromLayer(
                        getLayerStyle(banner.textStyle, "title"),
                        { scale: 0.8 }
                      )}
                    >
                      {renderLayerText(
                        getLayerStyle(banner.textStyle, "title"),
                        banner.title,
                        { scale: 0.8 }
                      )}
                    </p>
                  ) : null}
                  {banner.subtitle && (
                    <p
                      className="banner-promo-sub"
                      style={cssFromLayer(
                        getLayerStyle(banner.textStyle, "subtitle"),
                        { scale: 0.85 }
                      )}
                    >
                      {renderLayerText(
                        getLayerStyle(banner.textStyle, "subtitle"),
                        banner.subtitle,
                        { scale: 0.85 }
                      )}
                    </p>
                  )}
                  <div className="banner-promo-rule" />
                  {banner.promoText && (
                    <p
                      className="banner-promo-text"
                      style={cssFromLayer(
                        getLayerStyle(banner.textStyle, "promo"),
                        { scale: 0.85 }
                      )}
                    >
                      {renderLayerText(
                        getLayerStyle(banner.textStyle, "promo"),
                        banner.promoText,
                        { scale: 0.85 }
                      )}
                    </p>
                  )}
                  {banner.tagline && (
                    <p
                      className="banner-promo-tagline"
                      style={cssFromLayer(
                        getLayerStyle(banner.textStyle, "tagline"),
                        { scale: 0.85 }
                      )}
                    >
                      {renderLayerText(
                        getLayerStyle(banner.textStyle, "tagline"),
                        banner.tagline,
                        { scale: 0.85 }
                      )}
                    </p>
                  )}
                  {banner.couponCode && (
                    <div className="banner-promo-coupon text-[10px]">
                      <Tag size={12} />
                      {banner.couponCode}
                    </div>
                  )}
                  {banner.ctaLabel ? (
                    <div className="banner-promo-cta">
                      <span
                        className="banner-cta-btn !pointer-events-none"
                        style={cssFromCtaButton(
                          getLayerStyle(banner.textStyle, "cta"),
                          { scale: 0.85 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "cta"),
                          banner.ctaLabel,
                          { scale: 0.85 }
                        )}
                      </span>
                    </div>
                  ) : null}
                </div>
                <div className="banner-promo-media">
                  {banner.videoPlaylist?.[0]?.url || banner.videoUrl ? (
                    (() => {
                      const clip =
                        banner.videoPlaylist?.[0] ||
                        ({
                          url: banner.videoUrl || "",
                          seconds: banner.videoSeconds || 8,
                        } satisfies BannerVideoClip);
                      const cutout =
                        clip.cutout || isCutoutVideoUrl(clip.url);
                      if (isAnimatedImageCutout(clip.url)) {
                        return (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            key={clip.url}
                            src={clip.url}
                            alt=""
                            className="banner-promo-video banner-video-cutout"
                            draggable={false}
                            style={adminVideoClipStyle(clip, banner)}
                          />
                        );
                      }
                      return (
                        <video
                          key={clip.url}
                          className={
                            cutout
                              ? "banner-promo-video banner-video-cutout"
                              : "banner-promo-video"
                          }
                          src={clip.url}
                          autoPlay
                          muted
                          loop
                          playsInline
                          poster={
                            cutout ? undefined : banner.imageUrl || undefined
                          }
                          style={adminVideoClipStyle(clip, banner)}
                        />
                      );
                    })()
                  ) : banner.imageUrl?.trim() ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={banner.imageUrl}
                      alt=""
                      draggable={false}
                      className="pointer-events-none"
                      style={mediaStyle(banner)}
                    />
                  ) : null}
                </div>
              </div>
            )}

            {layout === "overlay" && !(banner.videoPlaylist?.length > 0) && (
              <>
                {banner.videoPlaylist?.[0]?.url || banner.videoUrl ? (
                  <video
                    key={
                      banner.videoPlaylist?.[0]?.url || banner.videoUrl || ""
                    }
                    className="banner-fullbleed-img banner-fullbleed-video"
                    src={
                      banner.videoPlaylist?.[0]?.url || banner.videoUrl || ""
                    }
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={banner.imageUrl || undefined}
                    style={mediaStyle(banner)}
                  />
                ) : banner.imageUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={banner.imageUrl}
                    alt=""
                    draggable={false}
                    className="banner-fullbleed-img pointer-events-none"
                    style={mediaStyle(banner)}
                  />
                ) : null}
                <div className="banner-overlay-fade" />
                <div
                  data-no-pan
                  className="banner-overlay-copy pointer-events-none"
                >
                  {banner.title?.trim() ? (
                    <h2
                      className="banner-overlay-title text-[clamp(1.5rem,4vw,2.4rem)]"
                      style={cssFromLayer(
                        getLayerStyle(banner.textStyle, "title"),
                        { scale: 0.75 }
                      )}
                    >
                      {renderLayerText(
                        getLayerStyle(banner.textStyle, "title"),
                        banner.title,
                        { scale: 0.75 }
                      )}
                    </h2>
                  ) : null}
                  {banner.subtitle?.trim() ? (
                    <p
                      className="banner-overlay-promo text-sm"
                      style={cssFromLayer(
                        getLayerStyle(banner.textStyle, "subtitle"),
                        { scale: 0.85 }
                      )}
                    >
                      {renderLayerText(
                        getLayerStyle(banner.textStyle, "subtitle"),
                        banner.subtitle,
                        { scale: 0.85 }
                      )}
                    </p>
                  ) : null}
                  {banner.promoText?.trim() ? (
                    <p
                      className="banner-overlay-promo text-sm"
                      style={cssFromLayer(
                        getLayerStyle(banner.textStyle, "promo"),
                        { scale: 0.85 }
                      )}
                    >
                      {renderLayerText(
                        getLayerStyle(banner.textStyle, "promo"),
                        banner.promoText,
                        { scale: 0.85 }
                      )}
                    </p>
                  ) : null}
                  {banner.ctaLabel ? (
                    <div className="mt-3">
                      <span
                        className="banner-cta-btn !pointer-events-none"
                        style={cssFromCtaButton(
                          getLayerStyle(banner.textStyle, "cta"),
                          { scale: 0.8 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "cta"),
                          banner.ctaLabel,
                          { scale: 0.8 }
                        )}
                      </span>
                    </div>
                  ) : null}
                </div>
                {banner.tagline && (
                  <p className="banner-overlay-tagline pointer-events-none">
                    {renderLayerText(
                      getLayerStyle(banner.textStyle, "tagline"),
                      banner.tagline
                    )}
                  </p>
                )}
              </>
            )}

            {(layout === "studio" || layout === "cutouts") &&
              !(banner.videoPlaylist?.length > 0) && (
              <>
                <div className="banner-studio-bg" aria-hidden />
                <div className="banner-brand-watermark" aria-hidden>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/brand/logo.svg" alt="" />
                </div>
                <div className="banner-studio-grid px-4 h-full">
                  <div
                    data-no-pan
                    className="banner-studio-copy pointer-events-none"
                  >
                    {banner.title?.trim() ? (
                      <h2
                        className="banner-studio-title"
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "title"),
                          { scale: 0.72 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "title"),
                          banner.title,
                          { scale: 0.72 }
                        )}
                      </h2>
                    ) : null}
                    {banner.highlight && (
                      <p
                        className="mt-1"
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "highlight"),
                          { scale: 0.7 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "highlight"),
                          banner.highlight,
                          { scale: 0.7 }
                        )}
                      </p>
                    )}
                    {banner.subtitle?.trim() ? (
                      <p
                        className="banner-studio-sub"
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "subtitle"),
                          { scale: 0.85 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "subtitle"),
                          banner.subtitle,
                          { scale: 0.85 }
                        )}
                      </p>
                    ) : null}
                    {banner.promoText?.trim() ? (
                      <p
                        className="banner-studio-sub"
                        style={cssFromLayer(
                          getLayerStyle(banner.textStyle, "promo"),
                          { scale: 0.85 }
                        )}
                      >
                        {renderLayerText(
                          getLayerStyle(banner.textStyle, "promo"),
                          banner.promoText,
                          { scale: 0.85 }
                        )}
                      </p>
                    ) : null}
                    {banner.ctaLabel ? (
                      <div className="banner-studio-cta">
                        <span
                          className="banner-cta-btn !pointer-events-none"
                          style={cssFromCtaButton(
                            getLayerStyle(banner.textStyle, "cta"),
                            { scale: 0.8 }
                          )}
                        >
                          {renderLayerText(
                            getLayerStyle(banner.textStyle, "cta"),
                            banner.ctaLabel,
                            { scale: 0.8 }
                          )}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  {banner.videoPlaylist?.[0]?.url || banner.videoUrl ? (
                    <div
                      className={
                        layout === "cutouts"
                          ? "banner-cutouts-media"
                          : "banner-studio-media"
                      }
                    >
                      <video
                        key={
                          banner.videoPlaylist?.[0]?.url ||
                          banner.videoUrl ||
                          ""
                        }
                        className="banner-studio-video"
                        src={
                          banner.videoPlaylist?.[0]?.url ||
                          banner.videoUrl ||
                          ""
                        }
                        autoPlay
                        muted
                        loop
                        playsInline
                        poster={banner.imageUrl || undefined}
                        style={mediaStyle(banner)}
                      />
                    </div>
                  ) : layout === "cutouts" ? (
                    <div className="banner-cutouts-media">
                      <div
                        ref={cutoutsStageRef}
                        className="banner-cutouts-stage"
                      >
                        {(banner.cutoutImages?.length
                          ? banner.cutoutImages
                          : banner.imageUrl?.trim()
                            ? [
                                {
                                  url: banner.imageUrl,
                                  x: 50,
                                  y: 0,
                                  scale: 1,
                                },
                              ]
                            : []
                        ).map((layer, i) => (
                          <div
                            key={layer.url}
                            className={`banner-cutout-layer ${
                              selectedCutout === layer.url ? "is-selected" : ""
                            }`}
                            style={{
                              left: `${layer.x}%`,
                              bottom: `${layer.y}%`,
                              zIndex: selectedCutout === layer.url ? 20 : i + 1,
                              transform: `translateX(-50%) scale(${layer.scale})`,
                            }}
                            onPointerDown={(e) => onCutoutPointerDown(e, layer)}
                            onPointerMove={onCutoutPointerMove}
                            onPointerUp={onCutoutPointerUp}
                            onPointerCancel={onCutoutPointerUp}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={layer.url}
                              alt=""
                              draggable={false}
                              className="banner-cutout-figure"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="banner-studio-media">
                      {banner.imageUrl?.trim() ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={banner.imageUrl}
                          alt=""
                          draggable={false}
                          className={`pointer-events-none ${
                            banner.imageFit === "cover"
                              ? "is-cover"
                              : "is-cutout"
                          }`}
                          style={mediaStyle(banner)}
                        />
                      ) : null}
                    </div>
                  )}
                </div>
              </>
            )}

            {layout === "fullbleed" && !(banner.videoPlaylist?.length > 0) && (
              <>
                {banner.videoPlaylist?.[0]?.url || banner.videoUrl ? (
                  <video
                    key={
                      banner.videoPlaylist?.[0]?.url || banner.videoUrl || ""
                    }
                    className="banner-fullbleed-img banner-fullbleed-video"
                    src={
                      banner.videoPlaylist?.[0]?.url || banner.videoUrl || ""
                    }
                    autoPlay
                    muted
                    loop
                    playsInline
                    poster={banner.imageUrl || undefined}
                    style={mediaStyle(banner)}
                  />
                ) : banner.imageUrl?.trim() ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={banner.imageUrl}
                    alt=""
                    draggable={false}
                    className="banner-fullbleed-img pointer-events-none"
                    style={mediaStyle(banner)}
                  />
                ) : null}
                {banner.overlay > 0 && (
                  <div
                    className="absolute inset-0"
                    style={{
                      background: `rgba(20,14,10,${banner.overlay})`,
                    }}
                  />
                )}
                <div
                  data-no-pan
                  className="banner-fullbleed-copy px-6 pointer-events-none"
                >
                  <h2 className="banner-fullbleed-title text-[clamp(1.4rem,3vw,2.2rem)]">
                    {banner.title}
                  </h2>
                </div>
              </>
            )}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">
              Tipo de banner
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              {LAYOUTS.map((l) => (
                <button
                  key={l.id}
                  type="button"
                  className={`text-left border px-3 py-2 ${
                    layout === l.id
                      ? "border-ink bg-ink text-white"
                      : "border-line hover:border-ink"
                  }`}
                  onClick={() => {
                    setBanner({ ...banner, layout: l.id });
                    setMediaBank(l.id === "cutouts" ? "cutout" : "upload");
                  }}
                >
                  <span className="block text-xs font-semibold">{l.label}</span>
                  <span
                    className={`block text-[11px] mt-0.5 ${
                      layout === l.id ? "text-white/75" : "text-muted"
                    }`}
                  >
                    {l.tip}
                  </span>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-2">
              Vídeo funciona em qualquer tipo — adicione abaixo em “Banner em
              vídeo” (até 3 clipes em sequência).
            </p>
          </div>

          <div className="border border-black/10 bg-[#faf7f3] p-3 space-y-3">
            <p className="text-xs uppercase tracking-wider text-muted">
              Banner em vídeo (qualquer layout)
            </p>
            <p className="text-sm text-muted">
              O vídeo entra no lugar da mídia, sem bordas da logo — só a cor de
              fundo. Até {BANNER_VIDEO_MAX} vídeos: em sequência ou 2 lado a lado.
            </p>
            {(banner.videoPlaylist || []).length >= 1 ? (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-wider text-muted">
                  Como mostrar os vídeos
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={`px-3 py-2 text-xs uppercase tracking-wide border ${
                      banner.videoLayout !== "pair"
                        ? "border-ink bg-ink text-white"
                        : "border-black/15 bg-white"
                    }`}
                    onClick={() =>
                      setBanner({ ...banner, videoLayout: "sequence" })
                    }
                  >
                    Em sequência
                  </button>
                  <button
                    type="button"
                    className={`px-3 py-2 text-xs uppercase tracking-wide border ${
                      banner.videoLayout === "pair"
                        ? "border-ink bg-ink text-white"
                        : "border-black/15 bg-white"
                    }`}
                    disabled={(banner.videoPlaylist || []).length < 2}
                    title={
                      (banner.videoPlaylist || []).length < 2
                        ? "Adicione 2 vídeos para usar lado a lado"
                        : "Dois vídeos ao mesmo tempo"
                    }
                    onClick={() =>
                      setBanner({
                        ...banner,
                        videoLayout: "pair",
                        imageFit: "contain",
                      })
                    }
                  >
                    Lado a lado (2)
                  </button>
                </div>
                {banner.videoLayout === "pair" ? (
                  <p className="text-[11px] text-muted">
                    Arraste o Vídeo 1 e o Vídeo 2 separadamente no preview.
                  </p>
                ) : (
                  <p className="text-[11px] text-muted">
                    Cada vídeo toca na ordem e depois passa para o próximo
                    banner.
                  </p>
                )}
              </div>
            ) : null}
            {(banner.videoPlaylist || []).length > 0 ? (
              <ul className="space-y-3">
                {(banner.videoPlaylist || []).map((clip, i) => (
                  <li
                    key={`${clip.url}-${i}`}
                    className="border border-black/10 bg-white p-3 space-y-2"
                  >
                    <div className="flex gap-3 items-start">
                      <div className="w-28 aspect-video bg-black shrink-0 overflow-hidden">
                        <video
                          src={clip.url}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      </div>
                      <div className="flex-1 min-w-0 space-y-2">
                        <p className="text-sm font-medium">
                          Vídeo {i + 1} de {(banner.videoPlaylist || []).length}
                        </p>
                        <label className="block text-xs uppercase tracking-wider text-muted">
                          Segundos neste vídeo
                          <input
                            type="number"
                            min={2}
                            max={60}
                            className="input mt-1"
                            value={clip.seconds}
                            disabled={videoBusy}
                            onChange={(e) => {
                              const next = [...(banner.videoPlaylist || [])];
                              next[i] = {
                                ...clip,
                                seconds: clampVideoSeconds(e.target.value),
                              };
                              setPlaylist(next);
                            }}
                          />
                        </label>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="text-xs underline text-muted"
                            disabled={videoBusy || i === 0}
                            onClick={() => {
                              const next = [...(banner.videoPlaylist || [])];
                              [next[i - 1], next[i]] = [next[i], next[i - 1]];
                              setPlaylist(next);
                            }}
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            className="text-xs underline text-muted"
                            disabled={
                              videoBusy ||
                              i >= (banner.videoPlaylist || []).length - 1
                            }
                            onClick={() => {
                              const next = [...(banner.videoPlaylist || [])];
                              [next[i], next[i + 1]] = [next[i + 1], next[i]];
                              setPlaylist(next);
                            }}
                          >
                            Descer
                          </button>
                          {!clip.cutout && !isCutoutVideoUrl(clip.url) ? (
                            <button
                              type="button"
                              className="btn btn-outline !py-1 !px-2 text-xs"
                              disabled={videoBusy || cutoutBusy}
                              onClick={() => {
                                setVideoMsg(
                                  "Iniciando recorte do vídeo (só o corpo)…"
                                );
                                void cutoutPlaylistClip(i);
                              }}
                            >
                              {videoBusy
                                ? "Recortando…"
                                : "Recortar corpo (IA)"}
                            </button>
                          ) : (
                            <span className="text-xs text-emerald-800">
                              Já no banco de vídeos recortados
                            </span>
                          )}
                          <button
                            type="button"
                            className="text-xs underline text-[var(--rose)]"
                            disabled={videoBusy}
                            onClick={() => {
                              setPlaylist(
                                (banner.videoPlaylist || []).filter(
                                  (_, j) => j !== i
                                ),
                                "Vídeo removido."
                              );
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted">
                Nenhum vídeo — escolha no banco ou envie um arquivo.
              </p>
            )}
            <label className="block text-xs uppercase tracking-wider text-muted">
              Adicionar do banco
              <select
                className="input mt-1"
                value=""
                disabled={
                  videoBusy ||
                  (banner.videoPlaylist || []).length >= BANNER_VIDEO_MAX
                }
                onChange={(e) => {
                  const url = e.target.value;
                  e.target.value = "";
                  addClipFromBank(url, videoBank, false);
                }}
              >
                <option value="">Selecione para adicionar…</option>
                {videoBank.map((v) => (
                  <option key={v.id} value={v.url}>
                    {v.title || v.url}
                    {v.durationSec ? ` (${v.durationSec}s)` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Adicionar recortado (só o corpo)
              <select
                className="input mt-1"
                value=""
                disabled={
                  videoBusy ||
                  (banner.videoPlaylist || []).length >= BANNER_VIDEO_MAX
                }
                onChange={(e) => {
                  const url = e.target.value;
                  e.target.value = "";
                  addClipFromBank(url, videoCutoutBank, true);
                }}
              >
                <option value="">Selecione um recorte…</option>
                {videoCutoutBank.map((v) => (
                  <option key={v.id} value={v.url}>
                    {v.title || v.url}
                    {v.durationSec ? ` (${v.durationSec}s)` : ""}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Enviar vídeo novo
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov,.m4v"
                className="input mt-1 text-xs"
                disabled={
                  videoBusy ||
                  (banner.videoPlaylist || []).length >= BANNER_VIDEO_MAX
                }
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (file) void uploadBannerVideo(file);
                }}
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <a
                href="/admin/banco-videos"
                className="text-sm underline text-muted"
                target="_blank"
                rel="noreferrer"
              >
                Abrir banco de vídeos
              </a>
              <a
                href="/admin/banco-videos-recortados"
                className="text-sm underline text-muted"
                target="_blank"
                rel="noreferrer"
              >
                Banco de vídeos recortados
              </a>
              {(banner.videoPlaylist || []).length > 0 ? (
                <button
                  type="button"
                  className="text-sm underline text-[var(--rose)]"
                  disabled={videoBusy}
                  onClick={() => setPlaylist([], "Vídeos removidos.")}
                >
                  Limpar vídeos
                </button>
              ) : null}
            </div>
            <ColorPresetSwatches
              label="Cor das bordas / painel (corpo inteiro e lado a lado)"
              value={banner.panelColor || banner.bgColor}
              onChange={(hex) =>
                setBanner({ ...banner, panelColor: hex, bgColor: hex })
              }
            />

            {videoMsg ? (
              <p
                className={`text-sm ${
                  videoBusy ? "text-[var(--rose)] font-medium" : "text-emerald-800"
                }`}
              >
                {videoBusy ? "⏳ " : ""}
                {videoMsg}
              </p>
            ) : null}
            {videoBusy ? (
              <p className="text-sm text-[var(--rose)] font-medium animate-pulse">
                Processando recorte de vídeo… não feche a página.
              </p>
            ) : null}
          </div>

          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">
              Altura do banner
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { id: "compact", label: "Compacto" },
                  { id: "normal", label: "Médio" },
                  { id: "tall", label: "Alto (pessoa inteira)" },
                ] as const
              ).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={`btn !py-2 !px-3 text-xs ${
                    (banner.bannerSize || "tall") === s.id
                      ? "btn-dark"
                      : "btn-outline"
                  }`}
                  onClick={() => setBanner({ ...banner, bannerSize: s.id })}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted mt-2">
              Use Alto para a modelo aparecer completa no layout estúdio.
            </p>
          </div>

          <BannerCanvaPanel
            layout={layout}
            bannerSize={banner.bannerSize || "tall"}
            bannerTitle={banner.title}
          />

          {(layout === "studio" ||
            layout === "promo" ||
            layout === "fullbleed" ||
            layout === "overlay" ||
            (banner.videoPlaylist || []).length > 0) && (
            <div>
              <p className="text-xs uppercase tracking-wider text-muted mb-2">
                Encaixe da mídia (foto ou vídeo)
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`btn !py-2 !px-3 text-xs ${
                    banner.imageFit !== "cover" ? "btn-dark" : "btn-outline"
                  }`}
                  onClick={() =>
                    setBanner({
                      ...banner,
                      imageFit: "contain",
                      imageZoom: 1,
                      focalX: 50,
                      focalY: 50,
                    })
                  }
                >
                  Corpo inteiro
                </button>
                <button
                  type="button"
                  className={`btn !py-2 !px-3 text-xs ${
                    banner.imageFit === "cover" ? "btn-dark" : "btn-outline"
                  }`}
                  onClick={() =>
                    setBanner({
                      ...banner,
                      imageFit: "cover",
                      focalY: 40,
                    })
                  }
                >
                  Preencher tela
                </button>
              </div>
              <p className="text-[11px] text-muted mt-2">
                No lado a lado, clique em cada vídeo (selo Vídeo 1 / Vídeo 2) e
                arraste para enquadrar um de cada vez. Use o toolbar para textos.
              </p>
            </div>
          )}

          {(layout === "studio" ||
            layout === "cutouts" ||
            layout === "fullbleed") && (
            <ColorPresetSwatches
              label="Cor do fundo"
              value={banner.bgColor}
              onChange={(hex) =>
                setBanner({ ...banner, bgColor: hex })
              }
            />
          )}

          {layout === "cutouts" && (
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-wider text-muted">
                Modelos no banner (até 6)
              </p>
              <p className="text-[11px] text-muted leading-relaxed">
                Abra o banco, navegue foto a foto e clique em{" "}
                <strong>Selecionar</strong>. No preview, clique na modelo e use{" "}
                <strong>Recortar selecionada</strong> (não refaz as outras).
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="btn btn-primary text-xs"
                  disabled={cutoutBusy || !selectedCutout}
                  onClick={runCutoutSelected}
                >
                  {cutoutBusy ? "Processando…" : "Recortar selecionada"}
                </button>
                <button
                  type="button"
                  className="btn btn-outline text-xs"
                  disabled={cutoutBusy || !selectedCutout}
                  onClick={runNormalizeSelected}
                >
                  Padronizar selecionada
                </button>
                <button
                  type="button"
                  className="btn btn-outline text-xs"
                  disabled={!(banner.cutoutImages?.length)}
                  onClick={() =>
                    setBanner({
                      ...banner,
                      cutoutImages: redistributeCutouts(banner.cutoutImages),
                    })
                  }
                >
                  Redistribuir
                </button>
              </div>
              {selectedCutout ? (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-muted">Escala</span>
                  <button
                    type="button"
                    className="btn btn-outline px-2 py-1"
                    onClick={() => {
                      const cur = banner.cutoutImages.find(
                        (l) => l.url === selectedCutout
                      );
                      if (!cur) return;
                      updateCutout(selectedCutout, {
                        scale: clamp(cur.scale - 0.08, 0.45, 1.8),
                      });
                    }}
                  >
                    −
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline px-2 py-1"
                    onClick={() => {
                      const cur = banner.cutoutImages.find(
                        (l) => l.url === selectedCutout
                      );
                      if (!cur) return;
                      updateCutout(selectedCutout, {
                        scale: clamp(cur.scale + 0.08, 0.45, 1.8),
                      });
                    }}
                  >
                    +
                  </button>
                </div>
              ) : null}
              {cutoutMsg ? (
                <p className="text-xs text-muted bg-[#f7f3ee] border border-black/8 px-3 py-2">
                  {cutoutMsg}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-3">
                {(banner.cutoutImages || []).map((layer) => (
                  <div key={layer.url} className="space-y-1">
                    <button
                      type="button"
                      className={`relative h-24 w-16 border overflow-hidden bg-[#f0e8df] ${
                        selectedCutout === layer.url
                          ? "border-ink"
                          : "border-black/15"
                      }`}
                      onClick={() => setSelectedCutout(layer.url)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={layer.url}
                        alt=""
                        className="h-full w-full object-contain object-bottom"
                      />
                    </button>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-wide text-[#a85f64] disabled:opacity-40"
                        disabled={cutoutBusy || videoBusy}
                        onClick={() => {
                          setCutoutMsg("Iniciando recorte da foto…");
                          void runCutoutOne(layer.url);
                        }}
                      >
                        {cutoutBusy ? "Recortando…" : "Recortar"}
                      </button>
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-wide text-muted"
                        disabled={cutoutBusy}
                        onClick={() => {
                          setBanner({
                            ...banner,
                            cutoutImages: banner.cutoutImages.filter(
                              (u) => u.url !== layer.url
                            ),
                          });
                          if (selectedCutout === layer.url) {
                            setSelectedCutout(null);
                          }
                        }}
                      >
                        Remover
                      </button>
                      <button
                        type="button"
                        className="text-[10px] uppercase tracking-wide text-red-700"
                        disabled={cutoutBusy}
                        onClick={() => {
                          const media = library.find((m) => m.url === layer.url);
                          if (media) {
                            deleteMediaFromLibrary(media.id, layer.url);
                          } else {
                            setBanner({
                              ...banner,
                              cutoutImages: banner.cutoutImages.filter(
                                (u) => u.url !== layer.url
                              ),
                            });
                          }
                        }}
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted">
                A 1ª vez que recortar pode demorar. Depois salve o banner.
              </p>
            </div>
          )}

          {layout === "promo" && (
            <ColorPresetSwatches
              label="Cor do painel"
              value={banner.panelColor}
              onChange={(hex) =>
                setBanner({ ...banner, panelColor: hex })
              }
            />
          )}

          <label className="block text-xs uppercase tracking-wider text-muted">
            Zoom ({Math.round(banner.imageZoom * 100)}%)
            <input
              type="range"
              min={0.7}
              max={2}
              step={0.01}
              className="w-full mt-2"
              value={banner.imageZoom}
              onChange={(e) =>
                setBanner({ ...banner, imageZoom: Number(e.target.value) })
              }
            />
          </label>
          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block text-xs uppercase tracking-wider text-muted">
              Horizontal ({Math.round(banner.focalX)}%)
              <input
                type="range"
                min={0}
                max={100}
                className="w-full mt-2"
                value={banner.focalX}
                onChange={(e) =>
                  setBanner({ ...banner, focalX: Number(e.target.value) })
                }
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Vertical ({Math.round(banner.focalY)}%)
              <input
                type="range"
                min={0}
                max={100}
                className="w-full mt-2"
                value={banner.focalY}
                onChange={(e) =>
                  setBanner({ ...banner, focalY: Number(e.target.value) })
                }
              />
            </label>
          </div>
        </div>

        <div className="bg-white border border-black/10 p-4 space-y-3">
          <p className="text-xs uppercase tracking-wider text-ink font-semibold">
            Textos
          </p>
          <p className="text-[11px] text-muted -mt-1">
            Selecione trechos no campo (ex.: só o <strong>10</strong>) e use a
            barra de fonte/tamanho acima — como no Word.
          </p>
          <label className="block text-xs uppercase tracking-wider text-muted">
            Título
            <input
              className="input mt-1"
              value={banner.title}
              onFocus={() => focusLayer("title")}
              onSelect={(e) => captureTextSelection(e.currentTarget)}
              onKeyUp={(e) => captureTextSelection(e.currentTarget)}
              onMouseUp={(e) => captureTextSelection(e.currentTarget)}
              onChange={(e) => updateLayerText("title", e.target.value)}
              placeholder="Desconto / detalhes. / Vista sua força"
            />
          </label>
          <label className="block text-xs uppercase tracking-wider text-muted">
            Subtítulo
            <input
              className="input mt-1"
              value={banner.subtitle || ""}
              onFocus={() => focusLayer("subtitle")}
              onSelect={(e) => captureTextSelection(e.currentTarget)}
              onKeyUp={(e) => captureTextSelection(e.currentTarget)}
              onMouseUp={(e) => captureTextSelection(e.currentTarget)}
              onChange={(e) => updateLayerText("subtitle", e.target.value)}
              placeholder="de boas-vindas"
            />
          </label>

          <div className="border-t border-line pt-3 space-y-3">
            <p className="text-xs uppercase tracking-wider text-ink font-semibold">
              Promoção
            </p>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Destaque (ex: 10% off)
              <input
                className="input mt-1"
                value={banner.highlight || ""}
                onFocus={() => focusLayer("highlight")}
                onSelect={(e) => captureTextSelection(e.currentTarget)}
                onKeyUp={(e) => captureTextSelection(e.currentTarget)}
                onMouseUp={(e) => captureTextSelection(e.currentTarget)}
                onChange={(e) => updateLayerText("highlight", e.target.value)}
                placeholder="10% off"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Texto da promoção
              <textarea
                className="input mt-1 min-h-20"
                value={banner.promoText || ""}
                onFocus={() => focusLayer("promo")}
                onSelect={(e) => captureTextSelection(e.currentTarget)}
                onKeyUp={(e) => captureTextSelection(e.currentTarget)}
                onMouseUp={(e) => captureTextSelection(e.currentTarget)}
                onChange={(e) => updateLayerText("promo", e.target.value)}
                placeholder="Parcele em 3x sem juros ou ganhe 5% de desconto no PIX"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Cupom
              <input
                className="input mt-1 uppercase tracking-wider"
                value={banner.couponCode || ""}
                onChange={(e) =>
                  setBanner({
                    ...banner,
                    couponCode: e.target.value.toUpperCase() || null,
                  })
                }
                placeholder="PRIMEIRACOMPRA"
              />
            </label>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Linha inferior (ex: EXCLUSIVIDADE)
              <input
                className="input mt-1"
                value={banner.tagline || ""}
                onFocus={() => focusLayer("tagline")}
                onSelect={(e) => captureTextSelection(e.currentTarget)}
                onKeyUp={(e) => captureTextSelection(e.currentTarget)}
                onMouseUp={(e) => captureTextSelection(e.currentTarget)}
                onChange={(e) => updateLayerText("tagline", e.target.value)}
                placeholder="Exclusividade"
              />
            </label>
          </div>

          <div className="border-t border-line pt-3 space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-xs uppercase tracking-wider text-muted">
                Botão
                <input
                  className="input mt-1"
                  value={banner.ctaLabel || ""}
                  onFocus={() => focusLayer("cta")}
                  onSelect={(e) => captureTextSelection(e.currentTarget)}
                  onKeyUp={(e) => captureTextSelection(e.currentTarget)}
                  onMouseUp={(e) => captureTextSelection(e.currentTarget)}
                  onChange={(e) => updateLayerText("cta", e.target.value)}
                  placeholder="Comprar agora"
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Link
                <input
                  className="input mt-1"
                  value={banner.ctaHref || ""}
                  onChange={(e) =>
                    setBanner({ ...banner, ctaHref: e.target.value })
                  }
                  placeholder="/categoria/conjunto-legging"
                />
              </label>
            </div>
            {layout === "fullbleed" && (
              <label className="block text-xs uppercase tracking-wider text-muted">
                Escurecimento ({Math.round(banner.overlay * 100)}%)
                <input
                  type="range"
                  min={0}
                  max={0.55}
                  step={0.01}
                  className="w-full mt-2"
                  value={banner.overlay}
                  onChange={(e) =>
                    setBanner({ ...banner, overlay: Number(e.target.value) })
                  }
                />
              </label>
            )}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={banner.active}
                onChange={(e) =>
                  setBanner({ ...banner, active: e.target.checked })
                }
              />
              Ativo na home (Salvar e publicar também ativa)
            </label>
          </div>
        </div>
      </div>

      {galleryOpen ? (
        <div className="bg-white border border-black/10 p-4">
          <MediaGallery
            mode="page"
            title="Banco de imagens"
            items={library}
            search={q}
            onSearchChange={setQ}
            banks={["cutout", "upload"]}
            activeBank={mediaBank}
            onBankChange={setMediaBank}
            onUpload={onUpload}
            uploadLabel={
              mediaBank === "cutout"
                ? "Upload PNG recortado"
                : "Adicionar imagem"
            }
            selectLabel={
              layout === "cutouts"
                ? "Usar no banner"
                : "Selecionar para o banner"
            }
            selectedUrls={[
              banner.imageUrl,
              ...(banner.cutoutImages || []).map((l) => l.url),
            ].filter(Boolean)}
            onSelect={(item) => {
              if (layout === "cutouts") {
                const next = addCutoutUrl(banner.cutoutImages || [], item.url);
                setBanner({
                  ...banner,
                  cutoutImages: next,
                  imageUrl: banner.imageUrl || item.url,
                  imageFit: "contain",
                });
                setSelectedCutout(item.url);
                setCutoutMsg(
                  item.source === "cutout"
                    ? "Modelo recortada adicionada ao banner."
                    : "Foto adicionada. Clique nela no preview e use Recortar selecionada."
                );
              } else {
                setBanner({ ...banner, imageUrl: item.url });
              }
            }}
            onDelete={async (item) => {
              await deleteMediaFromLibrary(item.id, item.url);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}
