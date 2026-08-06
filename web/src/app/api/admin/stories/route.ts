import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";
import { resolveVideoPlayback } from "@/lib/videos";
import {
  getStoriesMaxActive,
  setStoriesMaxActive,
  parseStoryQuestions,
  serializeStoryQuestions,
  getGlobalStoriesSurvey,
  setGlobalStoriesSurvey,
  type StoryQuestion,
} from "@/lib/stories";

async function requireStaff() {
  const session = await adminAuth();
  if (
    !session?.user ||
    (session.user.role !== "ADMIN" && session.user.role !== "STAFF")
  ) {
    return null;
  }
  return session;
}

function questionsFromBody(body: {
  questions?: unknown;
  question?: unknown;
  questionOpts?: unknown;
}): { question: string | null; questionOpts: string | null } {
  if (Array.isArray(body.questions)) {
    const list: StoryQuestion[] = body.questions.map((q, i) => {
      const row = q as { id?: string; text?: string; options?: string[] };
      return {
        id: String(row.id || i),
        text: String(row.text || "").trim(),
        options: Array.isArray(row.options)
          ? row.options.map((o) => String(o).trim()).filter(Boolean)
          : ["Sim", "Não"],
      };
    });
    return serializeStoryQuestions(list);
  }
  const question = body.question ? String(body.question).trim() : null;
  const questionOpts = body.questionOpts
    ? typeof body.questionOpts === "string"
      ? body.questionOpts
      : JSON.stringify(body.questionOpts)
    : null;
  return { question, questionOpts };
}

export async function GET() {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const [stories, maxActive, videoBank, surveyQuestions] = await Promise.all([
    prisma.storeStory.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      include: { _count: { select: { answers: true } } },
    }),
    getStoriesMaxActive(),
    prisma.videoAsset.findMany({
      where: { active: true },
      orderBy: { createdAt: "desc" },
      take: 80,
      select: { id: true, url: true, title: true, thumbUrl: true },
    }),
    getGlobalStoriesSurvey(),
  ]);

  const activeCount = stories.filter((s) => s.active).length;

  return NextResponse.json({
    maxActive,
    activeCount,
    surveyQuestions,
    stories: stories.map((s) => ({
      id: s.id,
      videoUrl: s.videoUrl,
      title: s.title,
      question: s.question,
      questionOpts: s.questionOpts,
      questions: parseStoryQuestions(s.question, s.questionOpts),
      shopHref: s.shopHref,
      sortOrder: s.sortOrder,
      active: s.active,
      answersCount: s._count.answers,
      createdAt: s.createdAt,
    })),
    videoBank,
  });
}

export async function POST(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();

    if (body.action === "setMax") {
      const max = await setStoriesMaxActive(Number(body.max) || 5);
      return NextResponse.json({ maxActive: max });
    }

    if (body.action === "applyQuestions") {
      const q = questionsFromBody(body);
      if (!q.question) {
        return NextResponse.json(
          { error: "Informe ao menos uma pergunta" },
          { status: 400 }
        );
      }
      const list = parseStoryQuestions(q.question, q.questionOpts);
      await setGlobalStoriesSurvey(list);
      // Remove cópias antigas nos vídeos — perguntas por story ficam só se
      // forem salvas de propósito em “Perguntas deste story”.
      await prisma.storeStory.updateMany({
        data: { question: null, questionOpts: null },
      });
      return NextResponse.json({
        surveyQuestions: list,
        clearedStoryQuestions: true,
      });
    }

    const videoUrl = String(body.videoUrl || "").trim();
    if (!videoUrl || !resolveVideoPlayback(videoUrl)) {
      return NextResponse.json(
        { error: "URL de vídeo inválida" },
        { status: 400 }
      );
    }

    const max = await getStoriesMaxActive();
    const activeCount = await prisma.storeStory.count({
      where: { active: true },
    });
    let active = Boolean(body.active);
    if (active && activeCount >= max) {
      active = false;
    }

    const maxSort = await prisma.storeStory.aggregate({
      _max: { sortOrder: true },
    });

    // Perguntas do formulário superior são o questionário global — não copiar
    // para cada vídeo novo. Perguntas por story só via PATCH.
    const story = await prisma.storeStory.create({
      data: {
        videoUrl,
        title: body.title ? String(body.title).trim() : null,
        question: null,
        questionOpts: null,
        shopHref: body.shopHref ? String(body.shopHref).trim() : null,
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        active,
      },
    });

    return NextResponse.json({ story }, { status: 201 });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao salvar" },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const id = String(body.id || "").trim();
    if (!id) {
      return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
    }

    if ("active" in body && body.active === true) {
      const max = await getStoriesMaxActive();
      const activeCount = await prisma.storeStory.count({
        where: { active: true, id: { not: id } },
      });
      if (activeCount >= max) {
        return NextResponse.json(
          {
            error: `Limite de ${max} stories ativos. Desative outro ou aumente o limite.`,
          },
          { status: 400 }
        );
      }
    }

    const data: Record<string, unknown> = {};
    if ("active" in body) data.active = Boolean(body.active);
    if ("title" in body)
      data.title = body.title ? String(body.title).trim() : null;
    if ("questions" in body || "question" in body || "questionOpts" in body) {
      const q = questionsFromBody(body);
      data.question = q.question;
      data.questionOpts = q.questionOpts;
    }
    if ("shopHref" in body)
      data.shopHref = body.shopHref ? String(body.shopHref).trim() : null;
    if ("sortOrder" in body) data.sortOrder = Number(body.sortOrder) || 0;
    if ("videoUrl" in body) {
      const url = String(body.videoUrl || "").trim();
      if (!resolveVideoPlayback(url)) {
        return NextResponse.json({ error: "URL inválida" }, { status: 400 });
      }
      data.videoUrl = url;
    }

    const story = await prisma.storeStory.update({ where: { id }, data });
    return NextResponse.json({ story });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha ao atualizar" },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  if (!(await requireStaff())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }
  const id = req.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id obrigatório" }, { status: 400 });
  }
  await prisma.storeStory.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
