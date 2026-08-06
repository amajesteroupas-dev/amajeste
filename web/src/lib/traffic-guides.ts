export type TrafficPlatform =
  | "meta"
  | "google"
  | "tiktok"
  | "pinterest"
  | "whatsapp"
  | "organic_ig"
  | "organic_google"
  | "other";

export const TRAFFIC_PLATFORMS: {
  id: TrafficPlatform;
  label: string;
  kind: "paid" | "organic" | "both";
}[] = [
  { id: "meta", label: "Meta (Instagram / Facebook)", kind: "both" },
  { id: "google", label: "Google Ads", kind: "paid" },
  { id: "tiktok", label: "TikTok Ads", kind: "paid" },
  { id: "pinterest", label: "Pinterest Ads", kind: "paid" },
  { id: "whatsapp", label: "WhatsApp / Status", kind: "both" },
  { id: "organic_ig", label: "Instagram orgânico", kind: "organic" },
  { id: "organic_google", label: "Google orgânico (SEO)", kind: "organic" },
  { id: "other", label: "Outro", kind: "both" },
];

export type GuideSection = {
  id: string;
  title: string;
  kind: "paid" | "organic" | "basics";
  platforms: string[];
  summary: string;
  steps: string[];
  tips: string[];
  mistakes: string[];
};

