export type AdminQuoteCategory = "negocios" | "fitness" | "fe";

export type AdminQuote = {
  text: string;
  category: AdminQuoteCategory;
};

export const ADMIN_QUOTE_LABELS: Record<AdminQuoteCategory, string> = {
  negocios: "Negócios",
  fitness: "Fitness",
  fe: "Fé",
};

/** Frases curtas para o painel — incentivo diário. */
export const ADMIN_QUOTES: AdminQuote[] = [
  // Negócios / empreendedorismo
  {
    category: "negocios",
    text: "Cada pedido é uma pessoa confiante na sua marca. Continue.",
  },
  {
    category: "negocios",
    text: "O sucesso não é mágica — é constância com coração.",
  },
  {
    category: "negocios",
    text: "Hoje você planta. Amanhã a loja colhe.",
  },
  {
    category: "negocios",
    text: "Não desista no dia em que ainda não viu o resultado.",
  },
  {
    category: "negocios",
    text: "Sua loja cresce no ritmo da sua coragem.",
  },
  {
    category: "negocios",
    text: "Quem começa pequeno e persiste, chega longe.",
  },
  {
    category: "negocios",
    text: "Erros ensinam. Persistência constrói impérios.",
  },
  {
    category: "negocios",
    text: "Você não precisa ser perfeita — precisa ser consistente.",
  },
  {
    category: "negocios",
    text: "A Majesté existe porque você acreditou. Continue acreditando.",
  },
  {
    category: "negocios",
    text: "Um dia de cada vez. Uma venda de cada vez. Sempre pra frente.",
  },

  // Fitness
  {
    category: "fitness",
    text: "Disciplina no corpo. Foco no negócio. Força no coração.",
  },
  {
    category: "fitness",
    text: "Vista sua força — e viva o que você vende.",
  },
  {
    category: "fitness",
    text: "O corpo que treina lembra: dor passa, resultado fica.",
  },
  {
    category: "fitness",
    text: "Movimento gera energia. Energia move a loja.",
  },
  {
    category: "fitness",
    text: "Força não é só no peso — é não largar o sonho.",
  },
  {
    category: "fitness",
    text: "Treine a mente como treina o corpo: com intenção.",
  },
  {
    category: "fitness",
    text: "Sua melhor versão começa no próximo passo.",
  },
  {
    category: "fitness",
    text: "Performance com elegância — dentro e fora da academia.",
  },

  // Orações / fé
  {
    category: "fe",
    text: "Senhor, abençoe cada cliente, cada pedido e cada dia desta loja.",
  },
  {
    category: "fe",
    text: "Que a paz de Deus guie suas decisões e acalme sua pressa.",
  },
  {
    category: "fe",
    text: "Confie: o que é seu, com fé e trabalho, chega no tempo certo.",
  },
  {
    category: "fe",
    text: "Deus, fortaleça minhas mãos e ilumine o caminho da Majesté.",
  },
  {
    category: "fe",
    text: "Gratidão pelo que já veio. Fé pelo que ainda vem.",
  },
  {
    category: "fe",
    text: "Não temas — quem te chama também te sustenta.",
  },
  {
    category: "fe",
    text: "Que cada manhã traga esperança nova e força renovada.",
  },
  {
    category: "fe",
    text: "Entrega teus planos ao Senhor — e segue trabalhando com amor.",
  },
];

/** Índice estável do dia (muda 1x por dia). */
export function quoteIndexForDate(date = new Date()): number {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return day % ADMIN_QUOTES.length;
}
