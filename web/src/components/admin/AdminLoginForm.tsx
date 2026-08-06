"use client";

import { FormEvent, useState } from "react";
import { SessionProvider, signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function AdminLoginFormInner() {
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const callbackUrl = params.get("callbackUrl") || "/admin";
    const res = await signIn("credentials", {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError("Credenciais inválidas.");
      return;
    }
    window.location.href = res?.url || callbackUrl;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#efe8df]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-black/10 bg-white p-8 space-y-4 shadow-sm"
      >
        <h1
          className="text-3xl text-center mb-2 text-[#121212]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ♛ Majesté
        </h1>
        <p className="text-center text-sm text-[#6b6560] mb-4">
          Acesso administrativo
        </p>
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="w-full px-3 py-3 border border-black/15 bg-white text-[#121212] outline-none focus:border-[#d4b56a]"
          defaultValue="admin@amajeste.com.br"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Senha"
          className="w-full px-3 py-3 border border-black/15 bg-white text-[#121212] outline-none focus:border-[#d4b56a]"
        />
        {error && <p className="text-sm text-[#8f4f59]">{error}</p>}
        <button
          type="submit"
          className="w-full py-3 bg-[#d4b56a] text-[#121212] text-xs font-semibold uppercase tracking-[0.16em] disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

/** SessionProvider com basePath do admin — não mistura com a sessão da loja. */
export default function AdminLoginForm() {
  return (
    <SessionProvider basePath="/api/admin/auth">
      <AdminLoginFormInner />
    </SessionProvider>
  );
}
