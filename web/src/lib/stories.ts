import { prisma } from "@/lib/prisma";
import { resolveVideoPlayback } from "@/lib/videos";

export const STORIES_MAX_KEY = "storiesMaxActive";
/** Questionário único no fim de toda a sequência de stories. */
export const STORIES_SURVEY_KEY = "storiesSurveyQuestions";
export const DEFAULT_STORIES_MAX = 5;

export type StoryQuestion = {
  id: string;
  text: string;
  options: string[];
};

export type StoreStoryDTO = {
  id: string;
  videoUrl: string;
  title: string | null;
  questions: StoryQuestion[];
  /** @deprecated use questions */
  question: string | null;
  questionOpts: string[];
  shopHref: string | null;
  sortOrder: number;
};

export async function getStoriesMaxActive(): Promise<number> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: STORIES_MAX_KEY },
    });
    const n = Number(row?.value);
    if (Number.isFinite(n) && n >= 1 && n <= 20) return Math.floor(n);
  } catch {
    /* ignore */
  }
  return DEFAULT_STORIES_MAX;
}

export async function setStoriesMaxActive(max: number) {
  const value = String(Math.min(20, Math.max(1, Math.floor(max))));
  await prisma.siteSetting.upsert({
    where: { key: STORIES_MAX_KEY },
    create: { key: STORIES_MAX_KEY, value },
    update: { value },
  });
  return Number(value);
}

function parseOpts(raw: string | null | undefined): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
      return parsed.map((x) => String(x).trim()).filter(Boolean).slice(0, 4);
    }
  } catch {
    /* fallback: linhas */
  }
  return raw
    .split(/\n|,/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);
}

/** Lê 1+ perguntas (formato novo JSON de objetos, ou legado pergunta + opções). */
export function parseStoryQuestions(
  question: string | null | undefined,
  questionOpts: string | null | undefined
): StoryQuestion[] {
  if (questionOpts?.trim()) {
    try {
      const parsed = JSON.parse(questionOpts);
      if (
        Array.isArray(parsed) &&
        parsed.length > 0 &&
        typeof parsed[0] === "object" &&
        parsed[0] !== null &&
        "text" in parsed[0]
      ) {
        return parsed
          .map((q, i) => {
            const text = String((q as { text?: string }).text || "").trim();
            const rawOpts = (q as { options?: unknown }).options;
            const options = Array.isArray(rawOpts)
              ? rawOpts.map((x) => String(x).trim()).filter(Boolean).slice(0, 4)
              : ["Sim", "Não"];
            return {
              id: String((q as { id?: string }).id || i),
              text,
              options: options.length ? options : ["Sim", "Não"],
            };
          })
          .filter((q) => q.text)
          .slice(0, 8);
      }
    } catch {
      /* legado abaixo */
    }
  }

  if (question?.trim()) {
    const options = parseOpts(questionOpts);
    return [
      {
        id: "0",
        text: question.trim(),
        options: options.length ? options : ["Sim", "Não"],
      },
    ];
  }
  return [];
}

/** Serializa perguntas para gravar em questionOpts (+ first text em question). */
export function serializeStoryQuestions(questions: StoryQuestion[]) {
  const clean = questions
    .map((q, i) => ({
      id: q.id || String(i),
      text: String(q.text || "").trim(),
      options: (q.options || [])
        .map((o) => String(o).trim())
        .filter(Boolean)
        .slice(0, 4),
    }))
    .filter((q) => q.text)
    .slice(0, 8)
    .map((q) => ({
      ...q,
      options: q.options.length ? q.options : ["Sim", "Não"],
    }));

  return {
    question: clean[0]?.text || null,
    questionOpts: clean.length ? JSON.stringify(clean) : null,
  };
}

function questionsFromSettingValue(raw: string | null | undefined): StoryQuestion[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      // Formato serializeStoryQuestions: { question, questionOpts }
      if (
        parsed.length === 0 ||
        (typeof parsed[0] === "object" && parsed[0] && "text" in parsed[0])
      ) {
        return parseStoryQuestions(null, raw);
      }
    }
    if (
      parsed &&
      typeof parsed === "object" &&
      ("questionOpts" in parsed || "question" in parsed)
    ) {
      const row = parsed as { question?: string; questionOpts?: string };
      return parseStoryQuestions(
        row.question ?? null,
        typeof row.questionOpts === "string"
          ? row.questionOpts
          : row.questionOpts
            ? JSON.stringify(row.questionOpts)
            : null
      );
    }
  } catch {
    /* ignore */
  }
  return parseStoryQuestions(null, raw);
}

/** Questionário global (uma vez no fim de todos os vídeos). */
export async function getGlobalStoriesSurvey(): Promise<StoryQuestion[]> {
  try {
    const row = await prisma.siteSetting.findUnique({
      where: { key: STORIES_SURVEY_KEY },
    });
    return questionsFromSettingValue(row?.value);
  } catch {
    return [];
  }
}

export async function setGlobalStoriesSurvey(questions: StoryQuestion[]) {
  const packed = serializeStoryQuestions(questions);
  const value = packed.questionOpts
    ? packed.questionOpts
    : packed.question
      ? JSON.stringify([
          {
            id: "0",
            text: packed.question,
            options: ["Sim", "Não"],
          },
        ])
      : "";
  await prisma.siteSetting.upsert({
    where: { key: STORIES_SURVEY_KEY },
    create: { key: STORIES_SURVEY_KEY, value },
    update: { value },
  });
  return parseStoryQuestions(null, value || null);
}

/** Stories ativos do dia (até o limite das configurações). */
export async function getActiveStories(): Promise<StoreStoryDTO[]> {
  const max = await getStoriesMaxActive();
  const rows = await prisma.storeStory.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: max,
  });
  return rows
    .filter((r) => resolveVideoPlayback(r.videoUrl))
    .map((r) => {
      const questions = parseStoryQuestions(r.question, r.questionOpts);
      return {
        id: r.id,
        videoUrl: r.videoUrl,
        title: r.title,
        questions,
        question: questions[0]?.text || r.question,
        questionOpts: questions[0]?.options || parseOpts(r.questionOpts),
        shopHref: r.shopHref,
        sortOrder: r.sortOrder,
      };
    });
}
