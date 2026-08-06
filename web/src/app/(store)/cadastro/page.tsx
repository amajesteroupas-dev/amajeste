import { Suspense } from "react";
import { CustomerRegisterForm } from "@/components/store/CustomerRegisterForm";

export const metadata = { title: "Cadastro" };

export default function RegisterPage() {
  return (
    <div className="bg-[#f7f3ee] min-h-[70vh]">
      <div className="container-maj py-14 max-w-lg">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          Minha conta
        </p>
        <h1
          className="text-4xl text-[#2a2420] mb-2"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Cadastro
        </h1>
        <p className="text-[#5c534c] mb-8 text-sm">
          Crie sua conta para acompanhar pedidos e entrar no programa Influence
          Majesté.
        </p>
        <div className="bg-white border border-black/8 p-6">
          <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
            <CustomerRegisterForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
