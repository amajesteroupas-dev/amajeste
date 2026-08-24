import type { Metadata } from "next";
import {
  Bebas_Neue,
  Cormorant_Garamond,
  Great_Vibes,
  Lora,
  Manrope,
  Montserrat,
  Oswald,
  Playfair_Display,
} from "next/font/google";
import { AuthProvider } from "@/components/AuthProvider";
import "./globals.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-display",
});

const body = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-montserrat",
});

const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-bebas",
});

const script = Great_Vibes({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-script",
});

const lora = Lora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-lora",
});

const oswald = Oswald({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
});

export const metadata: Metadata = {
  title: {
    default: "Majesté — Vista sua força",
    template: "%s | Majesté",
  },
  description:
    "Moda fitness feminina com modelagens que unem conforto, desempenho e feminilidade.",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
  ),
  applicationName: "Majesté",
  appleWebApp: {
    capable: true,
    title: "Majesté",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png?v=8", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png?v=8", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico?v=8", sizes: "any" },
      { url: "/icon-192.png?v=8", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png?v=8", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon-32x32.png?v=8",
    apple: [
      { url: "/apple-touch-icon.png?v=8", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest?v=8",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/favicon-32x32.png?v=8" type="image/png" sizes="32x32" />
        <link rel="icon" href="/favicon-16x16.png?v=8" type="image/png" sizes="16x16" />
        <link rel="shortcut icon" href="/favicon-32x32.png?v=8" />
        {/*
          Não fixar manifest / apple-touch-icon aqui: o painel (/admin) precisa
          do próprio manifest e ícone, senão o iPhone instala a loja em vez do admin.
          Loja e admin vêm de metadata (layout raiz vs layout admin).
        */}
        <meta name="color-scheme" content="light" />
        <meta name="supported-color-schemes" content="light" />
      </head>
      <body
        className={`${display.variable} ${body.variable} ${playfair.variable} ${montserrat.variable} ${bebas.variable} ${script.variable} ${lora.variable} ${oswald.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
