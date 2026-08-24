"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    const form = new FormData(e.currentTarget);
    const password = String(form.get("password") || "");
    const confirm = String(form.get("confirm") || "");

    if (password.length < 6) {
      setLoading(false);
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setLoading(false);
      setError("As senhas não são iguais.");
      return;
    }
    if (!token) {
      setLoading(false);
      setError("Link inválido. Peça um novo em Esqueci a senha.");
      return;
    }

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Não foi possível redefinir a senha.");
      return;
    }

    setMsg(data.message || "Senha atualizada! Agora você já pode entrar.");
  }

  if (!token) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-rose-dark">
          Link incompleto. Peça um novo e-mail em Esqueci a senha.
        </p>
        <Link href="/esqueci-senha" className="btn btn-primary w-full text-center">
          Esqueci a senha
        </Link>
      </div>
    );
  }

  if (msg) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-emerald-800 leading-relaxed">{msg}</p>
        <Link href="/entrar" className="btn btn-primary w-full text-center">
          Entrar na conta
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        Nova senha
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="input mt-1"
          autoComplete="new-password"
        />
      </label>
      <label className="block text-sm">
        Confirmar nova senha
        <input
          name="confirm"
          type="password"
          required
          minLength={6}
          className="input mt-1"
          autoComplete="new-password"
        />
      </label>
      {error ? <p className="text-sm text-rose-dark">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Salvando…" : "Salvar nova senha"}
      </button>
      <p className="text-sm text-center text-[#5c534c]">
        <Link href="/entrar" className="text-[#a85f64] underline">
          Voltar para entrar
        </Link>
      </p>
    </form>
  );
}
