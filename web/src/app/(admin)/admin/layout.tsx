import type { Metadata } from "next";
import {
  AdminPwaBootstrap,
  AdminPwaInstallBanner,
} from "@/components/admin/AdminPwaInstall";

export const metadata: Metadata = {
  title: {
    default: "Painel Majesté",
    template: "%s | Painel Majesté",
  },
  applicationName: "Painel Majesté",
  // Manifest e ícones próprios — no iPhone, o Safari usa isto ao “Adicionar à Tela de Início”
  manifest: "/admin.webmanifest?v=2",
  appleWebApp: {
    capable: true,
    title: "Painel Majesté",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/admin-icon-192.png?v=2", sizes: "192x192", type: "image/png" },
      { url: "/admin-icon-512.png?v=2", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      {
        url: "/admin-apple-touch-icon.png?v=2",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    shortcut: "/admin-apple-touch-icon.png?v=2",
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminPwaBootstrap>
      <div className="min-h-screen bg-[#f3efe9] text-[#121212]">
        <AdminPwaInstallBanner />
        {children}
      </div>
    </AdminPwaBootstrap>
  );
}
