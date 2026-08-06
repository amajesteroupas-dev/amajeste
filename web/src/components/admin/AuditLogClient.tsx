"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AUDIT_ACTIONS,
  AUDIT_CATEGORIES,
  actionLabel,
  categoryLabel,
} from "@/lib/audit-log";
import { formatDateTimeBR } from "@/lib/utils";

export type AuditLogRow = {
  id: string;
  createdAt: string;
  category: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string;
  detail: string | null;
  actorEmail: string | null;
  actorName: string | null;
  source: string;
};

type Props = {
  rows: AuditLogRow[];
  total: number;
  category: string;
  action: string;
  q: string;
};

export function AuditLogClient({ rows, total, category, action, q }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState(q);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of AUDIT_CATEGORIES) map.set(c.id, 0);
    for (const r of rows) {
      map.set(r.category, (map.get(r.category) || 0) + 1);
    }
    return map;
  }, [rows]);

  function push(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [k, v] of Object.entries(next)) {
      if (!v || v === "all") params.delete(k);
      else params.set(k, v);
    }
    router.push(`/admin/logs?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => push({ category: "all" })}
          className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${
            !category || category === "all"
              ? "bg-[#2a2420] text-white border-[#2a2420]"
              : "bg-white border-black/15 text-[#3a322c]"
          }`}
        >
          Todas
        </button>
        {AUDIT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => push({ category: c.id })}
            className={`px-3 py-1.5 text-xs uppercase tracking-wider border ${
              category === c.id
                ? "bg-[#2a2420] text-white border-[#2a2420]"
                : "bg-white border-black/15 text-[#3a322c]"
            }`}
          >
            {c.label}
            {counts.get(c.id) ? (
              <span className="ml-1 opacity-70">({counts.get(c.id)})</span>
            ) : null}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-end">
        <label className="text-xs text-[#5c534c]">
          Ação
          <select
            className="input mt-1 min-w-[140px]"
            value={action || "all"}
            onChange={(e) => push({ action: e.target.value })}
          >
            <option value="all">Todas</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-[#5c534c] flex-1 min-w-[180px]">
          Buscar
          <input
            className="input mt-1"
            value={search}
            placeholder="Resumo, e-mail, ID…"
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") push({ q: search.trim() });
            }}
          />
        </label>
        <button
          type="button"
          className="btn btn-outline !py-2"
          onClick={() => push({ q: search.trim() })}
        >
          Filtrar
        </button>
      </div>

      <p className="text-xs text-[#7a7168]">
        {total} registro(s) · exibindo até {rows.length}
      </p>

      <div className="border border-black/8 bg-white overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[900px]">
          <thead className="bg-[#faf7f3] text-[10px] uppercase tracking-wider text-[#8a7468]">
            <tr>
              <th className="px-3 py-2.5 font-semibold">Data / hora</th>
              <th className="px-3 py-2.5 font-semibold">Categoria</th>
              <th className="px-3 py-2.5 font-semibold">Ação</th>
              <th className="px-3 py-2.5 font-semibold">Resumo</th>
              <th className="px-3 py-2.5 font-semibold">Quem</th>
              <th className="px-3 py-2.5 font-semibold">Origem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-muted">
                  Nenhum log encontrado com esses filtros.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <Fragment key={r.id}>
                  <tr
                    className="border-t border-black/6 cursor-pointer hover:bg-[#faf7f3]/60"
                    onClick={() =>
                      setOpenId((id) => (id === r.id ? null : r.id))
                    }
                  >
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                      {formatDateTimeBR(r.createdAt, { seconds: true })}
                    </td>
                    <td className="px-3 py-2">{categoryLabel(r.category)}</td>
                    <td className="px-3 py-2">
                      <span
                        className={`inline-block px-1.5 py-0.5 border text-[10px] uppercase tracking-wide ${
                          r.action === "delete"
                            ? "border-rose-200 text-rose-800 bg-rose-50"
                            : r.action === "create" || r.action === "launch"
                              ? "border-emerald-200 text-emerald-900 bg-emerald-50"
                              : "border-black/10 text-[#3a322c] bg-[#faf7f3]"
                        }`}
                      >
                        {actionLabel(r.action)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[#2a2420] max-w-[320px]">
                      <span className="line-clamp-2">{r.summary}</span>
                    </td>
                    <td className="px-3 py-2 text-[#5c534c]">
                      {r.actorName || r.actorEmail || "—"}
                    </td>
                    <td className="px-3 py-2 text-[#7a7168] uppercase text-[10px]">
                      {r.source}
                    </td>
                  </tr>
                  {openId === r.id ? (
                    <tr className="border-t border-black/6 bg-[#faf7f3]">
                      <td colSpan={6} className="px-3 py-3 text-[11px] text-[#5c534c]">
                        <p>
                          Entidade: {r.entityType || "—"}
                          {r.entityId ? ` · ${r.entityId}` : ""}
                        </p>
                        {r.detail ? (
                          <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[10px] bg-white border border-black/8 p-2 max-h-48">
                            {prettyDetail(r.detail)}
                          </pre>
                        ) : (
                          <p className="mt-1 text-[#7a7168]">Sem detalhes extras.</p>
                        )}
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function prettyDetail(raw: string) {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
