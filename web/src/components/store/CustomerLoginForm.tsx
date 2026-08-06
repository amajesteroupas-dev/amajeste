"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

export function CustomerLoginForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const searchParams = useSearchParams();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const raw = searchParams.get("callbackUrl") || "/";
    const callbackUrl = raw.startsWith("/") ? raw : "/";
    const res = await signIn("credentials", {
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError(
        "E-mail ou senha incorretos. Contas de administrador entram em /admin/login."
      );
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        E-mail
        <input
          name="email"
          type="email"
          required
          className="input mt-1"
          autoComplete="email"
        />
      </label>
      <label className="block text-sm">
        Senha
        <input
          name="password"
          type="password"
          required
          className="input mt-1"
          autoComplete="current-password"
        />
      </label>
      {error ? <p className="text-sm text-rose-dark">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Entrando..." : "Entrar"}
      </button>
      <p className="text-sm text-center text-[#5c534c]">
        Ainda não tem conta?{" "}
        <Link
          href={
            searchParams.get("callbackUrl")
              ? `/cadastro?callbackUrl=${encodeURIComponent(
                  searchParams.get("callbackUrl") || "/"
                )}`
              : "/cadastro"
          }
          className="text-[#a85f64] underline"
        >
          Cadastre-se
        </Link>
      </p>
    </form>
  );
}
