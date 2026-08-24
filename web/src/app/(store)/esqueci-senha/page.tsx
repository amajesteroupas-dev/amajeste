import { Suspense } from "react";
import { ForgotPasswordForm } from "@/components/store/ForgotPasswordForm";

export const metadata = { title: "Esqueci a senha" };

export default function ForgotPasswordPage() {
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
          Esqueci a senha
        </h1>
        <p className="text-[#5c534c] mb-8 text-sm leading-relaxed">
          Digite o e-mail da sua conta. Se estiver cadastrado, enviamos um link
          para criar uma senha nova.
        </p>
        <div className="bg-white border border-black/8 p-6">
          <Suspense fallback={<p className="text-sm text-muted">Carregando…</p>}>
            <ForgotPasswordForm />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
