"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { useFavorites } from "@/components/store/FavoritesProvider";

type Props = {
  productId: string;
  /** overlay no canto da foto (card / galeria) */
  className?: string;
  size?: "sm" | "md";
};

export function FavoriteHeartButton({
  productId,
  className = "",
  size = "sm",
}: Props) {
  const { isFavorite, toggle } = useFavorites();
  const favorited = isFavorite(productId);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  const icon = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";

  async function onClick(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;
    setBusy(true);
    const result = await toggle(productId);
    setBusy(false);
    if (result === "login") {
      const cb = encodeURIComponent(pathname || "/");
      router.push(`/entrar?callbackUrl=${cb}`);
      return;
    }
    if (result === "ok" && !favorited) {
      setPop(true);
      window.setTimeout(() => setPop(false), 420);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      aria-pressed={favorited}
      className={`favorite-heart inline-flex items-center justify-center transition-transform duration-200 ${
        pop ? "scale-125" : "scale-100"
      } ${className}`}
    >
      <Heart
        className={`${icon} ${
          favorited
            ? "fill-[#e11d48] text-[#e11d48]"
            : "fill-transparent text-[#2a2420]/75"
        } transition-colors`}
        strokeWidth={favorited ? 0 : 1.7}
      />
    </button>
  );
}
