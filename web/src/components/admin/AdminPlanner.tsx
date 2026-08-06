"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatDateTimeBR } from "@/lib/utils";

type Task = {
  id: string;
  title: string;
  notes: string | null;
  dueDate: string;
  dueTime: string | null;
  category: string | null;
  status: "TODO" | "DONE" | "CANCELLED";
  priority: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
};

function toKey(d: Date) {
  return format(d, "yyyy-MM-dd");
}

const PRIORITY_LABEL = ["Normal", "Alta", "Urgente"] as const;

const CATEGORIES = [
  "Geral",
  "Instagram",
  "Pedidos",
  "Estoque",
  "Frete",
  "Financeiro",
  "Produtos",
  "Clientes",
  "Marketing",
] as const;

function timeSortKey(t: string | null | undefined) {
  if (!t) return 9999;
  const [h, m] = t.split(":").map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 9999;
  return h * 60 + m;
}

function PriorityBadge({ priority }: { priority: number }) {
  if (priority <= 0) {
    return (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-black/10 text-muted bg-[#f7f4f0]">
        Normal
      </span>
    );
  }
  if (priority === 1) {
    return (
      <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-[#e8d9a8] text-[#9a782f] bg-[#fbf6eb]">
        Alta
      </span>
    );
  }
  return (
    <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-[#e8c9cb] text-[#a85f64] bg-[#faf3f3]">
      Urgente
    </span>
  );
}

export function AdminPlanner() {
  const [cursor, setCursor] = useState(() => startOfMonth(new Date()));
  const [selected, setSelected] = useState(() => startOfDay(new Date()));
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [category, setCategory] = useState("");
  const [priority, setPriority] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const monthStart = startOfMonth(cursor);
  const monthEnd = endOfMonth(cursor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const from = toKey(gridStart);
      const to = toKey(gridEnd);
      const res = await fetch(`/api/admin/tasks?from=${from}&to=${to}`);
      const data = await res.json();
      setTasks(Array.isArray(data.tasks) ? data.tasks : []);
    } catch {
      setTasks([]);
    }
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toKey(gridStart), toKey(gridEnd)]);

  useEffect(() => {
    load();
  }, [load]);

  const countsByDay = useMemo(() => {
    const map = new Map<string, { total: number; open: number }>();
    for (const t of tasks) {
      const key = toKey(new Date(t.dueDate));
      const cur = map.get(key) || { total: 0, open: 0 };
      cur.total += 1;
      if (t.status === "TODO") cur.open += 1;
      map.set(key, cur);
    }
    return map;
  }, [tasks]);

  const dayTasks = useMemo(() => {
    return tasks
      .filter((t) => isSameDay(new Date(t.dueDate), selected))
      .sort((a, b) => {
        if (a.status !== b.status) return a.status === "TODO" ? -1 : 1;
        const ta = timeSortKey(a.dueTime);
        const tb = timeSortKey(b.dueTime);
        if (ta !== tb) return ta - tb;
        return b.priority - a.priority;
      });
  }, [tasks, selected]);

  const doneCount = dayTasks.filter((t) => t.status === "DONE").length;
  const openCount = dayTasks.filter((t) => t.status === "TODO").length;
  const urgentCount = dayTasks.filter(
    (t) => t.status === "TODO" && t.priority >= 2
  ).length;

  async function addTask(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!title.trim()) return;
    setBusy(true);
    const res = await fetch("/api/admin/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        notes,
        priority,
        dueTime: dueTime || null,
        category: category || null,
        dueDate: toKey(selected),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Não foi possível salvar");
      return;
    }
    setTitle("");
    setNotes("");
    setDueTime("");
    setCategory("");
    setPriority(0);
    await load();
  }

  async function patchTask(id: string, patch: Record<string, unknown>) {
    await fetch(`/api/admin/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    await load();
  }

  async function removeTask(id: string) {
    if (!confirm("Excluir esta tarefa?")) return;
    await fetch(`/api/admin/tasks/${id}`, { method: "DELETE" });
    await load();
  }

  const selectedLabel = format(selected, "EEEE, d 'de' MMMM", {
    locale: ptBR,
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.15fr)]">
      <section className="border border-black/10 bg-white p-5 md:p-6">
        <div className="flex items-center justify-between gap-3 mb-5">
          <button
            type="button"
            className="btn btn-outline !py-1.5 !px-3 text-xs"
            onClick={() => setCursor((c) => addMonths(c, -1))}
          >
            ←
          </button>
          <h2
            className="text-xl capitalize text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {format(cursor, "MMMM yyyy", { locale: ptBR })}
          </h2>
          <button
            type="button"
            className="btn btn-outline !py-1.5 !px-3 text-xs"
            onClick={() => setCursor((c) => addMonths(c, 1))}
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-muted mb-1">
          {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((d) => (
            <div key={d} className="py-1">
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => {
            const key = toKey(day);
            const inMonth = isSameMonth(day, cursor);
            const selectedDay = isSameDay(day, selected);
            const today = isSameDay(day, new Date());
            const counts = countsByDay.get(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setSelected(startOfDay(day));
                  if (!inMonth) setCursor(startOfMonth(day));
                }}
                className={`relative min-h-[56px] border p-1.5 text-left transition-colors ${
                  selectedDay
                    ? "border-[#a85f64] bg-[#faf3f3]"
                    : "border-transparent hover:border-black/12"
                } ${inMonth ? "bg-[#fbfaf8]" : "bg-[#f5f1ec]/50 text-muted"}`}
              >
                <span
                  className={`inline-flex h-6 w-6 items-center justify-center text-xs ${
                    today ? "rounded-full bg-[#2a2420] text-white" : ""
                  }`}
                >
                  {format(day, "d")}
                </span>
                {counts && counts.total > 0 ? (
                  <span className="absolute bottom-1.5 left-1 right-1 flex items-center justify-center gap-0.5">
                    {counts.open > 0 ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#a85f64]" />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-[#8a9a7a]" />
                    )}
                    {counts.total > 1 ? (
                      <span className="text-[9px] tabular-nums text-muted leading-none">
                        {counts.total}
                      </span>
                    ) : null}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-outline !py-1.5 !px-3 text-xs"
            onClick={() => {
              const t = startOfDay(new Date());
              setSelected(t);
              setCursor(startOfMonth(t));
            }}
          >
            Hoje
          </button>
          <button
            type="button"
            className="btn btn-primary !py-1.5 !px-3 text-xs"
            onClick={() => {
              const t = startOfDay(addDays(new Date(), 1));
              setSelected(t);
              setCursor(startOfMonth(t));
            }}
          >
            Planejar amanhã
          </button>
        </div>
      </section>

      <section className="border border-black/10 bg-white p-5 md:p-6">
        <div className="mb-5 pb-4 border-b border-black/8">
          <p className="text-[11px] uppercase tracking-[0.16em] text-muted">
            Tarefas do dia
          </p>
          <h2
            className="text-2xl text-[#2a2420] capitalize mt-1"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {selectedLabel}
          </h2>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            <span className="px-2 py-1 border border-black/10 bg-[#f7f4f0] text-[#2a2420]">
              {openCount} em aberto
            </span>
            <span className="px-2 py-1 border border-black/10 bg-[#f7f4f0] text-muted">
              {doneCount} concluída{doneCount === 1 ? "" : "s"}
            </span>
            <span className="px-2 py-1 border border-black/10 bg-[#f7f4f0] text-muted">
              {dayTasks.length} no total
            </span>
            {urgentCount > 0 ? (
              <span className="px-2 py-1 border border-[#e8c9cb] bg-[#faf3f3] text-[#a85f64]">
                {urgentCount} urgente{urgentCount === 1 ? "" : "s"}
              </span>
            ) : null}
          </div>
        </div>

        <form
          onSubmit={addTask}
          className="mb-6 border border-black/8 bg-[#faf8f6] p-4 space-y-3"
        >
          <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">
            Nova tarefa
          </p>
          <input
            className="input"
            placeholder="O que precisa fazer? (ex.: postar no Instagram, separar pedidos…)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <textarea
            className="input min-h-[72px]"
            placeholder="Detalhes, checklist ou observação (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-muted">
                Horário
              </span>
              <input
                type="time"
                className="input"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-muted">
                Área
              </span>
              <select
                className="input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <option value="">Sem área</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-wider text-muted">
                Prioridade
              </span>
              <select
                className="input"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
              >
                {PRIORITY_LABEL.map((label, i) => (
                  <option key={label} value={i}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              className="btn btn-primary !py-2"
              disabled={busy}
            >
              {busy ? "Salvando…" : "Adicionar tarefa"}
            </button>
            <p className="text-[11px] text-muted">
              Agendada para{" "}
              <span className="text-[#2a2420] capitalize">{selectedLabel}</span>
              {dueTime ? ` · ${dueTime}` : ""}
            </p>
          </div>
          {err ? <p className="text-sm text-red-700">{err}</p> : null}
        </form>

        {loading ? (
          <p className="text-sm text-muted">Carregando…</p>
        ) : dayTasks.length === 0 ? (
          <div className="border border-dashed border-black/15 px-4 py-10 text-center">
            <p className="text-sm text-[#2a2420]">Nenhuma tarefa neste dia</p>
            <p className="text-xs text-muted mt-1 max-w-sm mx-auto">
              Defina horário e área acima, ou use “Planejar amanhã” para montar a
              lista do próximo dia.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {dayTasks.map((t) => {
              const done = t.status === "DONE";
              const open = expandedId === t.id;
              return (
                <li
                  key={t.id}
                  className={`border border-black/10 ${
                    done ? "bg-[#f5f1ec] opacity-80" : "bg-white"
                  }`}
                >
                  <div className="flex gap-3 p-3 md:p-4 items-start">
                    <input
                      type="checkbox"
                      className="mt-1.5 accent-[#a85f64]"
                      checked={done}
                      onChange={() =>
                        patchTask(t.id, { status: done ? "TODO" : "DONE" })
                      }
                      aria-label="Concluir"
                    />

                    <div
                      className={`shrink-0 w-[52px] text-center border border-black/10 py-1.5 ${
                        done
                          ? "bg-[#eee9e2] text-muted"
                          : t.dueTime
                            ? "bg-[#faf3f3] text-[#a85f64]"
                            : "bg-[#f7f4f0] text-muted"
                      }`}
                    >
                      <p className="text-[9px] uppercase tracking-wider leading-none">
                        {t.dueTime ? "Às" : "Dia"}
                      </p>
                      <p
                        className="text-sm font-medium tabular-nums mt-0.5 leading-tight"
                        style={{ fontFamily: "var(--font-display)" }}
                      >
                        {t.dueTime || "—"}
                      </p>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {t.category ? (
                          <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 border border-black/10 text-[#2a2420] bg-[#f7f4f0]">
                            {t.category}
                          </span>
                        ) : null}
                        <PriorityBadge priority={t.priority} />
                        {done ? (
                          <span className="text-[10px] uppercase tracking-wider text-[#6a7a5a]">
                            Concluída
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`text-sm font-medium ${
                          done
                            ? "line-through text-muted"
                            : "text-[#2a2420]"
                        }`}
                      >
                        {t.title}
                      </p>
                      {t.notes ? (
                        <p className="text-xs text-muted mt-1 whitespace-pre-line line-clamp-2">
                          {t.notes}
                        </p>
                      ) : null}

                      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted">
                        <button
                          type="button"
                          className="underline-offset-2 hover:underline text-rose-dark"
                          onClick={() =>
                            setExpandedId(open ? null : t.id)
                          }
                        >
                          {open ? "Ocultar detalhes" : "Mais informações"}
                        </button>
                        <button
                          type="button"
                          className="text-red-700 hover:underline"
                          onClick={() => removeTask(t.id)}
                        >
                          Excluir
                        </button>
                      </div>

                      {open ? (
                        <div className="mt-3 border-t border-black/8 pt-3 space-y-3">
                          {t.notes ? (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted mb-1">
                                Detalhes
                              </p>
                              <p className="text-xs text-[#2a2420] whitespace-pre-line">
                                {t.notes}
                              </p>
                            </div>
                          ) : null}
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block space-y-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted">
                                Horário
                              </span>
                              <input
                                type="time"
                                className="input"
                                defaultValue={t.dueTime || ""}
                                onBlur={(e) => {
                                  const v = e.target.value || null;
                                  if (v !== (t.dueTime || null)) {
                                    patchTask(t.id, { dueTime: v });
                                  }
                                }}
                              />
                            </label>
                            <label className="block space-y-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted">
                                Área
                              </span>
                              <select
                                className="input"
                                defaultValue={t.category || ""}
                                onChange={(e) =>
                                  patchTask(t.id, {
                                    category: e.target.value || null,
                                  })
                                }
                              >
                                <option value="">Sem área</option>
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block space-y-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted">
                                Prioridade
                              </span>
                              <select
                                className="input"
                                defaultValue={t.priority}
                                onChange={(e) =>
                                  patchTask(t.id, {
                                    priority: Number(e.target.value),
                                  })
                                }
                              >
                                {PRIORITY_LABEL.map((label, i) => (
                                  <option key={label} value={i}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="block space-y-1">
                              <span className="text-[10px] uppercase tracking-wider text-muted">
                                Reagendar dia
                              </span>
                              <input
                                type="date"
                                className="input"
                                defaultValue={toKey(new Date(t.dueDate))}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    patchTask(t.id, {
                                      dueDate: e.target.value,
                                    });
                                  }
                                }}
                              />
                            </label>
                          </div>
                          <dl className="grid gap-1 text-[11px] text-muted sm:grid-cols-2">
                            <div>
                              <dt className="uppercase tracking-wider">
                                Criada por
                              </dt>
                              <dd className="text-[#2a2420]">
                                {t.createdBy || "—"}
                              </dd>
                            </div>
                            <div>
                              <dt className="uppercase tracking-wider">
                                Criada em
                              </dt>
                              <dd className="text-[#2a2420]">
                                {formatDateTimeBR(t.createdAt, {
                                  seconds: false,
                                })}
                              </dd>
                            </div>
                            <div>
                              <dt className="uppercase tracking-wider">
                                Atualizada
                              </dt>
                              <dd className="text-[#2a2420]">
                                {formatDateTimeBR(t.updatedAt, {
                                  seconds: false,
                                })}
                              </dd>
                            </div>
                            <div>
                              <dt className="uppercase tracking-wider">
                                Status
                              </dt>
                              <dd className="text-[#2a2420]">
                                {done ? "Concluída" : "Em aberto"}
                              </dd>
                            </div>
                          </dl>
                        </div>
                      ) : null}
                    </div>
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
