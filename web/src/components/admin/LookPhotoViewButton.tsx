"use client";

import { useState } from "react";
import { Expand } from "lucide-react";
import { LookPhotoLightbox } from "@/components/store/LookPhotoLightbox";

type Props = {
  imageUrl: string;
  caption?: string | null;
  customerName: string;
  productName?: string | null;
};

export function LookPhotoViewButton({
  imageUrl,
  caption,
  customerName,
  productName,
}: Props) {
  const [open, setOpen] = useState(false);
  const meta = productName
    ? `${customerName} · ${productName}`
    : customerName;

  return (
    <div className="flex flex-col items-start gap-1.5">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative group block"
        title="Ver foto em tamanho grande"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="h-20 w-16 object-cover bg-[#ece6df] border border-line"
        />
        <span className="absolute inset-0 flex items-center justify-center bg-[#2a2420]/0 group-hover:bg-[#2a2420]/35 transition-colors">
          <Expand
            size={16}
            className="text-white opacity-0 group-hover:opacity-100"
          />
        </span>
      </button>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] underline text-rose-dark hover:text-ink"
      >
        Verificar foto
      </button>
      <LookPhotoLightbox
        open={open}
        onClose={() => setOpen(false)}
        src={imageUrl}
        alt={caption || `Look de ${customerName}`}
        caption={caption}
        meta={meta}
      />
    </div>
  );
}
