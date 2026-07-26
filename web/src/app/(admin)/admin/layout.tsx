import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/produtos", label: "Produtos" },
  { href: "/admin/estoque", label: "Estoque" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/clientes", label: "Clientes / CRM" },
  { href: "/admin/reclamacoes", label: "Reclamações" },
  { href: "/admin/financeiro", label: "Financeiro" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Login page uses its own layout path check via segment — still wrap
  return (
    <div className="min-h-screen bg-[#f3efe9] text-ink">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}

async function AdminShell({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Allow login page without sidebar when unauthenticated
  if (!session?.user) {
    return <>{children}</>;
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
    redirect("/");
  }

  return (
    <div className="admin-shell">
      <aside className="bg-ink text-white p-5">
        <Link href="/admin" className="block mb-8">
          <span className="text-gold">♛</span>{" "}
          <span style={{ fontFamily: "var(--font-display)" }} className="text-xl">
            Majesté Admin
          </span>
        </Link>
        <nav className="flex flex-col gap-1 text-sm">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="px-3 py-2 text-white/75 hover:bg-white/10 hover:text-white transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/"
            className="px-3 py-2 mt-4 text-gold hover:text-white transition-colors"
          >
            Ver loja
          </Link>
        </nav>
        <form
          className="mt-8"
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/admin/login" });
          }}
        >
          <button type="submit" className="text-xs text-white/50 hover:text-white">
            Sair ({session.user.email})
          </button>
        </form>
      </aside>
      <div className="p-6 md:p-8 overflow-auto">{children}</div>
    </div>
  );
}
