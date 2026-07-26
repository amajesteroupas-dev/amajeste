import { Suspense } from "react";
import AdminLoginForm from "@/components/admin/AdminLoginForm";

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#efe8df]">
          Carregando...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
