import { Suspense } from "react";
import { CustomerLoginForm } from "@/components/store/CustomerLoginForm";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <div className="bg-[#f7f3ee] min-h-[70vh]">
      <div className="container-maj py-14 max-w-md">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          Minha conta
        </p>
        <h1
          className="text-4xl text-[#2a2420] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Entrar
        </h1>
        <p className="text-[#5c534c] mb-8 text-sm">
          Acesse pedidos, perfil e o programa Influence Majesté.
        </p>
        <div className="bg-white border border-black/8 p-6">
          <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
            <CustomerLoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
