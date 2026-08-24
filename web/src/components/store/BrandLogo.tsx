import { cn } from "@/lib/utils";
import { MajesteCrown } from "@/components/store/MajesteCrown";

type BrandLogoProps = {
  className?: string;
  /** sm ~40px · md ~56px · lg ~72px · section ~ título de seção */
  size?: "sm" | "md" | "lg" | "section";
  /** Esconde a palavra FITNESS */
  showTagline?: boolean;
  /** Esconde a coroa (wordmark só “Majesté”) */
  showCrown?: boolean;
};

const SIZES = {
  sm: { height: 44, crown: 18, name: "1.28rem", tag: "0.42rem", gap: 2 },
  md: { height: 56, crown: 24, name: "1.62rem", tag: "0.5rem", gap: 3 },
  lg: { height: 72, crown: 30, name: "2.05rem", tag: "0.58rem", gap: 4 },
  section: { height: 52, crown: 0, name: "2.75rem", tag: "0.5rem", gap: 0 },
} as const;

const WORDMARK_STYLE = {
  fontFamily: "var(--font-display), Georgia, 'Times New Roman', serif",
  fontWeight: 500,
  letterSpacing: "0.02em",
  color: "#c2a45b",
  background:
    "linear-gradient(180deg, #e8d090 0%, #c9a24a 45%, #8f6f2c 100%)",
  WebkitBackgroundClip: "text" as const,
  backgroundClip: "text" as const,
  WebkitTextFillColor: "transparent",
};

export function BrandLogo({
  className,
  size = "md",
  showTagline = true,
  showCrown = true,
}: BrandLogoProps) {
  const s = SIZES[size];
  const gradId = `maj-${size}-${showCrown ? "c" : "w"}-${showTagline ? "t" : "n"}`;

  return (
    <span
      className={cn(
        "inline-flex flex-col items-center justify-center select-none",
        className
      )}
      style={{ height: showCrown || showTagline ? s.height : "auto" }}
      aria-label="Majesté"
    >
      {showCrown && s.crown > 0 ? (
        <MajesteCrown
          size={s.crown}
          gradId={gradId}
          className="block drop-shadow-[0_1px_0_rgba(168,132,47,0.25)]"
        />
      ) : null}
      <span
        className="leading-none text-center"
        style={{
          ...WORDMARK_STYLE,
          fontSize: s.name,
          marginTop: showCrown && s.crown > 0 ? s.gap : 0,
        }}
      >
        Majesté
      </span>
      {showTagline ? (
        <span
          className="leading-none text-center"
          style={{
            fontFamily: "var(--font-body), system-ui, sans-serif",
            fontSize: s.tag,
            fontWeight: 600,
            letterSpacing: "0.38em",
            textIndent: "0.38em",
            color: "#a8842f",
            marginTop: Math.max(2, s.gap - 1),
            alignSelf: "flex-end",
            paddingRight: "0.15em",
          }}
        >
          FITNESS
        </span>
      ) : null}
    </span>
  );
}

/**
 * Título de seção na identidade dourada (serif) da marca.
 * Home: Coleção = “Majesté” · segunda grade = “Destaques”.
 */
export function BrandSectionMark({
  className,
  title = "Majesté",
  label,
}: {
  className?: string;
  /** Texto visível no wordmark dourado */
  title?: string;
  /** Acessibilidade (se diferente do title) */
  label?: string;
}) {
  return (
    <div className={cn("flex justify-center", className)}>
      <h2 className="sr-only">{label || title}</h2>
      <span
        className="leading-none text-center select-none"
        style={{
          fontFamily: "var(--font-display), Georgia, 'Times New Roman', serif",
          fontSize: "2.75rem",
          fontWeight: 500,
          letterSpacing: "0.02em",
          color: "#c2a45b",
          background:
            "linear-gradient(180deg, #e8d090 0%, #c9a24a 45%, #8f6f2c 100%)",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
        aria-hidden
      >
        {title}
      </span>
    </div>
  );
}
