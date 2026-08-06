"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  parseStoryQuestions,
  type StoryQuestion,
} from "@/lib/stories";

type StoryRow = {
  id: string;
  videoUrl: string;
  title: string | null;
  question: string | null;
  questionOpts: string | null;
  questions?: StoryQuestion[];
  shopHref: string | null;
  sortOrder: number;
  active: boolean;
  answersCount: number;
};

type BankItem = {
  id: string;
  url: string;
  title: string | null;
  thumbUrl: string | null;
};

/** Preview que roda no quadrado (mudo + loop). Toque pausa/retoma. */
function StoryPreviewVideo({
  src,
  poster,
}: {
  src: string;
  poster?: string | null;
}) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    el.defaultMuted = true;
    const tryPlay = () => {
      const p = el.play();
      if (p) void p.catch(() => undefined);
    };
    tryPlay();
    el.addEventListener("loadeddata", tryPlay);
    el.addEventListener("canplay", tryPlay);
    return () => {
      el.removeEventListener("loadeddata", tryPlay);
      el.removeEventListener("canplay", tryPlay);
    };
  }, [src]);

  // #t=0.1 ajuda o iOS a mostrar o 1º quadro em vez de tela preta
  const playSrc = src.includes("#") ? src : `${src}#t=0.1`;

  return (
    <video
      ref={ref}
      key={src}
      src={playSrc}
      poster={poster || undefined}
      className="h-full w-full object-cover bg-black"
      muted
      playsInline
      autoPlay
      loop
      preload="auto"
      controls={false}
      onClick={(e) => {
        const v = e.currentTarget;
        if (v.paused) void v.play().catch(() => undefined);
        else v.pause();
      }}
    />
  );
}

function blankQuestion(): StoryQuestion {
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    text: "",
    options: ["", ""],
  };
}

const MAX_ANSWERS = 4;

