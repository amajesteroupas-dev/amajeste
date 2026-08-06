"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { HelpTip } from "@/components/admin/HelpTip";
import { formatBRL, formatDateTimeBR } from "@/lib/utils";
import { customerWhatsAppUrl } from "@/lib/site";
import { orderStatusLabel } from "@/lib/order-labels";
import { ShippingProviderSwitch } from "@/components/admin/ShippingProviderSwitch";

type Account = {
  ok: boolean;
  error?: string;
  sandbox: boolean;
  name?: string;
  email?: string;
  document?: string;
  balance?: number;
};

type Sender = {
  name: string;
  phone: string;
  email: string;
  document: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  state: string;
};

type Settings = {
  hasToken: boolean;
  tokenMasked: string;
  tokenFromPanel: boolean;
  sandbox: boolean;
  userAgent: string;
  storeZip: string;
  usingMock: boolean;
  account: Account;
  sender: Sender;
};

type Quote = {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryDays: number;
  local?: boolean;
  note?: string;
};

type MeOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  city: string | null;
  state: string | null;
  shippingMethod: string | null;
  shippingCost: number;
  labelStatus: string;
  labelUrl: string | null;
  trackingCode: string | null;
  melhorEnvioId: string | null;
};

const LABEL_UI: Record<string, { label: string; className: string }> = {
  ready: { label: "Pronto p/ etiqueta", className: "bg-emerald-50 text-emerald-800" },
  generated: { label: "Etiqueta gerada", className: "bg-sky-50 text-sky-800" },
  local: { label: "Entrega local", className: "bg-amber-50 text-amber-900" },
  pending_pay: { label: "Aguardando pagamento", className: "bg-stone-100 text-stone-600" },
  no_service: { label: "Sem serviço ME", className: "bg-rose-50 text-rose-800" },
};

