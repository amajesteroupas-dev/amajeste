"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatCpf } from "@/lib/cpf";
import {
  AddressFields,
  emptyAddressFields,
  type AddressFieldsValue,
} from "@/components/store/AddressFields";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  cpf: string | null;
  avatarUrl: string | null;
  birthDate: string | null;
  ambassadorDiscountPercent: number;
};

type Address = {
  id: string;
  label: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
};

export function ProfileEditor() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [msg, setMsg] = useState("");
  const [cpf, setCpf] = useState("");
  const [newAddr, setNewAddr] = useState<AddressFieldsValue>({
    ...emptyAddressFields(),
    label: "Casa",
  });
  const [savingAddr, setSavingAddr] = useState(false);

  async function load() {
    const [p, a] = await Promise.all([
      fetch("/api/account/profile").then((r) => r.json()),
      fetch("/api/account/addresses").then((r) => r.json()),
    ]);
    setProfile(p);
    setCpf(p.cpf ? formatCpf(p.cpf) : "");
    setAddresses(Array.isArray(a) ? a : []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onCpfBlur() {
    const digits = cpf.replace(/\D/g, "");
    if (digits.length !== 11 || !profile) return;
    const res = await fetch(`/api/cpf/${digits}`);
    if (!res.ok) return;
    const data = await res.json();
    if (data.name) {
      setProfile({ ...profile, name: data.name });
    }
  }

  async function saveProfile(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!profile) return;
    setMsg("");
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        cpf,
        birthDate: form.get("birthDate") || null,
      }),
    });
    const data = await res.json();
    setMsg(res.ok ? "Perfil atualizado." : data.error || "Erro");
    if (res.ok) load();
  }

  async function onAvatar(file: File) {
    const fd = new FormData();
    fd.set("file", file);
    await fetch("/api/account/avatar", { method: "POST", body: fd });
    load();
  }

  async function addAddress(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSavingAddr(true);
    const res = await fetch("/api/account/addresses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label: newAddr.label || "Entrega",
        street: newAddr.street,
        number: newAddr.number,
        complement: newAddr.complement,
        neighborhood: newAddr.neighborhood,
        city: newAddr.city,
        state: newAddr.state,
        zipCode: newAddr.zip,
        isDefault: addresses.length === 0,
      }),
    });
    setSavingAddr(false);
    if (!res.ok) {
      const data = await res.json();
      setMsg(data.error || "Erro ao salvar endereço");
      return;
    }
    setNewAddr({ ...emptyAddressFields(), label: "Casa" });
    setMsg("Endereço salvo.");
    load();
  }

  async function setDefault(id: string) {
    await fetch("/api/account/addresses", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, setDefault: true }),
    });
    load();
  }

  async function removeAddress(id: string) {
    if (!confirm("Remover este endereço?")) return;
    await fetch(`/api/account/addresses?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!profile) return <p className="text-sm text-[#5c534c]">Carregando...</p>;

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="space-y-5">
        <div>
          <h2
            className="text-xl text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Perfil
          </h2>
          <p className="text-xs text-[#8a7468] mt-1">
            Dados pessoais para pedidos e nota fiscal.
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-20 w-20 overflow-hidden bg-[#ece6df] border border-[#2a2420]/10">
            {profile.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatarUrl}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-[#8a7468] text-xs">
                Foto
              </div>
            )}
          </div>
          <label className="btn btn-outline !py-2 cursor-pointer text-xs">
            Enviar foto
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onAvatar(f);
              }}
            />
          </label>
        </div>

        <form onSubmit={saveProfile} className="space-y-3">
          <label className="block text-sm">
            CPF
            <input
              value={cpf}
              onChange={(e) => setCpf(formatCpf(e.target.value))}
              onBlur={onCpfBlur}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm">
            Nome
            <input
              name="name"
              defaultValue={profile.name}
              key={profile.name}
              required
              className="input mt-1"
            />
          </label>
          <label className="block text-sm">
            E-mail
            <input
              value={profile.email}
              disabled
              className="input mt-1 opacity-70"
            />
          </label>
          <label className="block text-sm">
            WhatsApp
            <input
              name="phone"
              defaultValue={profile.phone || ""}
              className="input mt-1"
            />
          </label>
          <label className="block text-sm">
            Nascimento
            <input
              name="birthDate"
              type="date"
              defaultValue={
                profile.birthDate ? profile.birthDate.slice(0, 10) : ""
              }
              className="input mt-1"
            />
          </label>
          {msg ? <p className="text-sm text-[#5c534c]">{msg}</p> : null}
          <button type="submit" className="btn btn-primary">
            Salvar perfil
          </button>
        </form>
      </section>

      <section className="space-y-5">
        <div>
          <h2
            className="text-xl text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Endereços de entrega
          </h2>
          <p className="text-xs text-[#8a7468] mt-1">
            Cadastre vários endereços e escolha no checkout qual usar.
          </p>
        </div>

        {addresses.length === 0 ? (
          <p className="text-sm text-[#5c534c] border border-dashed border-[#2a2420]/15 px-4 py-5">
            Nenhum endereço ainda. Adicione o principal abaixo.
          </p>
        ) : (
          <div className="space-y-3">
            {addresses.map((a) => (
              <div
                key={a.id}
                className={`text-sm border p-4 ${
                  a.isDefault
                    ? "border-[#a85f64]/40 bg-[#faf7f3]"
                    : "border-[#2a2420]/08 bg-white"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-[#2a2420]">
                      {a.label}
                      {a.isDefault ? (
                        <span className="ml-2 text-[10px] uppercase tracking-wider text-[#a85f64]">
                          Principal
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[#5c534c] mt-1 leading-relaxed">
                      {a.street}, {a.number}
                      {a.complement ? ` — ${a.complement}` : ""}
                      <br />
                      {a.neighborhood} · {a.city}/{a.state}
                      <br />
                      CEP {a.zipCode}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end">
                    {!a.isDefault ? (
                      <button
                        type="button"
                        className="text-xs text-[#a85f64] underline"
                        onClick={() => setDefault(a.id)}
                      >
                        Tornar principal
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="text-xs text-rose-700 underline"
                      onClick={() => removeAddress(a.id)}
                    >
                      Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <form
          onSubmit={addAddress}
          className="space-y-3 border border-[#2a2420]/08 p-4 bg-[#faf7f3]/40"
        >
          <p className="text-sm font-medium text-[#2a2420]">Novo endereço</p>
          <AddressFields
            value={newAddr}
            onChange={setNewAddr}
            showLabel
            compact
          />
          <button
            type="submit"
            className="btn btn-primary"
            disabled={savingAddr}
          >
            {savingAddr ? "Salvando…" : "Salvar endereço"}
          </button>
        </form>
      </section>
    </div>
  );
}
