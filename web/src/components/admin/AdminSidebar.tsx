"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronDown,
  FolderOpen,
  Image as ImageIcon,
  LayoutDashboard,
  Mail,
  Megaphone,
  MessageSquareHeart,
  Package,
  Scissors,
  ShoppingBag,
  ShoppingCart,
  Star,
  Store,
  TicketPercent,
  Trash2,
  Truck,
  Users,
  Video,
  Wallet,
  Clapperboard,
  Boxes,
  CreditCard,
  Camera,
  ScrollText,
  Rocket,
  TrendingUp,
} from "lucide-react";
import { AdminPwaInstallButton } from "@/components/admin/AdminPwaInstall";

type IconType = ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;

type NavItem = {
  href: string;
  label: string;
  icon: IconType;
};

type NavGroup = {
  id: string;
  label: string;
  icon: IconType;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    id: "marketing",
    label: "Marketing",
    icon: Megaphone,
    items: [
      { href: "/admin/banners", label: "Banners", icon: ImageIcon },
      { href: "/admin/midias", label: "Banco de imagens", icon: ImageIcon },
      { href: "/admin/banco-videos", label: "Banco de vídeos", icon: Video },
      {
        href: "/admin/banco-videos-recortados",
        label: "Banco de vídeos recortados",
        icon: Scissors,
      },
      { href: "/admin/stories", label: "Stories do dia", icon: Clapperboard },
      { href: "/admin/instagram", label: "Instagram", icon: Camera },
      { href: "/admin/email-marketing", label: "E-mail marketing", icon: Mail },
      { href: "/admin/trafego", label: "Vender mais", icon: TrendingUp },
    ],
  },
  {
    id: "catalogo",
    label: "Catálogo de Produtos",
    icon: Package,
    items: [
      { href: "/admin/produtos", label: "Produtos", icon: Package },
      {
        href: "/admin/produtos/textos",
        label: "Textos de pagamento",
        icon: Megaphone,
      },
      { href: "/admin/categorias", label: "Categorias", icon: FolderOpen },
      { href: "/admin/videos", label: "Vídeos por categoria", icon: Video },
      { href: "/admin/estoque", label: "Estoque", icon: Boxes },
      { href: "/admin/avisos", label: "Avisos de estoque", icon: AlertTriangle },
      { href: "/admin/produtos/lixeira", label: "Lixeira", icon: Trash2 },
    ],
  },
  {
    id: "vendas",
    label: "Vendas e Financeiro",
    icon: ShoppingCart,
    items: [
      { href: "/admin/pedidos", label: "Pedidos", icon: ShoppingBag },
      { href: "/admin/pagamentos", label: "Pagamentos", icon: CreditCard },
      { href: "/admin/financeiro", label: "Financeiro", icon: Wallet },
    ],
  },
  {
    id: "logistica",
    label: "Logística",
    icon: Truck,
    items: [
      { href: "/admin/frete", label: "Frete / Melhor Envio", icon: Truck },
      { href: "/admin/manda-bem", label: "Frete / Manda Bem", icon: Truck },
    ],
  },
  {
    id: "clientes",
    label: "Clientes",
    icon: Users,
    items: [
      { href: "/admin/clientes", label: "Clientes / CRM", icon: Users },
      {
        href: "/admin/reclamacoes",
        label: "Reclamações / Elogios",
        icon: MessageSquareHeart,
      },
      { href: "/admin/avaliacoes", label: "Avaliações", icon: Star },
    ],
  },
  {
    id: "promocoes",
    label: "Promoções",
    icon: TicketPercent,
    items: [
      { href: "/admin/promocoes", label: "Promoção do site", icon: Megaphone },
      { href: "/admin/looks", label: "Looks & cupons", icon: TicketPercent },
    ],
  },
  {
    id: "agenda",
    label: "Agenda",
    icon: CalendarDays,
    items: [{ href: "/admin/planejamento", label: "Meu dia", icon: CalendarDays }],
  },
  {
    id: "sistema",
    label: "Sistema",
    icon: ScrollText,
    items: [
      { href: "/admin/lancamento", label: "Controle de lançamento", icon: Rocket },
      { href: "/admin/logs", label: "Log do sistema", icon: ScrollText },
    ],
  },
];

function isItemActive(pathname: string, href: string) {
  if (href === "/admin") return pathname === "/admin";
  if (href === "/admin/produtos") {
    return (
      pathname === "/admin/produtos" ||
      (pathname.startsWith("/admin/produtos/") &&
        !pathname.startsWith("/admin/produtos/lixeira") &&
        !pathname.startsWith("/admin/produtos/textos"))
    );
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupHasActive(pathname: string, group: NavGroup) {
  return group.items.some((item) => isItemActive(pathname, item.href));
}

type Props = {
  userEmail?: string | null;
  signOutAction: () => Promise<void>;
};

export function AdminSidebar({ userEmail, signOutAction }: Props) {
  const pathname = usePathname() || "/admin";
  const activeGroupId = useMemo(() => {
    const hit = NAV_GROUPS.find((g) => groupHasActive(pathname, g));
    return hit?.id || "dashboard";
  }, [pathname]);

  const [openIds, setOpenIds] = useState<string[]>([activeGroupId]);

  useEffect(() => {
    setOpenIds((prev) =>
      prev.includes(activeGroupId) ? prev : [...prev, activeGroupId]
    );
  }, [activeGroupId]);

  function toggle(id: string) {
    setOpenIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  return (
    <aside className="admin-sidebar">
      <Link href="/admin" className="admin-sidebar-brand">
        <span className="admin-sidebar-crown" aria-hidden>
          ♛
        </span>
        <span
          style={{ fontFamily: "var(--font-display)" }}
          className="admin-sidebar-brand-text"
        >
          Majesté Admin
        </span>
      </Link>

      <nav className="admin-sidebar-nav" aria-label="Menu administrativo">
        {NAV_GROUPS.map((group) => {
          const open = openIds.includes(group.id);
          const GroupIcon = group.icon;
          const groupActive = groupHasActive(pathname, group);

          return (
            <div
              key={group.id}
              className={`admin-nav-group${groupActive ? " is-active-group" : ""}${
                open ? " is-open" : ""
              }`}
            >
              <button
                type="button"
                className="admin-nav-group-btn"
                aria-expanded={open}
                onClick={() => toggle(group.id)}
              >
                <span className="admin-nav-group-left">
                  <GroupIcon size={18} strokeWidth={1.75} className="admin-nav-icon" />
                  <span className="admin-nav-group-label">{group.label}</span>
                </span>
                <ChevronDown
                  size={16}
                  strokeWidth={2}
                  className={`admin-nav-chevron${open ? " is-open" : ""}`}
                />
              </button>

              <div
                className={`admin-nav-panel${open ? " is-open" : ""}`}
                aria-hidden={!open}
              >
                <div className="admin-nav-panel-inner">
                  {group.items.map((item) => {
                    const ItemIcon = item.icon;
                    const active = isItemActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`admin-nav-item${active ? " is-active" : ""}`}
                        aria-current={active ? "page" : undefined}
                      >
                        <ItemIcon
                          size={15}
                          strokeWidth={1.75}
                          className="admin-nav-item-icon"
                        />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <AdminPwaInstallButton />
        <Link href="/" className="admin-nav-store">
          <Store size={16} strokeWidth={1.75} />
          <span>Ver loja</span>
        </Link>
        <form action={signOutAction}>
          <button type="submit" className="admin-nav-logout">
            Sair{userEmail ? ` (${userEmail})` : ""}
          </button>
        </form>
      </div>
    </aside>
  );
}
