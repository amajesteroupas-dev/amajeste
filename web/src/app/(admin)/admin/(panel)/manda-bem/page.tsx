import { MandaBemAdmin } from "@/components/admin/MandaBemAdmin";

export const dynamic = "force-dynamic";

export default function MandaBemAdminPage() {
  return (
    <div>
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Frete · Manda Bem
      </h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Integração com{" "}
        <a
          href="https://mandabem.com.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline text-rose-dark"
        >
          mandabem.com.br
        </a>
        : cotação PAC/SEDEX via Web Service. Ative para aparecer no checkout
        junto com Melhor Envio e entrega local.
      </p>
      <MandaBemAdmin />
    </div>
  );
}