function QuestionsEditor({
  value,
  onChange,
  disabled,
}: {
  value: StoryQuestion[];
  onChange: (next: StoryQuestion[]) => void;
  disabled?: boolean;
}) {
  function update(i: number, patch: Partial<StoryQuestion>) {
    onChange(value.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }

  function setAnswer(qi: number, ai: number, text: string) {
    const q = value[qi];
    if (!q) return;
    const opts = [...q.options];
    while (opts.length <= ai) opts.push("");
    opts[ai] = text;
    update(qi, { options: opts.slice(0, MAX_ANSWERS) });
  }

  function addAnswer(qi: number) {
    const q = value[qi];
    if (!q || q.options.length >= MAX_ANSWERS) return;
    update(qi, { options: [...q.options, ""] });
  }

  function removeAnswer(qi: number, ai: number) {
    const q = value[qi];
    if (!q || q.options.length <= 1) return;
    update(qi, { options: q.options.filter((_, idx) => idx !== ai) });
  }

  return (
    <div className="space-y-3">
      {value.map((q, i) => {
        const answers =
          q.options.length > 0 ? q.options.slice(0, MAX_ANSWERS) : [""];
        return (
          <div
            key={q.id}
            className="border border-black/10 bg-[#faf7f3] p-3 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs uppercase tracking-wider text-muted">
                Pergunta {i + 1}
              </span>
              <button
                type="button"
                className="text-xs text-red-700 disabled:opacity-40"
                disabled={disabled || value.length <= 1}
                onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              >
                Remover
              </button>
            </div>
            <input
              className="input"
              value={q.text}
              onChange={(e) => update(i, { text: e.target.value })}
              placeholder="Texto da pergunta"
              disabled={disabled}
              maxLength={200}
            />

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-wider text-muted">
                Respostas (máx. {MAX_ANSWERS})
              </p>
              {answers.map((opt, ai) => (
                <div key={ai} className="flex items-center gap-2">
                  <input
                    className="input flex-1"
                    value={opt}
                    onChange={(e) => setAnswer(i, ai, e.target.value)}
                    placeholder={`Resposta ${ai + 1}`}
                    disabled={disabled}
                    maxLength={120}
                  />
                  <button
                    type="button"
                    className="text-xs text-red-700 shrink-0 disabled:opacity-40 px-1"
                    disabled={disabled || answers.length <= 1}
                    onClick={() => removeAnswer(i, ai)}
                    aria-label={`Remover resposta ${ai + 1}`}
                  >
                    Remover
                  </button>
                </div>
              ))}
              {answers.length < MAX_ANSWERS ? (
                <button
                  type="button"
                  className="btn btn-outline !py-1.5 !px-2 text-xs inline-flex items-center gap-1"
                  disabled={disabled}
                  onClick={() => addAnswer(i)}
                >
                  <Plus size={12} />
                  Adicionar resposta
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
      <button
        type="button"
        className="btn btn-outline !py-2 inline-flex items-center gap-1"
        disabled={disabled || value.length >= 8}
        onClick={() => onChange([...value, blankQuestion()])}
      >
        <Plus size={14} />
        Adicionar pergunta
      </button>
    </div>
  );
}

export function StoriesAdmin() {
  const [stories, setStories] = useState<StoryRow[]>([]);
  const [bank, setBank] = useState<BankItem[]>([]);
  const [maxActive, setMaxActive] = useState(5);
  const [activeCount, setActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");

  const [videoUrl, setVideoUrl] = useState("");
  const [title, setTitle] = useState("");
  const [shopHref, setShopHref] = useState("");
  const [questions, setQuestions] = useState<StoryQuestion[]>([blankQuestion()]);
  const [editQuestions, setEditQuestions] = useState<
    Record<string, StoryQuestion[]>
  >({});

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stories");
      if (!res.ok) return;
      const data = await res.json();
      const list: StoryRow[] = data.stories || [];
      setStories(list);
      setBank(data.videoBank || []);
      setMaxActive(data.maxActive || 5);
      setActiveCount(data.activeCount || 0);
      const map: Record<string, StoryQuestion[]> = {};
      for (const s of list) {
        map[s.id] =
          s.questions?.length
            ? s.questions
            : parseStoryQuestions(s.question, s.questionOpts);
        if (map[s.id].length === 0) map[s.id] = [blankQuestion()];
      }
      setEditQuestions(map);
      const survey: StoryQuestion[] = data.surveyQuestions || [];
      setQuestions(survey.length ? survey : [blankQuestion()]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function saveMax(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "setMax", max: maxActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setMaxActive(data.maxActive);
      setStatus(`Limite salvo: ${data.maxActive} stories ativos`);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function addStory(e: FormEvent) {
    e.preventDefault();
    if (!videoUrl.trim()) return;
    setBusy(true);
    setStatus("Salvando story…");
    try {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          videoUrl: videoUrl.trim(),
          title: title.trim() || undefined,
          shopHref: shopHref.trim() || undefined,
          active: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setVideoUrl("");
      setTitle("");
      setShopHref("");
      setStatus(
        data.story?.active
          ? "Story adicionado e ativado"
          : "Story salvo (inativo — limite de ativos atingido)"
      );
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function saveQuestions(s: StoryRow) {
    setBusy(true);
    setStatus("Salvando perguntas deste vídeo…");
    try {
      const list = (editQuestions[s.id] || []).filter((q) => q.text.trim());
      const res = await fetch("/api/admin/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, questions: list }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setStatus(
        list.length
          ? "Perguntas extras deste vídeo salvas"
          : "Perguntas deste vídeo removidas"
      );
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function saveQuestionnaireToActive() {
    const list = questions.filter((q) => q.text.trim());
    if (list.length === 0) {
      setStatus("Informe ao menos uma pergunta");
      return;
    }
    setBusy(true);
    setStatus("Salvando questionário final…");
    try {
      const res = await fetch("/api/admin/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "applyQuestions",
          questions: list,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      setStatus(
        "Questionário final salvo — aparece uma vez no fim de todos os vídeos"
      );
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(s: StoryRow) {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/stories", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: s.id, active: !s.active }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Falha");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  async function remove(s: StoryRow) {
    if (!confirm("Remover este story?")) return;
    setBusy(true);
    try {
      const res = await fetch(
        `/api/admin/stories?id=${encodeURIComponent(s.id)}`,
        { method: "DELETE" }
      );
      if (!res.ok) throw new Error("Falha ao excluir");
      await load();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1
          className="text-2xl md:text-3xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Stories do dia
        </h1>
        <p className="text-sm text-muted mt-1">
          Escolha até {maxActive} vídeos. O{" "}
          <strong>questionário final</strong> aparece uma vez no fim da
          sequência (se o cliente assistir sem minimizar). Perguntas em cada
          vídeo são opcionais e extras. Respostas vão em Reclamações / Elogios.
        </p>
      </div>

      <form
        onSubmit={saveMax}
        className="border border-black/10 bg-white p-4 flex flex-wrap items-end gap-3"
      >
        <label className="text-xs uppercase tracking-wider text-muted">
          Máximo de stories ativos
          <input
            className="input mt-1 w-24"
            type="number"
            min={1}
            max={20}
            value={maxActive}
            onChange={(e) => setMaxActive(Number(e.target.value) || 5)}
            disabled={busy}
          />
        </label>
        <button type="submit" className="btn btn-outline !py-2" disabled={busy}>
          Salvar limite
        </button>
        <span className="text-sm text-muted self-center">
          Ativos agora: {activeCount}/{maxActive}
        </span>
      </form>

      <section className="border border-black/10 bg-white p-5 space-y-4">
        <h2 className="text-lg font-medium">Adicionar story</h2>
        <form onSubmit={addStory} className="space-y-3">
          <label className="block text-xs uppercase tracking-wider text-muted">
            Vídeo (do banco ou URL)
            <select
              className="input mt-1"
              value={videoUrl.startsWith("/uploads/") ? videoUrl : ""}
              onChange={(e) => setVideoUrl(e.target.value)}
              disabled={busy}
            >
              <option value="">Selecione do banco…</option>
              {bank.map((b) => (
                <option key={b.id} value={b.url}>
                  {b.title || b.url}
                </option>
              ))}
            </select>
          </label>
          <input
            className="input"
            value={videoUrl}
            onChange={(e) => setVideoUrl(e.target.value)}
            placeholder="Ou cole a URL /uploads/…"
            disabled={busy}
          />
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Título (opcional)"
            disabled={busy}
          />
          <input
            className="input"
            value={shopHref}
            onChange={(e) => setShopHref(e.target.value)}
            placeholder="Link da sacola — ex: /produto/macacao-isa"
            disabled={busy}
          />
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">
              Questionário final (todos os vídeos)
            </p>
            <p className="text-sm text-muted mb-2">
              Aparece <strong>uma vez</strong> no fim da sequência. Para
              perguntas só de um vídeo, use “Perguntas deste story” abaixo.
            </p>
            <QuestionsEditor
              value={questions}
              onChange={setQuestions}
              disabled={busy}
            />
            <button
              type="button"
              className="btn btn-primary !py-2 mt-3"
              disabled={busy || !questions.some((q) => q.text.trim())}
              onClick={() => void saveQuestionnaireToActive()}
            >
              Salvar questionário
            </button>
          </div>
          <button
            type="submit"
            className="btn btn-outline !py-2"
            disabled={busy || !videoUrl.trim()}
          >
            Adicionar story
          </button>
        </form>
        {status ? (
          <p className="text-sm text-[var(--rose)]">{status}</p>
        ) : null}
      </section>

      <section className="border border-black/10 bg-white p-5 space-y-3">
        <h2 className="text-lg font-medium">Stories cadastrados</h2>
        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : stories.length === 0 ? (
          <p className="text-sm text-muted">
            Nenhum story. Adicione vídeos do banco.
          </p>
        ) : (
          <ul className="space-y-4">
            {stories.map((s) => {
              const qs = editQuestions[s.id] || [blankQuestion()];
              return (
                <li
                  key={s.id}
                  className={`border border-black/8 p-3 space-y-3 ${
                    s.active ? "bg-[#faf7f3]" : "bg-[#f0ece8] opacity-90"
                  }`}
                >
                  <div className="flex flex-wrap gap-3">
                    <div className="w-20 aspect-[9/16] bg-black overflow-hidden shrink-0 relative">
                      <StoryPreviewVideo
                        src={s.videoUrl}
                        poster={
                          bank.find((b) => b.url === s.videoUrl)?.thumbUrl ||
                          null
                        }
                      />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-sm font-medium">
                        {s.title || "Sem título"}{" "}
                        <span className="text-xs text-muted">
                          {s.active ? "· ATIVO" : "· inativo"} · {s.answersCount}{" "}
                          resp.
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button
                          type="button"
                          className="btn btn-outline !py-1.5 !px-2 text-xs"
                          disabled={busy}
                          onClick={() => toggleActive(s)}
                        >
                          {s.active ? "Desativar" : "Ativar hoje"}
                        </button>
                        <button
                          type="button"
                          className="btn btn-outline !py-1.5 !px-2 text-xs text-red-700 border-red-200"
                          disabled={busy}
                          onClick={() => remove(s)}
                        >
                          <Trash2 size={12} />
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted mb-2">
                      Perguntas extras só deste vídeo (opcional)
                    </p>
                    <QuestionsEditor
                      value={qs}
                      onChange={(next) =>
                        setEditQuestions((prev) => ({ ...prev, [s.id]: next }))
                      }
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className="btn btn-primary !py-2 mt-3"
                      disabled={busy}
                      onClick={() => void saveQuestions(s)}
                    >
                      Salvar perguntas
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
