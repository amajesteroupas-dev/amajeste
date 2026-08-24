"use client";

import { useState } from "react";
import { LookPhotoLightbox } from "@/components/store/LookPhotoLightbox";

type Props = {
  imageUrl: string;
  caption?: string | null;
  firstName: string;
  productName?: string | null;
};

export function LookGalleryCard({
  imageUrl,
  caption,
  firstName,
  productName,
}: Props) {
  const [open, setOpen] = useState(false);
  const meta = productName ? `${firstName} · ${productName}` : firstName;

  return (
    <>
      <article className="h-full flex flex-col border border-[#2a2420]/10 bg-white overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="relative block w-full aspect-[3/4] bg-[#ece6df] overflow-hidden shrink-0"
          aria-label={`Ver foto de ${firstName}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt={caption || `Look de ${firstName}`}
            className="absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        </button>
        <div className="flex-1 px-3.5 py-3 md:px-4 md:py-3.5">
          <p className="text-[10px] md:text-[11px] uppercase tracking-[0.16em] text-[#8a7468]">
            {meta}
          </p>
          {caption ? (
            <p className="mt-2 text-sm text-[#3a322c] leading-relaxed whitespace-pre-wrap">
              {caption}
            </p>
          ) : null}
        </div>
      </article>
      <LookPhotoLightbox
        open={open}
        onClose={() => setOpen(false)}
        src={imageUrl}
        alt={caption || `Look de ${firstName}`}
        caption={caption}
        meta={meta}
      />
    </>
  );
}
