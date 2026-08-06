import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

/** Ícone Apple / atalho — logo marca (coroa + Majesté + FITNESS). */
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(160deg, #2a2420 0%, #1a1612 100%)",
          borderRadius: 36,
          border: "3px solid #c9a24a",
          gap: 6,
        }}
      >
        <svg
          width="72"
          height="50"
          viewBox="0 0 80 56"
          fill="none"
        >
          <path
            d="M10 46.5 H70"
            stroke="#d4af5a"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M14 44 L22 18 L28 30 L40 8 L52 30 L58 18 L66 44"
            stroke="#e8d090"
            strokeWidth="2.2"
            strokeLinejoin="round"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M28 30 L40 18 L52 30 L40 38 Z"
            stroke="#f0dfa8"
            strokeWidth="1.6"
            fill="none"
          />
          <circle cx="22" cy="16.5" r="3" fill="#f7ecc0" />
          <circle cx="40" cy="6.5" r="3.3" fill="#f7ecc0" />
          <circle cx="58" cy="16.5" r="3" fill="#f7ecc0" />
        </svg>
        <div
          style={{
            display: "flex",
            fontSize: 28,
            fontFamily: "Georgia, serif",
            color: "#d4af5a",
            letterSpacing: 1,
            fontWeight: 500,
          }}
        >
          Majesté
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 10,
            fontFamily: "system-ui, sans-serif",
            color: "#a8842f",
            letterSpacing: 4,
            fontWeight: 600,
            marginLeft: 24,
          }}
        >
          FITNESS
        </div>
      </div>
    ),
    { ...size }
  );
}
