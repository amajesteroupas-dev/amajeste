"use client";

import { useState } from "react";
import { Video } from "lucide-react";
import { ProductVideoModal } from "@/components/store/ProductVideoModal";

type Props = {
  videoUrl?: string;
  videoUrls?: string[];
  title?: string;
  className?: string;
  size?: "sm" | "md";
};

export function ProductVideoButton({
  videoUrl,
  videoUrls,
  title,
  className = "",
  size = "sm",
}: Props) {
  const [open, setOpen] = useState(false);
  const pool =
    videoUrls && videoUrls.length > 0
      ? videoUrls
      : videoUrl
        ? [videoUrl]
        : [];
  if (pool.length === 0) return null;

  const box = size === "md" ? "h-10 w-10" : "h-8 w-8";
  const icon = size === "md" ? 18 : 15;

  return (
    <>
      <button
        type="button"
        aria-label="Ver vídeo do produto"
        title="Ver vídeo"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={`inline-flex ${box} items-center justify-center rounded-md bg-[#1a1a1a] text-white shadow-sm transition hover:bg-[#333] ${className}`}
      >
        <Video size={icon} strokeWidth={1.75} />
      </button>
      <ProductVideoModal
        videoUrls={pool}
        title={title}
        open={open}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
