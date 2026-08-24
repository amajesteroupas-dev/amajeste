"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { SessionProvider, signIn } from "next-auth/react";
import { formatCpf } from "@/lib/cpf";

type Props = {
  customerId: string;
  name: string;
  email: string;
  phone: string;
  cpf: string;
  hasStoreAccount: boolean;
};

function CustomerAdminActionsInner({
  customerId,
  name,
  email,
  phone,
  cpf,
  hasStoreAccount,
}: Props) {
  const router = useRouter();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    const form = new FormData(e.currentTarget);
    const res = await fetch(`/api/admin/customers/${customerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        cpf: form.get("cpf"),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Não foi possível salvar");
      return;
    }
    setMsg("Dados salvos.");
    router.refresh();
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    setMsg("");
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");
    if (password !== confirm) {
      setBusy(false);
      setErr("As senhas não coincidem");
      return;
    }
    const res = await fetch(`/api/admin/customers/${customerId}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setErr(data.error || "Não foi possível alterar a senha");
      return;
    }
    (e.target as HTMLFormElement).reset();
    setMsg("Senha atualizada. A cliente já pode entrar com a nova senha.");
  }

  async function loginAsCustomer() {
    setBusy(true);
    setErr("");
    setMsg("");
    const res = await fetch(`/api/admin/customers/${customerId}/impersonate`, {
      method: "POST",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      setErr(data.error || "Não foi possível gerar o acesso");
      return;
    }
    const login = await signIn("credentials", {
      impersonationToken: data.token,
      redirect: false,
      callbackUrl: "/conta",
    });
    setBusy(false);
    if (login?.error) {
      setErr("Falha ao abrir a sessão da cliente");
      return;
    }
    window.open("/conta", "_blank", "noopener,noreferrer");
    setMsg("Sessão da cliente aberta em nova aba. Seu painel admin continua logado.");
  }

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="space-y-3">
        <h2 className="font-semibold">Dados cadastrais</h2>
        <label className="block text-sm">
          <span className="text-muted">Nome completo</span>
          <input name="name" className="input mt-1" defaultValue={name} required />
        </label>
        <label className="block text-sm">
          <span className="text-muted">E-mail</span>
          <input className="input mt-1 bg-black/5" value={email} readOnly />
        </label>
        <label className="block text-sm">
          <span className="text-muted">CPF (nota fiscal / Correios)</span>
          <input
            name="cpf"
            className="input mt-1 font-mono"
            defaultValue={cpf ? formatCpf(cpf) : ""}
            placeholder="000.000.000-00"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">WhatsApp / telefone</span>
          <input name="phone" className="input mt-1" defaultValue={phone} />
        </label>
        <button type="submit" className="btn btn-outline" disabled={busy}>
          Salvar dados
        </button>
      </form>

      <div className="border-t border-line pt-5 space-y-3">
        <h2 className="font-semibold">Acesso à conta</h2>
        {!hasStoreAccount ? (
          <p className="text-sm text-muted">
            Esta cliente ainda não tem login na loja (comprou só como convidada).
          </p>
        ) : (
          <>
            <button
              type="button"
              className="btn btn-outline w-full"
              disabled={busy}
              onClick={loginAsCustomer}
            >
              Entrar como esta cliente
            </button>
            <form onSubmit={changePassword} className="space-y-2">
              <p className="text-xs text-muted">Redefinir senha da loja</p>
              <input
                name="password"
                type="password"
                className="input"
                placeholder="Nova senha (mín. 6)"
                minLength={6}
                required
              />
              <input
                name="confirm"
                type="password"
                className="input"
                placeholder="Confirmar nova senha"
                minLength={6}
                required
              />
              <button type="submit" className="btn btn-outline" disabled={busy}>
                Alterar senha
              </button>
            </form>
          </>
        )}
      </div>

      {err ? <p className="text-sm text-rose-dark">{err}</p> : null}
      {msg ? <p className="text-sm text-emerald-800">{msg}</p> : null}
    </div>
  );
}

/** Usa SessionProvider da loja (/api/auth), não o do admin. */
export function CustomerAdminActions(props: Props) {
  return (
    <SessionProvider>
      <CustomerAdminActionsInner {...props} />
    </SessionProvider>
  );
}
