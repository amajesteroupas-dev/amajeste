"use client";

import { FormEvent, useEffect, useState } from "react";

type Settings = {
  emailOnOrder: boolean;
  whatsappOnOrder: boolean;
  mailConfigured: boolean;
  provider: "zapi" | "evolution";
  whatsappReady: boolean;
  zapiInstanceMasked: string;
  zapiTokenMasked: string;
  zapiClientTokenMasked: string;
  hasZapi: boolean;
  evolutionUrl: string;
  evolutionInstance: string;
  evolutionKeyMasked: string;
  hasEvolution: boolean;
};

export function OrderNotifyAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState<"email" | "whatsapp" | "">("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<Settings | null>(null);

  const [emailOnOrder, setEmailOnOrder] = useState(true);
  const [whatsappOnOrder, setWhatsappOnOrder] = useState(true);
  const [provider, setProvider] = useState<"zapi" | "evolution">("zapi");
  const [zapiInstance, setZapiInstance] = useState("");
  const [zapiToken, setZapiToken] = useState("");
  const [zapiClientToken, setZapiClientToken] = useState("");
  const [evolutionUrl, setEvolutionUrl] = useState("");
  const [evolutionKey, setEvolutionKey] = useState("");
  const [evolutionInstance, setEvolutionInstance] = useState("");
  const [password, setPassword] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testPhone, setTestPhone] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/settings/notifications");
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Falha ao carregar");
      return;
    }
    apply(data);
  }

  function apply(data: Settings) {
    setMeta(data);
    setEmailOnOrder(Boolean(data.emailOnOrder));
    setWhatsappOnOrder(Boolean(data.whatsappOnOrder));
    setProvider(data.provider === "evolution" ? "evolution" : "zapi");
    setEvolutionUrl(data.evolutionUrl || "");
    setEvolutionInstance(data.evolutionInstance || "");
    setZapiInstance("");
    setZapiToken("");
    setZapiClientToken("");
    setEvolutionKey("");
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
    const changingSecrets = Boolean(
      zapiInstance.trim() ||
        zapiToken.trim() ||
        zapiClientToken.trim() ||
        evolutionKey.trim()
    );
    const res = await fetch("/api/admin/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emailOnOrder,
        whatsappOnOrder,
        provider,
        zapiInstance: zapiInstance.trim() || undefined,
        zapiToken: zapiToken.trim() || undefined,
        zapiClientToken: zapiClientToken.trim() || undefined,
        evolutionUrl: evolutionUrl.trim() || undefined,
        evolutionKey: evolutionKey.trim() || undefined,
        evolutionInstance: evolutionInstance.trim() || undefined,
        password: changingSecrets ? password : undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error || "Falha ao salvar");
      return;
    }
    setMsg("Notificações salvas.");
    apply(data);
  }

  async function onTest(channel: "email" | "whatsapp") {
    setTesting(channel);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/settings/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        to: channel === "email" ? testEmail : testPhone,
      }),
    });
    const data = await res.json();
    setTesting("");
    if (!res.ok) {
      setError(data.error || "Falha no teste");
      return;
    }
    setMsg(
      channel === "email"
        ? "E-mail de teste enviado."
        : "WhatsApp de teste enviado."
    );
  }

  if (loading) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <form onSubmit={onSave} className="space-y-5 border border-line bg-surface p-5">
        <h2 className="text-base font-medium">Quando a cliente faz um pedido</h2>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={emailOnOrder}
            onChange={(e) => setEmailOnOrder(e.target.checked)}
          />
          <span>
            Enviar e-mail de agradecimento
            <span className="block text-xs text-muted mt-0.5">
              {meta?.mailConfigured
                ? "SMTP do Gmail já está configurado no servidor."
                : "SMTP ainda não está no servidor (SMTP_HOST, SMTP_USER, SMTP_PASS = senha de app)."}
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            className="mt-1"
            checked={whatsappOnOrder}
            onChange={(e) => setWhatsappOnOrder(e.target.checked)}
          />
          <span>
            Enviar WhatsApp automático pelo número da loja
            <span className="block text-xs text-muted mt-0.5">
              {meta?.whatsappReady
                ? "API conectada."
                : "Falta colar as chaves da Z-API ou Evolution abaixo."}
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">Provedor do WhatsApp</p>
          <div className="flex gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="wa-provider"
                checked={provider === "zapi"}
                onChange={() => setProvider("zapi")}
              />
              Z-API
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="wa-provider"
                checked={provider === "evolution"}
                onChange={() => setProvider("evolution")}
              />
              Evolution API
            </label>
          </div>
        </div>

        {provider === "zapi" ? (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="text-sm text-muted">
              1. Crie conta em{" "}
              <a
                href="https://www.z-api.io/"
                target="_blank"
                rel="noreferrer"
                className="underline text-rose-dark"
              >
                z-api.io
              </a>
              . 2. Conecte o WhatsApp da loja (QR Code). 3. Copie Instance,
              Token e Client-Token.
            </p>
            <label className="block text-sm">
              Instance ID
              <input
                className="input mt-1 w-full"
                value={zapiInstance}
                onChange={(e) => setZapiInstance(e.target.value)}
                placeholder={meta?.zapiInstanceMasked || "Cole o instance"}
              />
            </label>
            <label className="block text-sm">
              Token
              <input
                className="input mt-1 w-full"
                type="password"
                value={zapiToken}
                onChange={(e) => setZapiToken(e.target.value)}
                placeholder={meta?.zapiTokenMasked || "Cole o token"}
              />
            </label>
            <label className="block text-sm">
              Client-Token (security token)
              <input
                className="input mt-1 w-full"
                type="password"
                value={zapiClientToken}
                onChange={(e) => setZapiClientToken(e.target.value)}
                placeholder={meta?.zapiClientTokenMasked || "Cole o client-token"}
              />
            </label>
          </div>
        ) : (
          <div className="space-y-3 border-t border-line pt-4">
            <p className="text-sm text-muted">
              Use se você já tem Evolution API no servidor. Informe a URL, a
              apikey e o nome da instância conectada ao WhatsApp da loja.
            </p>
            <label className="block text-sm">
              URL da Evolution
              <input
                className="input mt-1 w-full"
                value={evolutionUrl}
                onChange={(e) => setEvolutionUrl(e.target.value)}
                placeholder="https://evolution.seudominio.com"
              />
            </label>
            <label className="block text-sm">
              Instância
              <input
                className="input mt-1 w-full"
                value={evolutionInstance}
                onChange={(e) => setEvolutionInstance(e.target.value)}
                placeholder="majeste"
              />
            </label>
            <label className="block text-sm">
              API Key
              <input
                className="input mt-1 w-full"
                type="password"
                value={evolutionKey}
                onChange={(e) => setEvolutionKey(e.target.value)}
                placeholder={meta?.evolutionKeyMasked || "Cole a apikey"}
              />
            </label>
          </div>
        )}

        <label className="block text-sm">
          Senha do admin (obrigatória só ao salvar chaves da API)
          <input
            className="input mt-1 w-full"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>

        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </form>

      <div className="space-y-3 border border-line bg-surface p-5">
        <h2 className="text-base font-medium">Testar envio</h2>
        <label className="block text-sm">
          E-mail de teste
          <div className="mt-1 flex gap-2">
            <input
              className="input flex-1"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="ex.: seu@email.com"
            />
            <button
              type="button"
              className="btn btn-outline"
              disabled={testing === "email"}
              onClick={() => onTest("email")}
            >
              {testing === "email" ? "Enviando…" : "Testar e-mail"}
            </button>
          </div>
        </label>
        <label className="block text-sm">
          WhatsApp de teste (DDD + número)
          <div className="mt-1 flex gap-2">
            <input
              className="input flex-1"
              value={testPhone}
              onChange={(e) => setTestPhone(e.target.value)}
              placeholder="61999999999"
            />
            <button
              type="button"
              className="btn btn-outline"
              disabled={testing === "whatsapp"}
              onClick={() => onTest("whatsapp")}
            >
              {testing === "whatsapp" ? "Enviando…" : "Testar WhatsApp"}
            </button>
          </div>
        </label>
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
    </div>
  );
}
