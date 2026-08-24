import { Suspense } from "react";
import { ResetPasswordForm } from "@/components/store/ResetPasswordForm";

export const metadata = { title: "Redefinir senha" };

export default function ResetPasswordPage() {
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
          Nova senha
        </h1>
        <p className="text-[#5c534c] mb-8 text-sm leading-relaxed">
          Escolha uma senha nova (mínimo 6 caracteres) para voltar a entrar na
          Majesté.
        </p>
        <div className="bg-white border border-black/8 p-6">
          <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
