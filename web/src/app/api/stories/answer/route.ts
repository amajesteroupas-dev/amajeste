import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type AnswerItem = {
  storyId: string;
  answer: string;
  kind?: "poll" | "comment";
};

/** Resposta pública ao questionário do fim dos stories. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const items: AnswerItem[] = [];

    if (Array.isArray(body.answers)) {
      for (const raw of body.answers) {
        const storyId = String(raw?.storyId || "").trim();
        const answer = String(raw?.answer || "").trim().slice(0, 500);
        const kind =
          raw?.kind === "comment" ? ("comment" as const) : ("poll" as const);
        if (storyId && answer) items.push({ storyId, answer, kind });
      }
    } else {
      const storyId = String(body.storyId || "").trim();
      const answer = String(body.answer || "").trim().slice(0, 500);
      const kind =
        body.kind === "comment" ? ("comment" as const) : ("poll" as const);
      if (storyId && answer) items.push({ storyId, answer, kind });
    }

    const comment = String(body.comment || "").trim().slice(0, 500);
    if (comment) {
      const attachId =
        String(body.storyId || "").trim() ||
        items[0]?.storyId ||
        "";
      if (attachId) {
        items.push({ storyId: attachId, answer: comment, kind: "comment" });
      }
    }

    if (items.length === 0) {
      return NextResponse.json(
        { error: "Nenhuma resposta enviada" },
        { status: 400 }
      );
    }

    const storyIds = [...new Set(items.map((i) => i.storyId))];
    const stories = await prisma.storeStory.findMany({
      where: { id: { in: storyIds }, active: true },
      select: { id: true },
    });
    const ok = new Set(stories.map((s) => s.id));
    const valid = items.filter((i) => ok.has(i.storyId));
    if (valid.length === 0) {
      return NextResponse.json(
        { error: "Story não encontrado" },
        { status: 404 }
      );
    }

    await prisma.storyAnswer.createMany({
      data: valid.map((i) => ({
        storyId: i.storyId,
        answer: i.answer,
        kind: i.kind || "poll",
      })),
    });

    return NextResponse.json({ ok: true, count: valid.length });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha" },
      { status: 400 }
    );
  }
}
