"use client";

import { useEffect, useState } from "react";

type IgPost = {
  id: string;
  permalink: string;
  shortcode: string;
  mediaType: string;
  caption: string | null;
  coverUrl: string | null;
  active: boolean;
  sortOrder: number;
};

export function InstagramAdminList() {
  const [posts, setPosts] = useState<IgPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");
  const [profileUrl, setProfileUrl] = useState(
    "https://www.instagram.com/amajeste_/"
  );
  const [bulkLinks, setBulkLinks] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/admin/instagram");
    if (!res.ok) {
      setError("Falha ao carregar posts");
      setLoading(false);
      return;
    }
    setPosts(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function importProfile() {
    setSyncMsg("Tentando ler o perfil...");
    setError("");
    const res = await fetch("/api/admin/instagram/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileUrl, limit: 30 }),
    });
    const data = await res.json();
    if (!res.ok) {
      setSyncMsg("");
      setError(data.error || "Falha na importação");
      return;
    }
    setSyncMsg(
      `Perfil @${data.username} (${data.source}): ${data.imported} novos · ${data.updated} atualizados`
    );
    load();
  }

  async function importLinks(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSyncMsg("Importando links...");
    const res = await fetch("/api/admin/instagram/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ links: bulkLinks }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setSyncMsg("");
      setError(data.error || "Falha ao importar links");
      return;
    }
    setSyncMsg(
      `${data.imported} novos · ${data.updated} já existiam (${data.total} links)`
    );
    setBulkLinks("");
    load();
  }

  async function toggleActive(p: IgPost) {
    await fetch("/api/admin/instagram", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: p.id, active: !p.active }),
    });
    load();
  }

  async function move(id: string, dir: -1 | 1) {
    const idx = posts.findIndex((p) => p.id === id);
    const swap = idx + dir;
    if (swap < 0 || swap >= posts.length) return;
    const next = [...posts];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setPosts(next);
    await fetch("/api/admin/instagram", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order: next.map((p) => p.id) }),
    });
  }

  async function remove(id: string) {
    if (!confirm("Remover este post da galeria?")) return;
    await fetch(`/api/admin/instagram?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-muted">Carregando...</p>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Instagram</h1>
        <p className="text-sm text-muted mt-1 max-w-2xl">
          Cole vários links de fotos e reels de uma vez. No site eles aparecem
          embutidos do Instagram (com as pessoas e o vídeo).
        </p>
      </div>

      {syncMsg ? (
        <p className="text-sm text-muted bg-white border border-black/8 px-4 py-3">
          {syncMsg}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm text-red-600 whitespace-pre-wrap">{error}</p>
      ) : null}

      <form
        onSubmit={importLinks}
        className="bg-white border border-black/8 p-5 space-y-3"
      >
        <p className="text-sm font-medium">Colar vários links de uma vez</p>
        <p className="text-xs text-muted">
          No Instagram: abrir o post/reel → compartilhar → copiar link. Cole
          vários aqui (um por linha ou todos juntos).
        </p>
        <textarea
          className="w-full border border-black/15 px-3 py-2 min-h-[140px] font-mono text-sm"
          placeholder={`https://www.instagram.com/reel/DbOFpaeukHb/\nhttps://www.instagram.com/p/XXXX/\nhttps://www.instagram.com/reel/YYYY/`}
          value={bulkLinks}
          onChange={(e) => setBulkLinks(e.target.value)}
          required
        />
        <button type="submit" className="btn btn-primary" disabled={saving}>
          {saving ? "Importando..." : "Importar links"}
        </button>
      </form>

      <section className="bg-white border border-black/8 p-5 space-y-3">
        <p className="text-sm font-medium">Tentar importar pelo perfil</p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            className="flex-1 border border-black/15 px-3 py-2"
            value={profileUrl}
            onChange={(e) => setProfileUrl(e.target.value)}
            placeholder="https://www.instagram.com/amajeste_/"
          />
          <button
            type="button"
            className="btn btn-outline"
            onClick={importProfile}
          >
            Importar perfil
          </button>
        </div>
        <p className="text-xs text-muted">
          O Instagram costuma bloquear isso no servidor. Se falhar, use a caixa
          de links acima — é o caminho mais rápido.
        </p>
      </section>

      <div className="space-y-3">
        {posts.length === 0 ? (
          <p className="text-sm text-muted">Nenhum post ainda.</p>
        ) : null}
        {posts.map((p, i) => (
          <div
            key={p.id}
            className="bg-white border border-black/8 p-3 flex flex-wrap items-center gap-4"
          >
            <div className="h-16 w-16 shrink-0 bg-[#eee] flex items-center justify-center text-[10px] uppercase tracking-wide text-muted">
              {p.mediaType === "VIDEO" ? "Reel" : "Foto"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{p.shortcode}</p>
              <p className="text-xs text-muted">
                {p.mediaType}
                {!p.active ? " · oculto" : ""}
              </p>
              <a
                href={p.permalink}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-[#c9a24a] hover:underline break-all"
              >
                {p.permalink}
              </a>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <button type="button" onClick={() => move(p.id, -1)} disabled={i === 0}>
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(p.id, 1)}
                disabled={i === posts.length - 1}
              >
                ↓
              </button>
              <button type="button" onClick={() => toggleActive(p)}>
                {p.active ? "Ocultar" : "Exibir"}
              </button>
              <button
                type="button"
                className="text-red-600"
                onClick={() => remove(p.id)}
              >
                Excluir
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
