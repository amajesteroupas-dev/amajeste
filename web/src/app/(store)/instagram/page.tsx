import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { instagramUrl, siteContact } from "@/lib/site";
import { BrandLogo } from "@/components/store/BrandLogo";
import { InstagramGallery } from "@/components/store/InstagramGallery";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Instagram",
  description: `Fotos e vídeos de @${siteContact.instagram} — veja o feed Majesté no site.`,
};

function InstagramIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden
    >
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function coverOf(p: {
  coverUrl: string | null;
  thumbnailUrl: string | null;
  mediaUrl: string | null;
}) {
  return p.coverUrl || p.thumbnailUrl || p.mediaUrl;
}

export default async function InstagramPage() {
  const posts = await prisma.instagramPost.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { postedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      permalink: true,
      shortcode: true,
      mediaType: true,
      caption: true,
      coverUrl: true,
      mediaUrl: true,
      thumbnailUrl: true,
    },
  });

  const handle = siteContact.instagram.replace(/^@/, "");
  const heroCovers = posts
    .map((p) => coverOf(p))
    .filter((src): src is string => Boolean(src))
    .slice(0, 3);

  return (
    <div className="bg-[#f4efe8]">
      <div className="container-maj pt-8 md:pt-10">
        <section className="ig-hero" aria-label="Majesté no Instagram">
          <div className="ig-hero-inner">
            <div className="ig-hero-copy">
              <div className="ig-hero-brand">
                <BrandLogo size="md" />
              </div>
              <p className="ig-hero-handle">
                <InstagramIcon size={13} />
                @{handle}
              </p>
              <h1
                className="ig-hero-title"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Onde o look ganha movimento
              </h1>
              <p className="ig-hero-lead">
                Reels e fotos da Majesté — explore o feed abaixo.
              </p>
              <div className="ig-hero-actions">
                <a
                  href={instagramUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                >
                  <InstagramIcon size={15} />
                  Seguir @{handle}
                </a>
                <Link
                  href="/categoria/conjunto-legging"
                  className="btn btn-outline"
                >
                  Ver coleção
                </Link>
              </div>
            </div>

            {heroCovers.length > 0 ? (
              <div className="ig-hero-previews" aria-hidden>
                {heroCovers.map((src, i) => (
                  <div
                    key={`prev-${i}`}
                    className={`ig-hero-preview ig-hero-preview--${i + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt="" />
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <div className="container-maj relative py-7 md:py-10">
        {posts.length === 0 ? (
          <div className="border border-black/10 bg-white/70 px-6 py-16 text-center max-w-lg mx-auto">
            <p
              className="text-[#2a2420] mb-2"
              style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem" }}
            >
              Em breve neste espaço
            </p>
            <p className="text-sm text-[#5c534c] mb-6">
              Enquanto isso, confira as novidades no Instagram oficial.
            </p>
            <a
              href={instagramUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-[#8a7468] hover:text-[#2a2420]"
            >
              <InstagramIcon size={16} />
              @{handle}
            </a>
          </div>
        ) : (
          <InstagramGallery posts={posts} />
        )}
      </div>
    </div>
  );
}
