"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Heart,
  PictureInPicture2,
  Send,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import type { StoreStoryDTO, StoryQuestion } from "@/lib/stories";
import { resolveVideoPlayback } from "@/lib/videos";
import { whatsappUrl } from "@/lib/site";
import { useLiveMiniPlayer } from "@/components/store/LiveMiniPlayerContext";
import { WhatsAppIcon } from "@/components/store/WhatsAppIcon";

type Props = {
  stories: StoreStoryDTO[];
  /** Questionário final único (todos os vídeos). */
  surveyQuestions?: StoryQuestion[];
  open: boolean;
  onClose: () => void;
  initialIndex?: number;
};

function storyFrameSize() {
  if (typeof window === "undefined") return { w: 360, h: 640 };
  const maxH = window.innerHeight * 0.92;
  const maxW = Math.min(window.innerWidth * 0.96, 420);
  let h = maxH;
  let w = h * (9 / 16);
  if (w > maxW) {
    w = maxW;
    h = w * (16 / 9);
  }
  return { w: Math.round(w), h: Math.round(h) };
}

export function StoriesPlayer({
  stories,
  surveyQuestions = [],
  open,
  onClose,
  initialIndex = 0,
}: Props) {
  const [index, setIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [liked, setLiked] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState<"play" | "survey">("play");
  const [surveyEligible, setSurveyEligible] = useState(true);
  const [pollAnswers, setPollAnswers] = useState<Record<string, string>>({});
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [thanks, setThanks] = useState(false);
  const [size, setSize] = useState(storyFrameSize());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const { startMini } = useLiveMiniPlayer();

  const story = stories[index] || null;
  const playback = story ? resolveVideoPlayback(story.videoUrl) : null;

  const surveyItems = useMemo(() => {
    const items: {
      key: string;
      storyId: string;
      text: string;
      options: string[];
    }[] = [];
    const fallbackStoryId =
      stories[stories.length - 1]?.id || stories[0]?.id || "global";

    for (const q of surveyQuestions) {
      if (!q.text.trim()) continue;
      items.push({
        key: `global:${q.id}`,
        storyId: fallbackStoryId,
        text: q.text,
        options: q.options.length ? q.options : ["Sim", "Não"],
      });
    }

    // Perguntas extras só dos vídeos que tiverem questionário próprio
    for (const s of stories) {
      const list =
        s.questions?.length > 0
          ? s.questions
          : s.question
            ? [
                {
                  id: "0",
                  text: s.question,
                  options: s.questionOpts?.length
                    ? s.questionOpts
                    : ["Sim", "Não"],
                },
              ]
            : [];
      for (const q of list) {
        if (!q.text.trim()) continue;
        items.push({
          key: `${s.id}:${q.id}`,
          storyId: s.id,
          text: q.text,
          options: q.options.length ? q.options : ["Sim", "Não"],
        });
      }
    }
    return items;
  }, [stories, surveyQuestions]);

  const hasSurvey = surveyItems.length > 0;

  useEffect(() => {
    if (!open) return;
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, stories.length - 1)));
    setProgress(0);
    setPhase("play");
    setSurveyEligible(true);
    setPollAnswers({});
    setComment("");
    setThanks(false);
    setSending(false);
    setLiked(false);
    setSize(storyFrameSize());
  }, [open, initialIndex, stories.length]);

  useEffect(() => {
    if (!open || phase !== "play") return;
    setProgress(0);
    setLiked(false);
    const key = `majeste-story-liked-${story?.id}`;
    if (story && typeof window !== "undefined") {
      setLiked(localStorage.getItem(key) === "1");
    }
  }, [index, open, phase, story?.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (phase === "survey") finishClose();
        else onClose();
      }
      if (phase === "play") {
        if (e.key === "ArrowRight") go(1);
        if (e.key === "ArrowLeft") go(-1);
      }
    };
    function onResize() {
      setSize(storyFrameSize());
    }
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prev;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, stories.length, phase]);

  useEffect(() => {
    const el = videoRef.current;
    if (!el || !open || phase !== "play") return;
    const video = el;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    function onTime() {
      if (!video.duration || !Number.isFinite(video.duration)) return;
      setProgress(video.currentTime / video.duration);
    }
    const tryPlay = () => {
      void video.play().catch(() => undefined);
    };
    tryPlay();
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("loadeddata", tryPlay);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("loadeddata", tryPlay);
    };
  }, [open, index, playback?.src, phase]);

  function finishClose() {
    onClose();
  }

  /** Só no fim da sequência, se não minimizou / “continuar no site”. */
  function openEndSurveyOrClose() {
    if (surveyEligible && hasSurvey) {
      videoRef.current?.pause();
      setPhase("survey");
      return;
    }
    finishClose();
  }

  function go(dir: -1 | 1) {
    const next = index + dir;
    if (next < 0) {
      finishClose();
      return;
    }
    if (next >= stories.length) {
      openEndSurveyOrClose();
      return;
    }
    setIndex(next);
  }

  function continueOnSite() {
    setSurveyEligible(false);
    const urls = stories.map((s) => s.videoUrl);
    const t = videoRef.current?.currentTime || 0;
    startMini({
      urls,
      currentUrl: story!.videoUrl,
      title: story!.title || "Stories",
      currentTime: t,
    });
    finishClose();
  }

  async function submitSurvey() {
    if (sending || thanks) return;
    setSending(true);
    try {
      const answers = surveyItems
        .map((q) => {
          const a = pollAnswers[q.key]?.trim();
          if (!a) return null;
          return {
            storyId: q.storyId,
            answer: `${q.text}: ${a}`,
            kind: "poll" as const,
          };
        })
        .filter(Boolean);

      const attachId =
        surveyItems[0]?.storyId ||
        stories[stories.length - 1]?.id ||
        stories[0]?.id;

      await fetch("/api/stories/answer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers,
          comment: comment.trim() || undefined,
          storyId: attachId,
        }),
      });
      setThanks(true);
      setTimeout(() => finishClose(), 900);
    } catch {
      finishClose();
    } finally {
      setSending(false);
    }
  }

  async function share() {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    try {
      if (navigator.share) {
        await navigator.share({
          title: story?.title || "Majesté",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
      }
    } catch {
      /* ignore */
    }
  }

  function toggleLike() {
    if (!story) return;
    const next = !liked;
    setLiked(next);
    try {
      localStorage.setItem(
        `majeste-story-liked-${story.id}`,
        next ? "1" : "0"
      );
    } catch {
      /* ignore */
    }
  }

  if (!open || !story || !playback || playback.kind !== "file") return null;

  return (
    <div
      className="stories-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Stories Majesté"
      onClick={() => {
        if (phase === "survey") return;
        finishClose();
      }}
    >
      <div
        className="stories-frame"
        style={{ width: size.w, height: size.h }}
        onClick={(e) => e.stopPropagation()}
      >
        {phase === "play" ? (
          <>
            <div className="stories-progress">
              {stories.map((s, i) => (
                <div key={s.id} className="stories-progress-track">
                  <div
                    className="stories-progress-fill"
                    style={{
                      width:
                        i < index
                          ? "100%"
                          : i === index
                            ? `${Math.round(progress * 100)}%`
                            : "0%",
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="stories-top">
              <span className="stories-brand">Majesté</span>
              <div className="stories-top-actions">
                <button
                  type="button"
                  className="stories-icon-btn"
                  aria-label="Continuar no site"
                  title="Continuar no site"
                  onClick={continueOnSite}
                >
                  <PictureInPicture2 size={16} />
                </button>
                <button
                  type="button"
                  className="stories-icon-btn"
                  aria-label="Fechar"
                  onClick={finishClose}
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <video
              ref={videoRef}
              key={playback.src}
              className="stories-video"
              autoPlay
              playsInline
              muted={muted}
              preload="auto"
              onEnded={() => go(1)}
              onError={() => go(1)}
            >
              <source src={playback.src} type="video/mp4" />
            </video>

            <button
              type="button"
              className="stories-tap stories-tap-left"
              aria-label="Anterior"
              onClick={() => go(-1)}
            />
            <button
              type="button"
              className="stories-tap stories-tap-right"
              aria-label="Próximo"
              onClick={() => go(1)}
            />

            <div className="stories-side">
              <button
                type="button"
                className={`stories-side-btn${liked ? " is-on" : ""}`}
                aria-label="Curtir"
                onClick={toggleLike}
              >
                <Heart size={20} fill={liked ? "currentColor" : "none"} />
              </button>
              {story.shopHref ? (
                story.shopHref.startsWith("/") ? (
                  <Link
                    href={story.shopHref}
                    className="stories-side-btn"
                    aria-label="Ver produto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ShoppingBag size={20} />
                  </Link>
                ) : (
                  <a
                    href={story.shopHref}
                    className="stories-side-btn"
                    aria-label="Ver produto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ShoppingBag size={20} />
                  </a>
                )
              ) : (
                <Link
                  href="/categoria/conjunto-legging"
                  className="stories-side-btn"
                  aria-label="Comprar"
                >
                  <ShoppingBag size={20} />
                </Link>
              )}
              <a
                href={whatsappUrl(
                  `Olá! Vi o story${story.title ? ` “${story.title}”` : ""} no site da Majesté.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className="stories-side-btn"
                aria-label="WhatsApp"
              >
                <WhatsAppIcon size={20} />
              </a>
              <button
                type="button"
                className="stories-side-btn"
                aria-label="Compartilhar"
                onClick={() => void share()}
              >
                <Send size={18} />
              </button>
              <button
                type="button"
                className="stories-side-btn"
                aria-label={muted ? "Ativar som" : "Silenciar"}
                onClick={() => setMuted((m) => !m)}
              >
                {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
            </div>
          </>
        ) : (
          <div className="stories-survey">
            <div className="stories-survey-head">
              <span className="stories-brand">Majesté</span>
              <button
                type="button"
                className="stories-icon-btn"
                aria-label="Fechar"
                onClick={finishClose}
              >
                <X size={18} />
              </button>
            </div>

            {thanks ? (
              <p className="stories-survey-thanks">Obrigada pela resposta!</p>
            ) : (
              <>
                <div className="stories-survey-body">
                  {surveyItems.map((q) => (
                    <div key={q.key} className="stories-survey-block">
                      <p className="stories-ask-q">{q.text}</p>
                      <div className="stories-ask-opts">
                        {q.options.map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            className={`stories-ask-btn${
                              pollAnswers[q.key] === opt ? " is-selected" : ""
                            }`}
                            onClick={() =>
                              setPollAnswers((prev) => ({
                                ...prev,
                                [q.key]: opt,
                              }))
                            }
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}

                  <label className="stories-survey-comment">
                    <span>Comentário, elogio ou sugestão</span>
                    <textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value.slice(0, 500))}
                      rows={3}
                      placeholder="Escreva aqui (opcional)"
                      maxLength={500}
                    />
                  </label>
                </div>

                <div className="stories-survey-actions">
                  <button
                    type="button"
                    className="stories-survey-skip"
                    onClick={finishClose}
                    disabled={sending}
                  >
                    Pular
                  </button>
                  <button
                    type="button"
                    className="stories-survey-send"
                    onClick={() => void submitSurvey()}
                    disabled={
                      sending ||
                      (Object.keys(pollAnswers).length === 0 &&
                        !comment.trim())
                    }
                  >
                    {sending ? "Salvando…" : "Salvar"}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
