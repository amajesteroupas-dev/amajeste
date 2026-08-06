import { cn } from "@/lib/utils";

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

/** Coroa geométrica Majesté — traço fino dourado */
function CrownMark({ size, gradId }: { size: number; gradId: string }) {
  const g = `${gradId}-g`;
  const gs = `${gradId}-gs`;
  return (
    <svg
      width={size}
      height={size * 0.78}
      viewBox="0 0 80 56"
      fill="none"
      aria-hidden
      className="block drop-shadow-[0_1px_0_rgba(168,132,47,0.25)]"
    >
      <defs>
        <linearGradient
          id={g}
          x1="0"
          y1="0"
          x2="80"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f3e4b0" />
          <stop offset="32%" stopColor="#d8b45e" />
          <stop offset="68%" stopColor="#b8923f" />
          <stop offset="100%" stopColor="#7d5f22" />
        </linearGradient>
        <linearGradient
          id={gs}
          x1="40"
          y1="0"
          x2="40"
          y2="56"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f7ecc0" />
          <stop offset="100%" stopColor="#a8842f" />
        </linearGradient>
      </defs>

      <path
        d="M10 46.5 H70"
        stroke={`url(#${g})`}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
      <path
        d="M16 50.5 H64"
        stroke={`url(#${g})`}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.8"
      />
      <path
        d="M14 44 L22 18 L28 30 L40 8 L52 30 L58 18 L66 44"
        stroke={`url(#${g})`}
        strokeWidth="1.65"
        strokeLinejoin="round"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M28 30 L40 18 L52 30 L40 38 Z"
        stroke={`url(#${gs})`}
        strokeWidth="1.25"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="22" cy="16.5" r="2.4" fill={`url(#${gs})`} />
      <circle cx="40" cy="6.5" r="2.7" fill={`url(#${gs})`} />
      <circle cx="58" cy="16.5" r="2.4" fill={`url(#${gs})`} />
    </svg>
  );
}

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
        <CrownMark size={s.crown} gradId={gradId} />
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
