import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Favicon gerado no build — coroa Majesté (não depende de cache de .ico antigo). */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#1a1612",
          borderRadius: 7,
          border: "1px solid #c9a24a",
        }}
      >
        <svg
          width="22"
          height="18"
          viewBox="0 0 48 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M4 34 L9 12 L18 24 L24 4 L30 24 L39 12 L44 34 Z"
            fill="#d4af5a"
          />
          <path d="M18 24 L24 12 L30 24 L24 30 Z" fill="#f0dfa8" />
          <rect x="5" y="33" width="38" height="4" rx="1" fill="#c9a24a" />
          <circle cx="9" cy="11" r="2.4" fill="#f7ecc0" />
          <circle cx="24" cy="3.5" r="2.7" fill="#f7ecc0" />
          <circle cx="39" cy="11" r="2.4" fill="#f7ecc0" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
