"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { formatCpf } from "@/lib/cpf";
import {
  AddressFields,
  emptyAddressFields,
  type AddressFieldsValue,
} from "@/components/store/AddressFields";

export function CustomerRegisterForm() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [cpf, setCpf] = useState("");
  const [name, setName] = useState("");
  const [address, setAddress] = useState<AddressFieldsValue>(emptyAddressFields());
  const searchParams = useSearchParams();
  const rawCallback = searchParams.get("callbackUrl") || "/";
  const callbackUrl = rawCallback.startsWith("/") ? rawCallback : "/";
  const loginHref =
    callbackUrl !== "/"
      ? `/entrar?callbackUrl=${encodeURIComponent(callbackUrl)}`
      : "/entrar";

  async function onCpfBlur() {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11) return;
    const res = await fetch(`/api/cpf/${digits}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.name && !name.trim()) {
      setName(data.name);
    }
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const form = new FormData(e.currentTarget);
    const payload = {
      name: name || String(form.get("name") || ""),
      email: String(form.get("email") || "")
        .trim()
        .toLowerCase(),
      password: String(form.get("password") || ""),
      phone: String(form.get("phone") || ""),
      cpf,
      zipCode: address.zip,
      street: address.street,
      number: address.number,
      complement: address.complement,
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      addressLabel: address.label || "Principal",
    };

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setLoading(false);
      setError(data.error || "Falha no cadastro");
      return;
    }

    const login = await signIn("credentials", {
      email: payload.email,
      password: payload.password,
      redirect: false,
    });
    setLoading(false);
    if (login?.error) {
      setError("Conta criada. Faça login em Entrar.");
      return;
    }
    window.location.href = callbackUrl;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block text-sm">
        CPF (nota fiscal)
        <input
          value={cpf}
          onChange={(e) => setCpf(formatCpf(e.target.value))}
          onBlur={onCpfBlur}
          placeholder="000.000.000-00"
          className="input mt-1"
          inputMode="numeric"
        />
      </label>
      <label className="block text-sm">
        Nome completo
        <input
          name="name"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input mt-1"
          autoComplete="name"
        />
      </label>
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
        WhatsApp
        <input name="phone" className="input mt-1" autoComplete="tel" />
      </label>
      <label className="block text-sm">
        Senha (mín. 6 caracteres)
        <input
          name="password"
          type="password"
          required
          minLength={6}
          className="input mt-1"
          autoComplete="new-password"
        />
      </label>

      <div className="border-t border-black/10 pt-4 space-y-3">
        <div>
          <p className="text-sm font-medium text-[#2a2420]">
            Endereço principal
          </p>
          <p className="text-xs text-[#8a7468] mt-0.5">
            Usado nas entregas. Você pode cadastrar outros depois na sua conta.
            Digite o CEP para preencher automaticamente.
          </p>
        </div>
        <AddressFields value={address} onChange={setAddress} />
      </div>

      {error ? <p className="text-sm text-rose-dark">{error}</p> : null}
      <button type="submit" className="btn btn-primary w-full" disabled={loading}>
        {loading ? "Criando conta..." : "Criar conta"}
      </button>
      <p className="text-sm text-center text-[#5c534c]">
        Já tem conta?{" "}
        <Link href={loginHref} className="text-[#a85f64] underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
