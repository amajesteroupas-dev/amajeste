"use client";

import { FormEvent, useEffect, useState } from "react";
import { HelpTip } from "@/components/admin/HelpTip";

type State = {
  mercadopago: {
    enabled: boolean;
    pixEnabled: boolean;
    boletoEnabled: boolean;
    hasToken: boolean;
    tokenMasked: string;
    tokenFromPanel: boolean;
    publicKey: string;
  };
  pagseguro: {
    enabled: boolean;
    sandbox: boolean;
    hasToken: boolean;
    tokenMasked: string;
    tokenFromPanel: boolean;
    publicKey: string;
    hasPublicKey: boolean;
  };
  infinitypay: {
    enabled: boolean;
    handle: string;
    handleFromPanel: boolean;
    hasHandle: boolean;
  };
};

export function PaymentsAdmin() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [data, setData] = useState<State | null>(null);

  const [mpEnabled, setMpEnabled] = useState(false);
  const [mpPix, setMpPix] = useState(true);
  const [mpToken, setMpToken] = useState("");
  const [mpClear, setMpClear] = useState(false);
  const [mpPublic, setMpPublic] = useState("");

  const [psEnabled, setPsEnabled] = useState(false);
  const [psSandbox, setPsSandbox] = useState(false);
  const [psToken, setPsToken] = useState("");
  const [psClear, setPsClear] = useState(false);
  const [psPublic, setPsPublic] = useState("");

  const [ipEnabled, setIpEnabled] = useState(false);
  const [ipHandle, setIpHandle] = useState("");
  const [ipClear, setIpClear] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/settings/payments");
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Falha ao carregar");
      return;
    }
    setData(json);
    setMpEnabled(json.mercadopago.enabled);
    setMpPix(json.mercadopago.pixEnabled);
    setMpPublic(json.mercadopago.publicKey || "");
    setMpToken("");
    setMpClear(false);
    setPsEnabled(json.pagseguro.enabled);
    setPsSandbox(json.pagseguro.sandbox);
    setPsPublic(json.pagseguro.publicKey || "");
    setPsToken("");
    setPsClear(false);
    setIpEnabled(json.infinitypay.enabled);
    setIpHandle(json.infinitypay.handle || "");
    setIpClear(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/admin/settings/payments", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mercadopago: {
          enabled: mpEnabled,
          pixEnabled: mpPix,
          boletoEnabled: false,
          whatsappEnabled: false,
          accessToken: mpClear ? undefined : mpToken.trim() || undefined,
          clearToken: mpClear,
          publicKey: mpPublic,
        },
        pagseguro: {
          enabled: psEnabled,
          sandbox: psSandbox,
          token: psClear ? undefined : psToken.trim() || undefined,
          clearToken: psClear,
          publicKey: psPublic,
        },
        infinitypay: {
          enabled: ipEnabled,
          handle: ipClear ? undefined : ipHandle.trim() || undefined,
          clearHandle: ipClear,
        },
      }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error || "Erro ao salvar");
      return;
    }
    setData(json);
    setMpToken("");
    setPsToken("");
    setMpClear(false);
    setPsClear(false);
    setIpClear(false);
    setMsg("Formas de pagamento salvas");
  }

  if (loading || !data) {
    return <p className="text-sm text-muted">Carregando…</p>;
  }

  return (
    <form onSubmit={onSave} className="space-y-6 max-w-2xl">
      <p className="text-sm text-muted">
        Ative só as opções que quiser testar no checkout. Sem credencial, o
        gateway fica indisponível na loja mesmo se estiver ligado.
      </p>

      {/* Mercado Pago */}
      <section className="border border-black/10 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-[#2a2420]">Mercado Pago</h2>
            <p className="text-xs text-muted mt-0.5">
              Checkout transparente na loja: Pix, cartão e carteira MP.
              Public Key é necessária para cartão e Mercado Pago.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm shrink-0">
            <input
              type="checkbox"
              checked={mpEnabled}
              onChange={(e) => setMpEnabled(e.target.checked)}
            />
            Ativo
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={mpPix}
            onChange={(e) => setMpPix(e.target.checked)}
            disabled={!mpEnabled}
          />
          Oferecer Pix
        </label>
        <label className="block text-xs uppercase tracking-wider text-muted">
          Access Token
          <HelpTip text="Mercado Pago → Seu negócio → Credenciais de produção (ou teste)." />
          <input
            type="password"
            className="input mt-1 font-mono text-sm"
            value={mpToken}
            onChange={(e) => {
              setMpToken(e.target.value);
              setMpClear(false);
            }}
            placeholder={
              data.mercadopago.hasToken
                ? `Salvo: ${data.mercadopago.tokenMasked}`
                : "APP_USR-..."
            }
          />
        </label>
        {data.mercadopago.hasToken ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mpClear}
              onChange={(e) => setMpClear(e.target.checked)}
            />
            Remover token do painel
          </label>
        ) : null}
        <label className="block text-xs uppercase tracking-wider text-muted">
          Public Key (obrigatória para cartão)
          <input
            className="input mt-1 font-mono text-sm"
            value={mpPublic}
            onChange={(e) => setMpPublic(e.target.value)}
            placeholder="APP_USR-..."
          />
        </label>
      </section>

      {/* PagSeguro */}
      <section className="border border-black/10 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-[#2a2420]">
              PagSeguro / PagBank
            </h2>
            <p className="text-xs text-muted mt-0.5">
              Checkout transparente: cartão e Pix separados na loja (API Orders),
              sem sair do site. Exige token de produção, chave pública e chave
              Pix cadastrada na conta PagBank.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm shrink-0">
            <input
              type="checkbox"
              checked={psEnabled}
              onChange={(e) => setPsEnabled(e.target.checked)}
            />
            Ativo
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={psSandbox}
            onChange={(e) => {
              setPsSandbox(e.target.checked);
              // Chave pública é específica do ambiente (Sandbox ≠ produção).
              setPsPublic("");
            }}
          />
          Sandbox (testes)
        </label>
        <p className="text-xs text-[#8a7468] leading-relaxed">
          {psSandbox
            ? "Sandbox: Sandbox PagBank → Perfis de integração → Vendedor → copiar o token de Credenciais. Marque Sandbox aqui."
            : "Produção: iBanking → Vendas → Plataformas e Checkout → Integrações → gerar token. Desmarque Sandbox. Ao trocar de Sandbox para produção, a chave pública é limpa e regenerada automaticamente."}
        </p>
        <label className="block text-xs uppercase tracking-wider text-muted">
          Token do Vendedor
          <HelpTip text="Não use o token da página Tokens (com e-mail). Use Perfis de integração → Vendedor (sandbox) ou Integrações na conta real (produção). Cole só o token, sem Bearer." />
          <input
            type="password"
            className="input mt-1 font-mono text-sm"
            value={psToken}
            onChange={(e) => {
              setPsToken(e.target.value);
              setPsClear(false);
            }}
            placeholder={
              data.pagseguro.hasToken
                ? `Salvo: ${data.pagseguro.tokenMasked}`
                : "Token do Vendedor (não o da tela Tokens)"
            }
          />
        </label>
        {data.pagseguro.hasToken ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={psClear}
              onChange={(e) => setPsClear(e.target.checked)}
            />
            Remover token do painel
          </label>
        ) : null}
        <label className="block text-xs uppercase tracking-wider text-muted">
          Chave pública (cartão)
          <HelpTip text="Usada pelo SDK no browser (encryptCard). Em produção use POST /public-keys. Se deixar em branco com token válido, o sistema cria via API PagBank (ambiente Sandbox ou produção conforme o checkbox acima)." />
          <textarea
            className="input mt-1 font-mono text-xs min-h-[88px]"
            value={psPublic}
            onChange={(e) => setPsPublic(e.target.value)}
            placeholder={
              data.pagseguro.hasPublicKey
                ? "Chave já salva — cole outra para substituir"
                : "-----BEGIN PUBLIC KEY----- …"
            }
          />
        </label>
      </section>

      {/* Infinity Pay */}
      <section className="border border-black/10 bg-white p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-medium text-[#2a2420]">Infinity Pay</h2>
            <p className="text-xs text-muted mt-0.5">
              Checkout InfinitePay (cartão até 12x e Pix). Use sua InfiniteTag.
            </p>
          </div>
          <label className="inline-flex items-center gap-2 text-sm shrink-0">
            <input
              type="checkbox"
              checked={ipEnabled}
              onChange={(e) => setIpEnabled(e.target.checked)}
            />
            Ativo
          </label>
        </div>
        <label className="block text-xs uppercase tracking-wider text-muted">
          InfiniteTag (handle)
          <HelpTip text="Seu @ / tag no app InfinitePay, sem o $. Ex.: majestefitness" />
          <input
            className="input mt-1"
            value={ipHandle}
            onChange={(e) => {
              setIpHandle(e.target.value.replace(/^\$/, ""));
              setIpClear(false);
            }}
            placeholder="sua_tag"
          />
        </label>
        {data.infinitypay.hasHandle ? (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ipClear}
              onChange={(e) => setIpClear(e.target.checked)}
            />
            Remover handle do painel
          </label>
        ) : null}
      </section>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}

      <button type="submit" className="btn btn-primary" disabled={saving}>
        {saving ? "Salvando…" : "Salvar formas de pagamento"}
      </button>
    </form>
  );
}