/** Conteúdo didático para dona da loja — moda fitness / e-commerce. */
export const TRAFFIC_GUIDES: GuideSection[] = [
  {
    id: "basics",
    title: "O que é tráfego (pago x orgânico)",
    kind: "basics",
    platforms: ["todas"],
    summary:
      "Tráfego é gente chegando na loja. Orgânico vem de conteúdo, busca e indicação (sem pagar por clique). Pago é anúncio: você investe para aparecer na hora certa para a pessoa certa.",
    steps: [
      "Defina o objetivo da semana: visitas, vendas ou lista de WhatsApp.",
      "Separe um orçamento diário pequeno e constante (melhor que gastar tudo em 1 dia).",
      "Meça: visitas do site, pedidos pagos e quanto gastou em anúncio.",
      "Repita o que deu ROAS positivo (receita ÷ investimento).",
    ],
    tips: [
      "Para moda fitness, vídeo curto (Reels/TikTok) + foto de produto no site funcionam juntos.",
      "Sempre mande o anúncio para uma página de produto ou coleção, não só para a home.",
      "Use o mesmo visual e oferta no anúncio e na página (senão a cliente abandona).",
      "Na Central de Vendas: defina a Oferta → copie o link UTM → só anuncie com score ≥ 70.",
      "Meta boa: custo por pedido bem abaixo da margem (preço − custo − frete/taxas).",
    ],
    mistakes: [
      "Anunciar sem estoque das cores/tamanhos do criativo.",
      "Mudar criativo e público todo dia — o algoritmo precisa de dados.",
      "Olhar só curtidas: o que importa é venda e custo por pedido.",
    ],
  },
  {
    id: "meta-paid",
    title: "Meta Ads — Instagram e Facebook (pago)",
    kind: "paid",
    platforms: ["Instagram", "Facebook"],
    summary:
      "Melhor ponto de partida para Majesté: público feminino, interesse em fitness e compra por impulso visual. Comece com campanha de vendas (catálogo ou conversão no site).",
    steps: [
      "Crie Business Manager + Pixel (ou API de conversões) no site amajeste.com.br.",
      "Objetivo: Vendas / Conversões (compra) ou Tráfego (se o Pixel ainda estiver frio).",
      "Público: mulheres 18–45, Brasil; interesses fitness, academia, moda esportiva; + lookalike de compradoras quando tiver 50+ pedidos.",
      "Criativo: 3–5 artes ou Reels (antes/depois, prova social, detalhe do tecido, CTA “Comprar no site”).",
      "Orçamento: comece com valor diário fixo; teste 3 criativos no mesmo conjunto.",
      "Otimize após 3–4 dias: pause o que não gera cliques ou pedidos; escale o vencedor.",
    ],
    tips: [
      "Stories/Reels ads com UGC (cliente real) costumam converter melhor que foto de estúdio sozinha.",
      "Use código UTM no link (?utm_source=meta&utm_campaign=...) para saber a origem.",
      "Retargeting: quem visitou produto e não comprou — anúncio com prova social ou frete.",
    ],
    mistakes: [
      "Vários públicos muito pequenos ao mesmo tempo.",
      "Texto longo demais no anúncio sem benefício claro (tecido, modelagem, frete, Pix).",
      "Não acompanhar estoque das peças anunciadas.",
    ],
  },
  {
    id: "google-paid",
    title: "Google Ads (pago)",
    kind: "paid",
    platforms: ["Google", "YouTube"],
    summary:
      "Bom para quem já busca “conjunto legging”, “macaquinho fitness”. Capture intenção de compra com Pesquisa e Remarketing.",
    steps: [
      "Campanha Pesquisa: palavras do tipo conjunto fitness, legging academia + marca Majesté.",
      "Anúncio responsivo de pesquisa com título + preço/benefício (Pix, frete).",
      "Remarketing Display/YouTube para quem visitou o site.",
      "Exclua termos irrelevantes (grátis, PDF, emprego).",
    ],
    tips: [
      "Comece com orçamento menor que Meta até o site ter volume de busca da marca.",
      "Página de destino deve bater com a palavra (categoria Conjunto Legging, não home).",
    ],
    mistakes: [
      "Apostar só em palavras genéricas caras sem página otimizada.",
      "Não usar exclusões negativas.",
    ],
  },
  {
    id: "tiktok-paid",
    title: "TikTok Ads (pago)",
    kind: "paid",
    platforms: ["TikTok"],
    summary:
      "Forte para descoberta e tendência. Criativos nativos (parece orgânico) vendem mais que anúncio “bonitinho demais”.",
    steps: [
      "Conta TikTok Ads + pixel do TikTok no site.",
      "Campanha de conversão ou tráfego para PDP.",
      "Criativo vertical 9:16, 9–15s, gancho nos 2 primeiros segundos.",
      "Teste sons em alta e texto na tela (muita gente assiste sem som).",
    ],
    tips: [
      "Reaproveite Reels que já performaram organicamente.",
      "Público amplo no início; deixe o algoritmo achar compradoras.",
    ],
    mistakes: [
      "Usar só foto estática de catálogo.",
      "CTA fraco (“saiba mais”) em vez de “compre no site”.",
    ],
  },
  {
    id: "pinterest-paid",
    title: "Pinterest Ads (pago)",
    kind: "paid",
    platforms: ["Pinterest"],
    summary:
      "Ótimo para moda e inspiração de look. A cliente salva e volta para comprar — ciclo um pouco mais longo.",
    steps: [
      "Pins verticais de alta qualidade (produto + lifestyle).",
      "Campanha de consideração ou conversão com catálogo.",
      "Palavras: look academia, outfit fitness, conjunto legging.",
    ],
    tips: [
      "Descrições com palavras que a cliente pesquisa.",
      "Combine com pins orgânicos semanais.",
    ],
    mistakes: [
      "Imagem cortada ou com pouco contraste.",
      "Esperar venda no mesmo dia (é funil de inspiração).",
    ],
  },
  {
    id: "whatsapp",
    title: "WhatsApp e Status",
    kind: "paid",
    platforms: ["WhatsApp"],
    summary:
      "Canal de fechamento: muitas clientes tiram dúvida e compram por conversa. Tráfego pago pode mandar para WhatsApp ou site.",
    steps: [
      "Link wa.me com mensagem pronta (“Vi o conjunto X no site”).",
      "Status diário com novidade + link da loja.",
      "Catálogo WhatsApp alinhado aos produtos ativos.",
      "Respostas rápidas: tamanho, tecido, prazo, Pix.",
    ],
    tips: [
      "Anúncio Meta com destino WhatsApp + link do produto no site.",
      "Salve as dúvidas mais comuns e transforme em Stories.",
    ],
    mistakes: [
      "Demorar para responder leads quentes.",
      "Prometer prazo/estoque sem conferir o painel.",
    ],
  },
  {
    id: "organic-ig",
    title: "Instagram orgânico",
    kind: "organic",
    platforms: ["Instagram"],
    summary:
      "Base da marca: Reels, Stories e posts constroem confiança. Orgânico alimenta o pago (criativos testados barato).",
    steps: [
      "3–5 Reels/semana: bastidores, prova de uso, detalhe do produto.",
      "Stories todo dia: enquete, estoque, cupom, bastidor.",
      "Bio com link direto para loja ou link na bio atualizado.",
      "Responda DMs e comentários — isso aumenta alcance.",
    ],
    tips: [
      "O painel já tem Stories do dia e banco de vídeos — use isso no calendário.",
      "Hashtags de nicho + localização da cidade ajudam descoberta local.",
    ],
    mistakes: [
      "Só postar foto de produto sem contexto de uso.",
      "Sumir semanas e voltar só com anúncio.",
    ],
  },
  {
    id: "organic-seo",
    title: "Google orgânico (SEO)",
    kind: "organic",
    platforms: ["Google"],
    summary:
      "Textos e títulos bons fazem a loja aparecer em buscas sem pagar. É lento, mas barato no longo prazo.",
    steps: [
      "Nome e descrição de produto claros (ex.: “Conjunto legging preto academia”).",
      "Categorias bem nomeadas e com texto curto útil.",
      "Fotos leves e rápidas (já otimizadas no site).",
      "Peça avaliação de clientes (prova social indexável).",
    ],
    tips: [
      "Publique looks e combinações — páginas com conteúdo ranqueiam melhor.",
      "Mantenha produtos ativos e estoque atualizado (Google gosta de páginas úteis).",
    ],
    mistakes: [
      "Títulos genéricos (“Produto 01”).",
      "Páginas duplicadas ou vazias.",
    ],
  },
];

export const TRAFFIC_PLAYBOOK = {
  weekly: [
    "Segunda: escolher 1 objetivo e 1 oferta da semana (aba Oferta).",
    "Terça: produzir 2 criativos (foto + vídeo curto) com o gancho da oferta.",
    "Quarta: só anunciar se o Pré-anúncio estiver ≥ 70; orçamento diário fixo.",
    "Quinta: Stories + Reels orgânicos puxando a mesma oferta (calendário).",
    "Sexta: olhar Funil + ROAS; pausar o que não vende; responder WhatsApp.",
    "Sábado/Domingo: reforço orgânico e atendimento — o fechamento vende.",
  ],
  successFormula: [
    "Oferta clara + estoque ok (Central → Oferta da semana)",
    "Criativo que para o scroll (rosto, movimento, benefício)",
    "Página de destino rápida e igual ao anúncio (link UTM)",
    "Pixel/conversões medindo compra (Integrações Ads)",
    "Orgânico testa → pago escala o vencedor",
    "Custo por pedido menor que a margem do produto",
    "Orçamento constante + paciência de 3–4 dias por teste",
  ],
};
