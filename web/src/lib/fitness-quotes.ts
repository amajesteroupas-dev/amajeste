/** Frases motivacionais — saúde, corpo e força (área da cliente) */

export const FITNESS_QUOTES = [
  "Cuidar do corpo é um ato de amor — não de cobrança.",
  "Forte, leve e presente: você merece se sentir assim todos os dias.",
  "Movimento cura. Constância transforma.",
  "Sua saúde é o maior investimento que você pode fazer.",
  "Não é sobre ser perfeita. É sobre não desistir de você.",
  "Treine com intenção. Descanse com gratidão.",
  "O corpo que você cuida hoje agradece amanhã.",
  "Disciplina com carinho: esse é o verdadeiro glow up.",
  "Você não precisa correr. Só precisa continuar.",
  "Vista sua força — por dentro e por fora.",
  "Água, sono, movimento e paz: o combo que muda tudo.",
  "Cada treino é um encontro consigo mesma.",
  "Saúde mental também é musculatura. Cuide.",
  "Mulher que se prioriza, floresce.",
  "Seu ritmo é válido. Seu esforço é belo.",
  "Coma para nutrir. Treine para viver. Durma para renovar.",
  "O espelho muda quando o amor próprio cresce.",
  "Hoje é um ótimo dia para cuidar de você.",
];

export function fitnessQuoteForDate(date = new Date()): string {
  const start = Date.UTC(date.getFullYear(), 0, 0);
  const day = Math.floor((date.getTime() - start) / 86_400_000);
  return FITNESS_QUOTES[day % FITNESS_QUOTES.length]!;
}
