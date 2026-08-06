"use client";

import { FormEvent, useEffect, useState } from "react";
import { HelpTip } from "@/components/admin/HelpTip";
import { formatBRL } from "@/lib/utils";
import { ShippingProviderSwitch } from "@/components/admin/ShippingProviderSwitch";
import { ShippingOrdersPanel } from "@/components/admin/ShippingOrdersPanel";

type Settings = {
  hasId: boolean;
  hasChave: boolean;
  idMasked: string;
  chaveMasked: string;
  idFromPanel: boolean;
  chaveFromPanel: boolean;
  enabled: boolean;
  enabledFlag: boolean;
  cepOrigem: string;
  docsUrl: string;
  panelUrl: string;
};

type QuoteResult = {
  ok?: boolean;
  error?: string;
  price?: number;
  deliveryDays?: number;
};

export function MandaBemAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<Settings | null>(null);

  const [plataformaId, setPlataformaId] = useState("");
  const [plataformaChave, setPlataformaChave] = useState("");
  const [clearChave, setClearChave] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [cepOrigem, setCepOrigem] = useState("");
  const [password, setPassword] = useState("");

  const [testCep, setTestCep] = useState("");
  const [pac, setPac] = useState<QuoteResult | null>(null);
  const [sedex, setSedex] = useState<QuoteResult | null>(null);
  const [checkoutQuotes, setCheckoutQuotes] = useState<
    | { id: string; name: string; company: string; price: number; deliveryDays: number }[]
    | { error: string }
    | null
  >(null);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/settings/manda-bem");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Falha ao carregar");
      return;
    }
    setMeta(data);
    setEnabled(Boolean(data.enabledFlag));
    setCepOrigem(data.cepOrigem || "");
    setPlataformaId("");
    setPlataformaChave("");
    setClearChave(false);
    setPassword("");
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/settings/manda-bem", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled,
        cepOrigem,
        plataformaId: plataformaId.trim() || undefined,
        plataformaChave: clearChave ? undefined : plataformaChave.trim() || undefined,
        clearChave,
        password: password || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Falha ao salvar");
      return;
    }
    setMsg("Configurações Manda Bem salvas.");
    setMeta(data);
    setEnabled(Boolean(data.enabledFlag));
    setCepOrigem(data.cepOrigem || "");
    setPlataformaId("");
    setPlataformaChave("");
    setClearChave(false);
    setPassword("");
  }

  async function onTest(e: FormEvent) {
    e.preventDefault();
    setTesting(true);
    setError("");
    setPac(null);
    setSedex(null);
    setCheckoutQuotes(null);
    const res = await fetch("/api/admin/settings/manda-bem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toZip: testCep }),
    });
    const data = await res.json();
    setTesting(false);
    if (!res.ok) {
      setError(data.error || "Falha no teste");
      return;
    }
    setPac(data.pac || null);
    setSedex(data.sedex || null);
    setCheckoutQuotes(data.checkoutQuotes || null);
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando Manda Bem…</p>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <ShippingProviderSwitch variant="manda_bem" />

      <ShippingOrdersPanel mode="manda_bem" />

      <div className="border border-line bg-surface p-5 space-y-3">
        <p className="text-sm text-[#3a322c] leading-relaxed">
          A{" "}
          <a
            href={meta?.panelUrl || "https://mandabem.com.br/"}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-rose-dark"
          >
            Manda Bem
          </a>{" "}
          intermedia fretes dos Correios (PAC / SEDEX) com valores promocionais.
          Credenciais em: conta →{" "}
          <strong>Integrações</strong> → Web Service (
          <code className="text-xs">plataforma_id</code> e{" "}
          <code className="text-xs">plataforma_chave</code>).
        </p>
        <p className="text-xs text-muted">
          Documentação:{" "}
          <a
            href={meta?.docsUrl || "https://site.mandabem.com.br/api/"}
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            site.mandabem.com.br/api
          </a>
        </p>
        <div className="flex flex-wrap gap-3 text-xs">
          <span
            className={`px-2 py-1 ${
              meta?.enabled
                ? "bg-emerald-50 text-emerald-800"
                : "bg-stone-100 text-stone-600"
            }`}
          >
            {meta?.enabled
              ? "Credenciais ativas"
              : "Inativo no flag do painel"}
          </span>
          <span className="px-2 py-1 bg-stone-100 text-stone-600">
            ID: {meta?.hasId ? meta.idMasked : "não cadastrado"}
          </span>
          <span className="px-2 py-1 bg-stone-100 text-stone-600">
            Chave: {meta?.hasChave ? meta.chaveMasked : "não cadastrada"}
          </span>
        </div>
      </div>

      <form onSubmit={onSave} className="border border-line bg-surface p-5 space-y-4">
        <h2
          className="text-xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Credenciais e ativação
        </h2>

        <label className="flex items-center gap-2 text-sm cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          Permitir Manda Bem nas cotações
          <HelpTip text="Use também o bloco “API ativa no checkout” acima para desconectar o Melhor Envio e testar só a Manda Bem." />
        </label>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">
            CEP de origem
          </label>
          <input
            className="input max-w-xs"
            value={cepOrigem}
            onChange={(e) => setCepOrigem(e.target.value)}
            placeholder="73310000"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">
            plataforma_id
          </label>
          <input
            className="input font-mono text-sm"
            value={plataformaId}
            onChange={(e) => setPlataformaId(e.target.value)}
            placeholder={
              meta?.hasId
                ? `Atual: ${meta.idMasked} — cole novo para trocar`
                : "Cole o ID da integração"
            }
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-xs uppercase tracking-wider text-muted mb-1">
            plataforma_chave
          </label>
          <input
            className="input font-mono text-sm"
            type="password"
            value={plataformaChave}
            onChange={(e) => setPlataformaChave(e.target.value)}
            placeholder={
              meta?.hasChave
                ? `Atual: ${meta.chaveMasked} — cole nova para trocar`
                : "Cole a chave da integração"
            }
            autoComplete="new-password"
          />
          {meta?.hasChave ? (
            <label className="mt-2 flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={clearChave}
                onChange={(e) => setClearChave(e.target.checked)}
              />
              Remover chave salva
            </label>
          ) : null}
        </div>

        {(plataformaId.trim() ||
          plataformaChave.trim() ||
          clearChave) && (
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">
              Sua senha do admin (obrigatória para alterar ID/chave)
            </label>
            <input
              className="input max-w-sm"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
        )}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </form>

      <form
        onSubmit={onTest}
        className="border border-line bg-surface p-5 space-y-4"
      >
        <h2
          className="text-xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Testar cotação
        </h2>
        <p className="text-xs text-muted">
          Consulta PAC e SEDEX na API{" "}
          <code>/ws/valor_envio</code> e mostra o que o checkout agregaria.
        </p>
        <div className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs uppercase tracking-wider text-muted mb-1">
              CEP destino
            </label>
            <input
              className="input"
              value={testCep}
              onChange={(e) => setTestCep(e.target.value)}
              placeholder="01310100"
              required
            />
          </div>
          <button type="submit" className="btn btn-outline" disabled={testing}>
            {testing ? "Consultando…" : "Cotação teste"}
          </button>
        </div>

        {(pac || sedex) && (
          <ul className="text-sm space-y-2 border-t border-line pt-3">
            <li>
              <strong>PAC:</strong>{" "}
              {pac?.ok
                ? `${formatBRL(pac.price || 0)} · ${pac.deliveryDays} dias`
                : pac?.error || "—"}
            </li>
            <li>
              <strong>SEDEX:</strong>{" "}
              {sedex?.ok
                ? `${formatBRL(sedex.price || 0)} · ${sedex.deliveryDays} dias`
                : sedex?.error || "—"}
            </li>
          </ul>
        )}

        {checkoutQuotes && !Array.isArray(checkoutQuotes) ? (
          <p className="text-sm text-red-700">{checkoutQuotes.error}</p>
        ) : null}
        {Array.isArray(checkoutQuotes) ? (
          <div className="border-t border-line pt-3">
            <p className="text-xs uppercase tracking-wider text-muted mb-2">
              Opções no checkout (agregado)
            </p>
            <ul className="text-sm space-y-1">
              {checkoutQuotes.map((q) => (
                <li key={q.id}>
                  {q.company} · {q.name} — {formatBRL(q.price)} (
                  {q.deliveryDays}d)
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </form>
    </div>
  );
}
