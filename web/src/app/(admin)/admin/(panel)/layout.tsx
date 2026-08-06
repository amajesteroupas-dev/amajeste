import { adminAuth, adminSignOut } from "@/lib/admin-auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await adminAuth();

  if (!session?.user) {
    redirect("/admin/login");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "STAFF") {
    redirect("/");
  }

  async function signOutAction() {
    "use server";
    await adminSignOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="admin-shell min-h-screen">
      <AdminSidebar
        userEmail={session.user.email}
        signOutAction={signOutAction}
      />
      <div className="p-6 md:p-8 overflow-auto bg-[#f4f1ec] text-[#1a1a1a]">
        {children}
      </div>
    </div>
  );
}
