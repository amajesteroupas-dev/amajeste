"use client";

import { FormEvent, useState } from "react";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg("");
    setError("");
    const res = await fetch("/api/newsletter", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.error || "Não foi possível inscrever");
      return;
    }
    setMsg(data.message || "Inscrição confirmada!");
    setEmail("");
  }

  return (
    <div className="space-y-2">
      <form onSubmit={onSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          placeholder="Seu e-mail"
          className="input flex-1"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <button type="submit" className="btn btn-dark" disabled={loading}>
          {loading ? "…" : "Inscrever"}
        </button>
      </form>
      {msg ? <p className="text-sm text-[#2e7d32]">{msg}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
    </div>
  );
}
