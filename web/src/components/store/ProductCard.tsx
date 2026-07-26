import Link from "next/link";
import { formatBRL } from "@/lib/utils";

type ProductCardProps = {
  name: string;
  slug: string;
  price: number | string;
  imageUrl?: string | null;
  compareAt?: number | string | null;
};

export function ProductCard({
  name,
  slug,
  price,
  imageUrl,
  compareAt,
}: ProductCardProps) {
  return (
    <Link href={`/produto/${slug}`} className="product-card group block">
      <div className="relative aspect-[3/4] overflow-hidden bg-[#ebe4db]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={name}
            className="product-img h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted text-sm">
            Sem imagem
          </div>
        )}
      </div>
      <div className="mt-3">
        <h3
          className="text-lg leading-tight group-hover:text-rose-dark transition-colors"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {name}
        </h3>
        <div className="mt-1 flex items-center gap-2 text-sm">
          <span className="font-semibold">{formatBRL(Number(price))}</span>
          {compareAt && Number(compareAt) > Number(price) && (
            <span className="text-muted line-through text-xs">
              {formatBRL(Number(compareAt))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