export function MelhorEnvioAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [clearToken, setClearToken] = useState(false);
  const [sandbox, setSandbox] = useState(false);
  const [userAgent, setUserAgent] = useState("");
  const [storeZip, setStoreZip] = useState("");
  const [sender, setSender] = useState<Sender | null>(null);
  const [meta, setMeta] = useState<Settings | null>(null);
  const [testCep, setTestCep] = useState("");
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [orders, setOrders] = useState<MeOrder[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "local" | "correios">("all");
  const [tokenOpen, setTokenOpen] = useState(false);
  const [tokenUnlocked, setTokenUnlocked] = useState(false);
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlockBusy, setUnlockBusy] = useState(false);
  const [unlockError, setUnlockError] = useState("");
  const [showUnlockForm, setShowUnlockForm] = useState(false);
  const [tokenPassword, setTokenPassword] = useState("");
  const [savingToken, setSavingToken] = useState(false);

  async function loadOrders() {
    setOrdersLoading(true);
    const res = await fetch("/api/admin/melhor-envio/orders");
    const data = await res.json();
    setOrdersLoading(false);
    if (res.ok) setOrders(data.items || []);
  }

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/settings/melhor-envio");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Falha ao carregar");
      return;
    }
    setMeta(data);
    setSandbox(Boolean(data.sandbox));
    setUserAgent(data.userAgent || "");
    setStoreZip(data.storeZip || "");
    setSender(data.sender || null);
    setToken("");
    setClearToken(false);
    loadOrders();
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/settings/melhor-envio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sandbox,
        userAgent,
        storeZip,
        sender,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Erro ao salvar");
      return;
    }
    setMeta(data);
    setSender(data.sender || null);
    setMsg("Configurações salvas");
  }

  async function onSaveToken(e: FormEvent) {
    e.preventDefault();
    if (!tokenUnlocked) return;
    setSavingToken(true);
    setMsg("");
    setError("");
    if (!tokenPassword.trim()) {
      setSavingToken(false);
      setError("Digite sua senha de acesso ao painel para salvar o token");
      return;
    }
    const res = await fetch("/api/admin/settings/melhor-envio", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token: clearToken ? undefined : token.trim() || undefined,
        clearToken,
        tokenPassword,
        sandbox,
        userAgent,
        storeZip,
        sender,
      }),
    });
    const data = await res.json();
    setSavingToken(false);
    if (!res.ok) {
      setError(data.error || "Erro ao salvar token");
      return;
    }
    setMeta(data);
    setToken("");
    setClearToken(false);
    setTokenPassword("");
    setMsg("Token atualizado");
  }

  async function tryUnlock(e: FormEvent) {
    e.preventDefault();
    setUnlockBusy(true);
    setUnlockError("");
    const res = await fetch("/api/admin/settings/melhor-envio/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: unlockPassword }),
    });
    const data = await res.json();
    setUnlockBusy(false);
    if (!res.ok) {
      setUnlockError(data.error || "Senha incorreta");
      return;
    }
    setTokenUnlocked(true);
    setTokenOpen(true);
    setShowUnlockForm(false);
    setUnlockPassword("");
  }

  function toggleTokenSection() {
    if (tokenOpen) {
      setTokenOpen(false);
      return;
    }
    if (tokenUnlocked) {
      setTokenOpen(true);
      return;
    }
    setShowUnlockForm(true);
    setUnlockError("");
  }

  async function onTest() {
    setTesting(true);
    setError("");
    setMsg("");
    setQuotes([]);
    const res = await fetch("/api/admin/settings/melhor-envio", {
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
    setQuotes(data.quotes || []);
    if (data.account) {
      setMeta((m) => (m ? { ...m, account: data.account } : m));
    }
    setMsg(
      data.usingMock
        ? "Cotação de teste (modo simulado — sem token)."
        : `Cotação OK · origem ${data.fromZip} → ${data.toZip} (só PAC, SEDEX + entrega local)`
    );
  }

  async function generateLabel(orderId: string) {
    setBusyId(orderId);
    setError("");
    setMsg("");
    const res = await fetch(`/api/admin/orders/${orderId}/melhor-envio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create" }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Falha ao gerar etiqueta");
      return;
    }
    setMsg("Etiqueta gerada com sucesso");
    if (data.labelUrl) window.open(data.labelUrl, "_blank");
    loadOrders();
  }

  async function reprint(orderId: string) {
    setBusyId(orderId);
    const res = await fetch(`/api/admin/orders/${orderId}/melhor-envio`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "print" }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setError(data.error || "Falha ao imprimir");
      return;
    }
    if (data.labelUrl) window.open(data.labelUrl, "_blank");
    loadOrders();
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  const account = meta?.account;
  const localOrders = orders.filter((o) => o.labelStatus === "local");
  const correiosOrders = orders.filter((o) => o.labelStatus !== "local");
  const showLocal = filter === "all" || filter === "local";
  const showCorreios = filter === "all" || filter === "correios";

  function renderOrderRows(list: MeOrder[]) {
    if (list.length === 0) {
      return (
        <p className="text-sm text-muted py-4 text-center">
          Nenhum pedido nesta lista
        </p>
      );
    }
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wider text-muted border-b border-black/10">
              <th className="py-2 pr-2">Pedido</th>
              <th className="py-2 pr-2">Cliente</th>
              <th className="py-2 pr-2">Frete</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2">Ação</th>
            </tr>
          </thead>
          <tbody>
            {list.map((o) => {
              const st = LABEL_UI[o.labelStatus] || LABEL_UI.pending_pay;
              const wa =
                o.labelStatus === "local"
                  ? customerWhatsAppUrl(
                      o.customerPhone,
                      `Olá! Entramos em contato sobre o pedido ${o.orderNumber} da Majesté (entrega local Planaltina / Sobradinho).`
                    )
                  : null;
              return (
                <tr key={o.id} className="border-b border-black/5 align-top">
                  <td className="py-2.5 pr-2">
                    <Link
                      href={`/admin/pedidos/${o.id}`}
                      className="font-medium underline-offset-2 hover:underline"
                    >
                      {o.orderNumber}
                    </Link>
                    <span className="block text-[11px] text-muted">
                      {formatDateTimeBR(o.createdAt, { seconds: true })}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    {o.customerName || "—"}
                    <span className="block text-[11px] text-muted">
                      {[o.city, o.state].filter(Boolean).join("/")}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <span className="block">{o.shippingMethod || "—"}</span>
                    <span className="text-[11px] text-muted">
                      {o.labelStatus === "local"
                        ? "A combinar"
                        : formatBRL(o.shippingCost)}
                    </span>
                  </td>
                  <td className="py-2.5 pr-2">
                    <span
                      className={`inline-block text-[10px] uppercase tracking-wide px-2 py-0.5 ${st.className}`}
                    >
                      {st.label}
                    </span>
                    <span className="block text-[11px] text-muted mt-0.5">
                      {orderStatusLabel(o.status)}
                    </span>
                    {o.trackingCode ? (
                      <span className="block text-[11px] mt-1 font-mono">
                        {o.trackingCode}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2.5 space-y-1">
                    {o.labelStatus === "ready" ? (
                      <button
                        type="button"
                        className="btn btn-primary !py-1.5 !px-2.5 text-xs"
                        disabled={busyId === o.id}
                        onClick={() => generateLabel(o.id)}
                      >
                        {busyId === o.id ? "…" : "Gerar etiqueta"}
                      </button>
                    ) : null}
                    {o.labelStatus === "generated" ? (
                      <button
                        type="button"
                        className="btn btn-outline !py-1.5 !px-2.5 text-xs"
                        disabled={busyId === o.id}
                        onClick={() =>
                          o.labelUrl
                            ? window.open(o.labelUrl!, "_blank")
                            : reprint(o.id)
                        }
                      >
                        Imprimir
                      </button>
                    ) : null}
                    {wa ? (
                      <a
                        href={wa}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[11px] underline text-emerald-800"
                      >
                        WhatsApp
                      </a>
                    ) : null}
                    {o.trackingCode ? (
                      <a
                        href={`/rastreio?codigo=${encodeURIComponent(o.trackingCode)}&pedido=${encodeURIComponent(o.orderNumber)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-[11px] underline text-muted"
                      >
                        Rastrear
                      </a>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <ShippingProviderSwitch variant="melhor_envio" />

      {/* Conta — similar ao resumo do plugin WP */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 border border-black/10 bg-white p-4">
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">Usuário</p>
          <p className="text-sm font-medium mt-0.5">
            {account?.ok ? account.name || "—" : meta?.usingMock ? "—" : "—"}
          </p>
          {account?.email ? (
            <p className="text-xs text-muted truncate">{account.email}</p>
          ) : null}
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">Ambiente</p>
          <p className="text-sm font-medium mt-0.5">
            {meta?.usingMock
              ? "Simulado"
              : meta?.sandbox
                ? "Sandbox"
                : "Produção"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">Saldo</p>
          <p className="text-sm font-medium mt-0.5">
            {account?.ok ? formatBRL(Number(account.balance || 0)) : "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted">API</p>
          <p className="text-sm font-medium mt-0.5">
            {account?.ok ? (
              <span className="text-emerald-700">Conectada</span>
            ) : meta?.usingMock ? (
              <span className="text-amber-700">Sem token</span>
            ) : (
              <span className="text-rose-700">Falha</span>
            )}
          </p>
          {account && !account.ok && account.error ? (
            <p className="text-[11px] text-rose-700 mt-0.5 line-clamp-2">
              {account.error}
            </p>
          ) : null}
        </div>
      </div>

      {/* Meus pedidos / etiquetas */}
      <div className="border border-black/10 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-medium text-[#2a2420]">Meus pedidos</h2>
          <div className="flex flex-wrap gap-2 items-center">
            <select
              className="input !py-1.5 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
            >
              <option value="all">Todos</option>
              <option value="local">Só entrega local</option>
              <option value="correios">Só Correios</option>
            </select>
            <button
              type="button"
              className="btn btn-outline !py-1.5 text-xs"
              onClick={loadOrders}
              disabled={ordersLoading}
            >
              {ordersLoading ? "…" : "Atualizar"}
            </button>
          </div>
        </div>
        <p className="text-xs text-muted">
          Pedidos separados: entrega local (WhatsApp) e Correios PAC/SEDEX
          (etiquetas Melhor Envio).
        </p>

        {showLocal ? (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-amber-900 bg-amber-50 px-3 py-2 border border-amber-100">
              Entrega local — Planaltina / Sobradinho ({localOrders.length})
            </h3>
            {renderOrderRows(localOrders)}
          </section>
        ) : null}

        {showCorreios ? (
          <section className="space-y-2">
            <h3 className="text-sm font-medium text-sky-900 bg-sky-50 px-3 py-2 border border-sky-100">
              Correios (PAC / SEDEX) ({correiosOrders.length})
            </h3>
            {renderOrderRows(correiosOrders)}
          </section>
        ) : null}
      </div>

      <form onSubmit={onSave} className="space-y-4 border border-black/10 bg-white p-5">
        <h2 className="text-base font-medium text-[#2a2420]">Configurações</h2>

        <label className="block text-xs uppercase tracking-wider text-muted">
          CEP de origem (loja)
          <HelpTip text="CEP de Planaltina (ou de onde os pedidos saem)." />
          <input
            className="input mt-1"
            value={storeZip}
            onChange={(e) => setStoreZip(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="73310000"
            inputMode="numeric"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={sandbox}
            onChange={(e) => setSandbox(e.target.checked)}
          />
          Usar ambiente Sandbox (testes)
          <HelpTip text="Marque só para testes. Em produção, deixe desmarcado." />
        </label>

        <label className="block text-xs uppercase tracking-wider text-muted">
          User-Agent
          <HelpTip text="Obrigatório pela API: nome do app e e-mail de contato." />
          <input
            className="input mt-1"
            value={userAgent}
            onChange={(e) => setUserAgent(e.target.value)}
            placeholder="Majeste Fitness (contato@equilibra.tech)"
          />
        </label>

        {sender ? (
          <div className="space-y-3 border-t border-black/10 pt-4">
            <h3 className="text-sm font-medium">Remetente (para etiquetas)</h3>
            <p className="text-xs text-muted">
              Dados da loja usados ao gerar etiqueta no Melhor Envio.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs uppercase tracking-wider text-muted">
                Nome
                <input
                  className="input mt-1"
                  value={sender.name}
                  onChange={(e) =>
                    setSender({ ...sender, name: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                CPF/CNPJ
                <input
                  className="input mt-1"
                  value={sender.document}
                  onChange={(e) =>
                    setSender({
                      ...sender,
                      document: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Telefone
                <input
                  className="input mt-1"
                  value={sender.phone}
                  onChange={(e) =>
                    setSender({
                      ...sender,
                      phone: e.target.value.replace(/\D/g, ""),
                    })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                E-mail
                <input
                  className="input mt-1"
                  type="email"
                  value={sender.email}
                  onChange={(e) =>
                    setSender({ ...sender, email: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted sm:col-span-2">
                Rua
                <input
                  className="input mt-1"
                  value={sender.address}
                  onChange={(e) =>
                    setSender({ ...sender, address: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Número
                <input
                  className="input mt-1"
                  value={sender.number}
                  onChange={(e) =>
                    setSender({ ...sender, number: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Complemento
                <input
                  className="input mt-1"
                  value={sender.complement}
                  onChange={(e) =>
                    setSender({ ...sender, complement: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Bairro
                <input
                  className="input mt-1"
                  value={sender.district}
                  onChange={(e) =>
                    setSender({ ...sender, district: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                Cidade
                <input
                  className="input mt-1"
                  value={sender.city}
                  onChange={(e) =>
                    setSender({ ...sender, city: e.target.value })
                  }
                />
              </label>
              <label className="block text-xs uppercase tracking-wider text-muted">
                UF
                <input
                  className="input mt-1"
                  maxLength={2}
                  value={sender.state}
                  onChange={(e) =>
                    setSender({
                      ...sender,
                      state: e.target.value.toUpperCase().slice(0, 2),
                    })
                  }
                />
              </label>
            </div>
          </div>
        ) : null}

        {error && !tokenOpen ? (
          <p className="text-sm text-rose-700">{error}</p>
        ) : null}
        {msg && !tokenOpen ? (
          <p className="text-sm text-emerald-800">{msg}</p>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Salvando…" : "Salvar configurações"}
        </button>
      </form>

      <div className="border border-black/10 bg-white p-5 space-y-3">
        <h2 className="text-base font-medium text-[#2a2420]">Testar cotação</h2>
        <p className="text-xs text-muted">
          Pacote padrão (0,4 kg · 30×25×5 cm). Resultado filtrado: PAC, SEDEX e
          entrega local.
        </p>
        <div className="flex flex-wrap gap-2 items-end">
          <label className="block text-xs uppercase tracking-wider text-muted flex-1 min-w-[140px]">
            CEP destino
            <input
              className="input mt-1"
              value={testCep}
              onChange={(e) =>
                setTestCep(e.target.value.replace(/\D/g, "").slice(0, 8))
              }
              placeholder="00000000"
              inputMode="numeric"
            />
          </label>
          <button
            type="button"
            className="btn btn-outline"
            disabled={testing || testCep.length < 8}
            onClick={onTest}
          >
            {testing ? "Consultando…" : "Cotizar"}
          </button>
        </div>
        {quotes.length > 0 ? (
          <ul className="divide-y divide-black/5 text-sm">
            {quotes.map((q) => (
              <li key={q.id} className="flex justify-between gap-3 py-2">
                <span>
                  {q.local
                    ? `${q.company}: ${q.name}`
                    : `${q.company} · ${q.name}`}
                  <span className="text-muted text-xs block">
                    {q.note || `${q.deliveryDays} dia(s)`}
                  </span>
                </span>
                <span className="font-medium tabular-nums">
                  {q.local ? "A combinar" : formatBRL(q.price)}
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {/* Token — final da página, compacto, protegido por senha */}
      <div className="border border-black/10 bg-white">
        <button
          type="button"
          onClick={toggleTokenSection}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-black/[0.02]"
        >
          <span>
            <span className="block text-sm font-medium text-[#2a2420]">
              Token Melhor Envio
            </span>
            <span className="block text-[11px] text-muted mt-0.5">
              {meta?.hasToken
                ? "Configurado — protegido por senha"
                : "Não configurado — protegido por senha"}
            </span>
          </span>
          <span
            className="inline-flex h-7 w-7 items-center justify-center border border-black/15 text-base font-medium text-[#2a2420] shrink-0"
            aria-hidden
          >
            {tokenOpen ? "−" : "+"}
          </span>
        </button>

        {showUnlockForm && !tokenUnlocked ? (
          <form
            onSubmit={tryUnlock}
            className="border-t border-black/10 px-4 py-4 space-y-3 bg-[#faf8f6]"
          >
            <p className="text-xs text-muted">
              Digite a senha de acesso ao painel admin para abrir esta área.
            </p>
            <label className="block text-xs uppercase tracking-wider text-muted">
              Senha
              <input
                type="password"
                autoComplete="current-password"
                className="input mt-1"
                value={unlockPassword}
                onChange={(e) => setUnlockPassword(e.target.value)}
                placeholder="Sua senha do admin"
                autoFocus
              />
            </label>
            {unlockError ? (
              <p className="text-sm text-rose-700">{unlockError}</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary !py-1.5 text-sm"
                disabled={unlockBusy || !unlockPassword}
              >
                {unlockBusy ? "Verificando…" : "Desbloquear"}
              </button>
              <button
                type="button"
                className="btn btn-outline !py-1.5 text-sm"
                onClick={() => {
                  setShowUnlockForm(false);
                  setUnlockPassword("");
                  setUnlockError("");
                }}
              >
                Cancelar
              </button>
            </div>
          </form>
        ) : null}

        {tokenOpen && tokenUnlocked ? (
          <form
            onSubmit={onSaveToken}
            className="border-t border-black/10 px-4 py-4 space-y-3"
          >
            <div
              className={`rounded-sm border px-3 py-2 text-sm ${
                meta?.usingMock
                  ? "border-amber-300/80 bg-amber-50 text-amber-950"
                  : account?.ok
                    ? "border-emerald-300/80 bg-emerald-50 text-emerald-950"
                    : "border-rose-300/80 bg-rose-50 text-rose-950"
              }`}
            >
              {meta?.usingMock ? (
                <>
                  Frete em <strong>modo simulado</strong> (sem token).
                </>
              ) : account?.ok ? (
                <>
                  Token <strong>funcionando</strong>
                  {meta?.tokenMasked ? <> · {meta.tokenMasked}</> : null}
                  {meta?.sandbox ? " · sandbox" : " · produção"}. Checkout
                  mostra só <strong>Correios PAC</strong>,{" "}
                  <strong>SEDEX</strong> e{" "}
                  <strong>entrega local Planaltina/Sobradinho</strong>.
                </>
              ) : (
                <>
                  Token configurado, mas a API não validou.{" "}
                  {account?.error ||
                    "Revise o token ou o ambiente (sandbox/produção)."}
                </>
              )}
            </div>

            <label className="block text-xs uppercase tracking-wider text-muted">
              Token de acesso (Bearer)
              <HelpTip text="Gere no painel Melhor Envio (Integrações / aplicativo). Cole o access_token aqui." />
              <input
                type="password"
                autoComplete="off"
                className="input mt-1 font-mono text-sm"
                value={token}
                onChange={(e) => {
                  setToken(e.target.value);
                  setClearToken(false);
                }}
                placeholder={
                  meta?.hasToken
                    ? `Salvo: ${meta.tokenMasked} — cole outro para trocar`
                    : "Cole o token aqui"
                }
              />
            </label>

            {meta?.hasToken ? (
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={clearToken}
                  onChange={(e) => setClearToken(e.target.checked)}
                />
                Remover token do painel
              </label>
            ) : null}

            <label className="block text-xs uppercase tracking-wider text-muted">
              Confirme sua senha do painel
              <HelpTip text="Obrigatória para salvar ou remover o token." />
              <input
                type="password"
                autoComplete="current-password"
                className="input mt-1"
                value={tokenPassword}
                onChange={(e) => setTokenPassword(e.target.value)}
                placeholder="Senha do admin"
                required
              />
            </label>

            {error ? <p className="text-sm text-rose-700">{error}</p> : null}
            {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="btn btn-primary !py-1.5 text-sm"
                disabled={savingToken}
              >
                {savingToken ? "Salvando…" : "Salvar token"}
              </button>
              <button
                type="button"
                className="btn btn-outline !py-1.5 text-sm"
                onClick={() => {
                  setTokenOpen(false);
                  setTokenUnlocked(false);
                  setToken("");
                  setTokenPassword("");
                  setClearToken(false);
                }}
              >
                Bloquear área
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
