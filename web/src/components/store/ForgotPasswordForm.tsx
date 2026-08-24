"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";

export function ForgotPasswordForm() {
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();
  const loginHref = searchParams.get("callbackUrl")
    ? `/entrar?callbackUrl=${encodeURIComponent(
        searchParams.get("callbackUrl") || "/"
      )}`
    : "/entrar";

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Não foi possível enviar o e-mail agora.");
      return;
    }

    setMsg(
      data.message ||
        "Se este e-mail tiver conta, enviamos o link. Confira também o spam."
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        E-mail da conta
        <input
          name="email"
          type="email"
          required
          className="input mt-1"
          autoComplete="email"
          placeholder="seu@email.com"
        />
      </label>
      {error ? <p className="text-sm text-rose-dark">{error}</p> : null}
      {msg ? <p className="text-sm text-emerald-800 leading-relaxed">{msg}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Enviando…" : "Enviar link por e-mail"}
      </button>
      <p className="text-sm text-center text-[#5c534c]">
        Lembrou a senha?{" "}
        <Link href={loginHref} className="text-[#a85f64] underline">
          Voltar para entrar
        </Link>
      </p>
    </form>
  );
}
