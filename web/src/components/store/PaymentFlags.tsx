import type { ReactNode } from "react";

/** Bandeiras de pagamento (SVG inline, sem assets externos) */

type FlagProps = {
  className?: string;
  title?: string;
  size?: "sm" | "md";
};

function FlagShell({
  className,
  title,
  children,
  bg = "#fff",
  size = "md",
}: FlagProps & { children: ReactNode; bg?: string }) {
  // sm: cards/listagens (compacto, SVG nítido); md: páginas maiores
  const dims = size === "sm" ? "h-3.5 w-[1.55rem]" : "h-7 w-11";
  return (
    <span
      title={title}
      aria-label={title}
      className={`inline-flex ${dims} items-center justify-center overflow-hidden rounded-[2px] border border-black/10 shadow-[0_1px_0_rgba(0,0,0,0.04)] ${className || ""}`}
      style={{ background: bg }}
    >
      {children}
    </span>
  );
}

export function VisaFlag({ className, size = "md" }: FlagProps) {
  return (
    <FlagShell className={className} title="Visa" bg="#1A1F71" size={size}>
      <svg
        viewBox="0 0 48 16"
        className={size === "sm" ? "h-2 w-[1.35rem]" : "h-3 w-8"}
        aria-hidden
      >
        <text
          x="24"
          y="12.5"
          textAnchor="middle"
          fill="#fff"
          fontSize="11"
          fontStyle="italic"
          fontWeight="700"
          fontFamily="Arial, Helvetica, sans-serif"
          letterSpacing="-0.5"
        >
          VISA
        </text>
      </svg>
    </FlagShell>
  );
}

export function MastercardFlag({ className, size = "md" }: FlagProps) {
  return (
    <FlagShell className={className} title="Mastercard" bg="#fff" size={size}>
      <span
        className={`relative flex items-center justify-center ${
          size === "sm" ? "h-2.5 w-4" : "h-4 w-6"
        }`}
      >
        <span
          className={`absolute left-0 rounded-full bg-[#EB001B] ${
            size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"
          }`}
        />
        <span
          className={`absolute right-0 rounded-full bg-[#F79E1B] opacity-95 ${
            size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"
          }`}
        />
      </span>
    </FlagShell>
  );
}

export function EloFlag({ className, size = "md" }: FlagProps) {
  const dims = size === "sm" ? "h-3.5 w-[2.1rem]" : "h-7 w-[3.35rem]";
  return (
    <span
      title="Elo"
      aria-label="Elo"
      className={`inline-flex ${dims} items-center justify-center gap-0.5 overflow-hidden rounded-[2px] border border-black/15 bg-black px-0.5 shadow-[0_1px_0_rgba(0,0,0,0.04)] ${className || ""}`}
    >
      <svg
        viewBox="0 0 18 10"
        className={size === "sm" ? "h-2 w-3" : "h-3 w-4"}
        aria-hidden
      >
        <path
          d="M1.5 5a3.5 3.5 0 0 1 3.5-3.5"
          fill="none"
          stroke="#FFCB05"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M5.2 8.2A3.5 3.5 0 0 1 1.8 5.2"
          fill="none"
          stroke="#00A4E0"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M8.5 5a3.5 3.5 0 0 1-3.3 3.5"
          fill="none"
          stroke="#EF4123"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      <span
        className={`font-bold lowercase tracking-wide text-white ${
          size === "sm" ? "text-[7px] leading-none" : "text-[11px] leading-none"
        }`}
        style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
      >
        elo
      </span>
    </span>
  );
}

export function AmexFlag({ className, size = "md" }: FlagProps) {
  return (
    <FlagShell
      className={className}
      title="American Express"
      bg="#2E77BC"
      size={size}
    >
      <span
        className={`font-bold uppercase tracking-tighter text-white ${
          size === "sm" ? "text-[5px]" : "text-[7px]"
        }`}
      >
        AMEX
      </span>
    </FlagShell>
  );
}

export function HipercardFlag({ className, size = "md" }: FlagProps) {
  return (
    <FlagShell className={className} title="Hipercard" bg="#822124" size={size}>
      <span
        className={`font-bold uppercase text-white ${
          size === "sm" ? "text-[5px]" : "text-[7px]"
        }`}
      >
        Hiper
      </span>
    </FlagShell>
  );
}

export function PixFlag({ className, size = "md" }: FlagProps) {
  return (
    <FlagShell className={className} title="Pix" bg="#fff" size={size}>
      <svg
        viewBox="0 0 16 16"
        className={size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5"}
        aria-hidden
      >
        <path
          fill="#32BCAD"
          d="M11.9 3.1 8.7.2a1 1 0 0 0-1.4 0L4.1 3.1l2.5 2.5a1.4 1.4 0 0 1 2.8 0l2.5-2.5ZM3.1 4.1.2 7.3a1 1 0 0 0 0 1.4l2.9 3.2 2.5-2.5a1.4 1.4 0 0 1 0-2.8L3.1 4.1Zm9.8 0-2.5 2.5a1.4 1.4 0 0 1 0 2.8l2.5 2.5 2.9-3.2a1 1 0 0 0 0-1.4l-2.9-3.2ZM4.1 12.9l3.2 2.9a1 1 0 0 0 1.4 0l3.2-2.9-2.5-2.5a1.4 1.4 0 0 1-2.8 0l-2.5 2.5Z"
        />
      </svg>
    </FlagShell>
  );
}

export function PaymentFlagsRow({
  className,
  showPix = true,
  size = "md",
  /** Principais: Visa, Mastercard, Elo (+ Pix). Completo inclui Amex e Hipercard. */
  variant = "full",
}: {
  className?: string;
  showPix?: boolean;
  size?: "sm" | "md";
  variant?: "main" | "full";
}) {
  return (
    <div
      className={`flex flex-wrap items-center ${
        size === "sm" ? "gap-1" : "gap-1.5"
      } ${className || ""}`}
      role="list"
      aria-label="Formas de pagamento"
    >
      <span role="listitem">
        <VisaFlag size={size} />
      </span>
      <span role="listitem">
        <MastercardFlag size={size} />
      </span>
      <span role="listitem">
        <EloFlag size={size} />
      </span>
      {variant === "full" && (
        <>
          <span role="listitem">
            <AmexFlag size={size} />
          </span>
          <span role="listitem">
            <HipercardFlag size={size} />
          </span>
        </>
      )}
      {showPix && (
        <span role="listitem">
          <PixFlag size={size} />
        </span>
      )}
    </div>
  );
}
