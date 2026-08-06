"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Star } from "lucide-react";
import { useRouter } from "next/navigation";

export type PublicReview = {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
  customerName: string;
};

type Props = {
  productId: string;
  productName: string;
  reviews: PublicReview[];
  averageRating: number | null;
  reviewCount: number;
  /** Se o cliente logado já tem avaliação (qualquer status) */
  myReviewStatus?: "PENDING" | "APPROVED" | "REJECTED" | null;
};

function Stars({
  value,
  onChange,
  size = "sm",
}: {
  value: number;
  onChange?: (n: number) => void;
  size?: "sm" | "md";
}) {
  const cls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <div className="inline-flex gap-0.5" role={onChange ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((n) => {
        const filled = n <= value;
        const Comp = onChange ? "button" : "span";
        return (
          <Comp
            key={n}
            type={onChange ? "button" : undefined}
            onClick={onChange ? () => onChange(n) : undefined}
            aria-label={onChange ? `${n} estrela${n > 1 ? "s" : ""}` : undefined}
            className={onChange ? "p-0.5" : undefined}
          >
            <Star
              className={`${cls} ${
                filled
                  ? "fill-[#c4a35a] text-[#c4a35a]"
                  : "fill-transparent text-[#c4a35a]/50"
              }`}
              strokeWidth={1.4}
            />
          </Comp>
        );
      })}
    </div>
  );
}

export function ProductReviews({
  productId,
  productName,
  reviews,
  averageRating,
  reviewCount,
  myReviewStatus = null,
}: Props) {
  const { status } = useSession();
  const router = useRouter();
  const loggedIn = status === "authenticated";

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const canSubmit =
    loggedIn && myReviewStatus !== "APPROVED" && myReviewStatus !== "PENDING";

  const avgLabel = useMemo(() => {
    if (averageRating == null || reviewCount === 0) return null;
    return averageRating.toFixed(1).replace(".", ",");
  }, [averageRating, reviewCount]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    if (!loggedIn) {
      router.push(`/entrar?callbackUrl=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, rating, title, body }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "Não foi possível enviar");
        setBusy(false);
        return;
      }
      setMsg(data.message || "Enviado para aprovação.");
      setBody("");
      setTitle("");
      setShowForm(false);
      router.refresh();
    } catch {
      setErr("Erro de conexão. Tente de novo.");
    }
    setBusy(false);
  }

  return (
    <section className="mt-14 md:mt-16 border-t border-black/8 pt-10">
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h2
            className="text-2xl md:text-3xl text-[#2a2420]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Avaliações
          </h2>
          <p className="text-sm text-muted mt-1">
            {reviewCount > 0 && avgLabel ? (
              <>
                <span className="text-[#2a2420] font-medium">{avgLabel}</span>
                {" · "}
                {reviewCount}{" "}
                {reviewCount === 1 ? "avaliação" : "avaliações"} de quem comprou
                e usa {productName}
              </>
            ) : (
              "Seja a primeira a avaliar este produto."
            )}
          </p>
          {reviewCount > 0 && averageRating != null ? (
            <div className="mt-2">
              <Stars value={Math.round(averageRating)} />
            </div>
          ) : null}
        </div>

        {loggedIn ? (
          canSubmit ? (
            <button
              type="button"
              className="btn btn-outline !py-2 !px-4 text-xs"
              onClick={() => setShowForm((v) => !v)}
            >
              {showForm ? "Cancelar" : "Escrever avaliação"}
            </button>
          ) : myReviewStatus === "PENDING" ? (
            <p className="text-xs text-[#8a7468] max-w-xs text-right">
              Sua avaliação está aguardando aprovação da Majesté.
            </p>
          ) : myReviewStatus === "APPROVED" ? (
            <p className="text-xs text-[#8a7468]">Você já avaliou este produto.</p>
          ) : myReviewStatus === "REJECTED" ? (
            <button
              type="button"
              className="btn btn-outline !py-2 !px-4 text-xs"
              onClick={() => setShowForm(true)}
            >
              Enviar nova avaliação
            </button>
          ) : null
        ) : (
          <Link
            href={`/entrar?callbackUrl=${encodeURIComponent(`/produto/`)}`}
            className="btn btn-outline !py-2 !px-4 text-xs"
            onClick={(e) => {
              e.preventDefault();
              router.push(
                `/entrar?callbackUrl=${encodeURIComponent(window.location.pathname)}`
              );
            }}
          >
            Entrar para avaliar
          </Link>
        )}
      </div>

      {showForm && (canSubmit || myReviewStatus === "REJECTED") ? (
        <form
          onSubmit={submit}
          className="mb-8 border border-black/8 bg-[#faf7f3] p-5 space-y-4 max-w-xl"
        >
          <div>
            <p className="text-xs uppercase tracking-wider text-muted mb-2">
              Sua nota
            </p>
            <Stars value={rating} onChange={setRating} size="md" />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted">
              Título (opcional)
            </label>
            <input
              className="input mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Ex: Tecido incrível"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-wider text-muted">
              Comentário
            </label>
            <textarea
              className="input mt-1 min-h-[100px]"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              required
              minLength={8}
              maxLength={2000}
              placeholder="Conte como ficou o caimento, o conforto, o tecido…"
            />
          </div>
          {err ? <p className="text-sm text-red-700">{err}</p> : null}
          <button type="submit" className="btn btn-primary !py-2" disabled={busy}>
            {busy ? "Enviando…" : "Enviar para aprovação"}
          </button>
          <p className="text-[11px] text-muted">
            Toda avaliação passa pela equipe Majesté antes de aparecer na loja.
          </p>
        </form>
      ) : null}

      {msg ? (
        <p className="mb-6 text-sm text-[#5a7a4a] bg-[#eef5ea] border border-[#c5d9bc] px-4 py-3">
          {msg}
        </p>
      ) : null}

      {reviews.length === 0 ? (
        <p className="text-sm text-muted">Ainda não há avaliações publicadas.</p>
      ) : (
        <ul className="space-y-5">
          {reviews.map((r) => (
            <li
              key={r.id}
              className="border-b border-black/6 pb-5 last:border-0 last:pb-0"
            >
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <Stars value={r.rating} />
                <span className="text-sm font-medium text-[#2a2420]">
                  {r.customerName}
                </span>
                <span className="text-xs text-muted">
                  {new Date(r.createdAt).toLocaleDateString("pt-BR")}
                </span>
              </div>
              {r.title ? (
                <p className="text-sm font-medium text-[#2a2420] mb-1">{r.title}</p>
              ) : null}
              <p className="text-sm leading-relaxed text-[#555] whitespace-pre-line">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
