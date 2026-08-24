"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

function loginErrorMessage(code?: string | null) {
  switch (code) {
    case "wrong_password":
      return "Errou a senha, maravilhosa! Confere com carinho e tenta de novo — ou redefine abaixo.";
    case "no_account":
      return "Não achamos conta com este e-mail. Que tal se cadastrar?";
    case "not_customer":
      return "Conta de administrador: entre em /admin/login.";
    default:
      return "Não deu para entrar, maravilhosa. Confira e-mail e senha — ou redefina abaixo.";
  }
}

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
    const email = String(form.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(form.get("password") || "");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setLoading(false);
    if (res?.error) {
      setError(loginErrorMessage(res.code));
      return;
    }
    window.location.href = callbackUrl;
  }

  const forgotHref = searchParams.get("callbackUrl")
    ? `/esqueci-senha?callbackUrl=${encodeURIComponent(
        searchParams.get("callbackUrl") || "/"
      )}`
    : "/esqueci-senha";

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
        <Link href={forgotHref} className="text-[#a85f64] underline">
          Esqueceu a senha?
        </Link>
      </p>
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
