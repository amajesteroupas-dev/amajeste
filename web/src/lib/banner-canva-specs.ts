export type BannerLayoutId =
  | "studio"
  | "fullbleed"
  | "promo"
  | "overlay"
  | "cutouts";

export type BannerSizeId = "compact" | "normal" | "tall";

export type CanvaSpecId =
  | "desktop-tall"
  | "desktop-normal"
  | "desktop-compact"
  | "mobile-full"
  | "promo-media"
  | "video-portrait"
  | "cutout-model";

export type CanvaArtSpec = {
  id: CanvaSpecId;
  label: string;
  width: number;
  height: number;
  /** layouts onde este preset é o mais indicado */
  layouts: BannerLayoutId[];
  /** alturas do banner que batem com este preset (desktop full) */
  sizes?: BannerSizeId[];
  tips: string[];
  exportNote: string;
};

export const CANVA_OPEN_URL = "https://www.canva.com/";

export const CANVA_ART_SPECS: CanvaArtSpec[] = [
  {
    id: "desktop-tall",
    label: "Desktop full — Alto",
    width: 1920,
    height: 720,
    layouts: ["studio", "fullbleed", "overlay"],
    sizes: ["tall"],
    tips: [
      "Use para banner alto (pessoa inteira) em estúdio, fullbleed ou overlay.",
      "Deixe ~8% de margem nas bordas (zona segura) — o site corta um pouco no mobile.",
      "Texto importante no terço central; laterais podem sumir no celular.",
    ],
    exportNote: "PNG ou JPG qualidade alta. Sem marcas d’água.",
  },
  {
    id: "desktop-normal",
    label: "Desktop full — Médio",
    width: 1920,
    height: 580,
    layouts: ["studio", "fullbleed", "overlay"],
    sizes: ["normal"],
    tips: [
      "Altura média: bom equilíbrio entre impacto e espaço dos produtos abaixo.",
      "Evite texto miúdo — no site o texto também pode ser editado no painel.",
    ],
    exportNote: "PNG ou JPG qualidade alta.",
  },
  {
    id: "desktop-compact",
    label: "Desktop full — Compacto",
    width: 1920,
    height: 440,
    layouts: ["studio", "fullbleed", "overlay"],
    sizes: ["compact"],
    tips: [
      "Banner baixo: priorize 1 frase curta + 1 imagem forte.",
      "Não coloque detalhes finos perto das bordas superior/inferior.",
    ],
    exportNote: "PNG ou JPG qualidade alta.",
  },
  {
    id: "mobile-full",
    label: "Mobile / vertical",
    width: 1080,
    height: 1620,
    layouts: ["studio", "fullbleed", "overlay", "promo"],
    tips: [
      "Use se quiser arte pensada só para celular (mais alta).",
      "No site o banner mobile é quase tela cheia — enquadre a modelo no centro.",
      "Pode ser a mesma arte do desktop redimensionada; o ideal é uma versão vertical.",
    ],
    exportNote: "PNG ou JPG. Para vídeo, exporte MP4 1080p.",
  },
  {
    id: "promo-media",
    label: "Promoção — lado foto/vídeo",
    width: 1100,
    height: 720,
    layouts: ["promo"],
    sizes: ["tall", "normal", "compact"],
    tips: [
      "No layout Promoção, o texto fica à esquerda e a mídia à direita.",
      "Faça a arte só da área da foto/vídeo (não inclua o painel de cupom).",
      "Modelo preferencialmente centralizada; use “Corpo inteiro” no editor se precisar.",
    ],
    exportNote: "PNG/JPG para foto; MP4 H.264 para vídeo.",
  },
  {
    id: "video-portrait",
    label: "Vídeo modelo (corpo)",
    width: 1080,
    height: 1920,
    layouts: ["promo", "studio", "cutouts", "fullbleed"],
    tips: [
      "Grave em vertical 9:16 com a modelo inteira no quadro (cabeça aos pés).",
      "Fundo limpo; 5–12 segundos por clipe; até 3 vídeos na playlist.",
      "No editor: Corpo inteiro + arrastar para enquadrar.",
    ],
    exportNote: "MP4 H.264, áudio opcional (o site toca sem som). Máx. ~120 MB.",
  },
  {
    id: "cutout-model",
    label: "Recorte de modelo",
    width: 900,
    height: 1600,
    layouts: ["cutouts", "studio"],
    tips: [
      "Fundo branco ou removível — o painel pode recortar automaticamente.",
      "Modelo de pé, centralizada, pés visíveis na base.",
      "Evite sombras cortadas nas bordas.",
    ],
    exportNote: "PNG com fundo transparente (melhor) ou JPG para recorte automático.",
  },
];

export const CANVA_MANUAL_CHECKLIST = [
  "No Canva: Criar design → Tamanho personalizado → cole Largura × Altura em pixels.",
  "Exporte em PNG/JPG (imagem) ou MP4 (vídeo), sem compressão agressiva.",
  "Suba no painel (banco de imagens ou vídeos) e encaixe com arrastar / zoom.",
  "Texto de cupom/CTA pode ficar no Canva ou nas abas Título/Destaque do editor.",
  "Teste no celular: o site corta laterais — mantenha o foco no centro.",
];

/** Preset principal sugerido para o banner atual */
export function suggestCanvaSpec(
  layout: string,
  bannerSize: string
): CanvaArtSpec {
  const size = (["compact", "normal", "tall"].includes(bannerSize)
    ? bannerSize
    : "tall") as BannerSizeId;
  const lay = (
    ["studio", "fullbleed", "promo", "overlay", "cutouts"].includes(layout)
      ? layout
      : "studio"
  ) as BannerLayoutId;

  if (lay === "promo") {
    return (
      CANVA_ART_SPECS.find((s) => s.id === "promo-media") || CANVA_ART_SPECS[0]
    );
  }
  if (lay === "cutouts") {
    return (
      CANVA_ART_SPECS.find((s) => s.id === "cutout-model") || CANVA_ART_SPECS[0]
    );
  }

  const desktop = CANVA_ART_SPECS.find(
    (s) => s.sizes?.includes(size) && s.layouts.includes(lay)
  );
  if (desktop) return desktop;

  return (
    CANVA_ART_SPECS.find((s) => s.id === "desktop-tall") || CANVA_ART_SPECS[0]
  );
}

export function formatPx(width: number, height: number) {
  return `${width}×${height}`;
}

export function canvaSizeCopyText(width: number, height: number) {
  return `${width} x ${height} px`;
}
