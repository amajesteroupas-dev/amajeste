"use client";

import { FormEvent } from "react";
import { useRouter } from "next/navigation";

export function CustomerNoteForm({ customerId }: { customerId: string }) {
  const router = useRouter();

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    await fetch("/api/admin/customers/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId,
        channel: form.get("channel"),
        content: form.get("content"),
      }),
    });
    (e.target as HTMLFormElement).reset();
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-2">
      <select name="channel" className="input">
        <option value="WHATSAPP">WhatsApp</option>
        <option value="PHONE">Telefone</option>
        <option value="EMAIL">E-mail</option>
        <option value="IN_PERSON">Presencial</option>
        <option value="OTHER">Outro</option>
      </select>
      <textarea name="content" required placeholder="Registro do contato..." className="input min-h-20" />
      <button type="submit" className="btn btn-outline">
        Registrar contato
      </button>
    </form>
  );
}
