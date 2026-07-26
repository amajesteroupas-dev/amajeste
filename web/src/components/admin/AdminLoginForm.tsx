"use client";

import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";

export default function AdminLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: form.get("email"),
      password: form.get("password"),
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Credenciais inválidas");
      return;
    }
    router.push(params.get("callbackUrl") || "/admin");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#efe8df]">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md border border-line bg-surface p-8 space-y-4"
      >
        <h1
          className="text-3xl text-center mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          ♛ Majesté
        </h1>
        <p className="text-center text-sm text-muted mb-4">Acesso administrativo</p>
        <input
          name="email"
          type="email"
          required
          placeholder="E-mail"
          className="input"
          defaultValue="admin@amajeste.com.br"
        />
        <input
          name="password"
          type="password"
          required
          placeholder="Senha"
          className="input"
        />
        {error && <p className="text-sm text-rose-dark">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={loading}>
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
