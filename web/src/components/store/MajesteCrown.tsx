/**
 * Coroa oficial Majesté — diamante central, asas em V e base em X.
 * Usada no BrandLogo, favicon e molduras.
 */
export function MajesteCrown({
  size = 24,
  gradId = "maj-crown",
  className,
}: {
  size?: number;
  gradId?: string;
  className?: string;
}) {
  const g = `${gradId}-g`;
  const gs = `${gradId}-gs`;
  return (
    <svg
      width={size}
      height={size * 0.72}
      viewBox="0 0 100 72"
      fill="none"
      aria-hidden
      className={className}
    >
      <defs>
        <linearGradient
          id={g}
          x1="8"
          y1="4"
          x2="92"
          y2="68"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f7ecc0" />
          <stop offset="28%" stopColor="#e8d090" />
          <stop offset="55%" stopColor="#d4af5a" />
          <stop offset="78%" stopColor="#b8923f" />
          <stop offset="100%" stopColor="#8a6a28" />
        </linearGradient>
        <linearGradient
          id={gs}
          x1="50"
          y1="0"
          x2="50"
          y2="72"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#fff4cc" />
          <stop offset="100%" stopColor="#c9a24a" />
        </linearGradient>
      </defs>

      {/* Base */}
      <path
        d="M14 58 H86"
        stroke={`url(#${g})`}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M22 63 H78"
        stroke={`url(#${g})`}
        strokeWidth="1.35"
        strokeLinecap="round"
        opacity="0.85"
      />

      {/* Asa esquerda (V aberto) */}
      <path
        d="M22 56 L30 18 L42 40"
        stroke={`url(#${g})`}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Asa direita */}
      <path
        d="M78 56 L70 18 L58 40"
        stroke={`url(#${g})`}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* Diamante central */}
      <path
        d="M50 10 L62 34 L50 54 L38 34 Z"
        stroke={`url(#${gs})`}
        strokeWidth="2"
        strokeLinejoin="round"
        fill="none"
      />

      {/* X sob o diamante (liga asas ao centro) */}
      <path
        d="M30 18 L50 54 L70 18"
        stroke={`url(#${g})`}
        strokeWidth="1.55"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.92"
      />

      {/* Orbes nos três pontos */}
      <circle cx="30" cy="16.5" r="3.4" fill={`url(#${gs})`} />
      <circle cx="50" cy="8.5" r="3.8" fill={`url(#${gs})`} />
      <circle cx="70" cy="16.5" r="3.4" fill={`url(#${gs})`} />
    </svg>
  );
}
