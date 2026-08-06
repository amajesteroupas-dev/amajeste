import { PaymentsAdmin } from "@/components/admin/PaymentsAdmin";

export const dynamic = "force-dynamic";

export default function PagamentosAdminPage() {
  return (
    <div>
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Pagamentos
      </h1>
      <p className="text-sm text-muted mb-6 max-w-xl">
        Ative ou desative Mercado Pago, PagSeguro e Infinity Pay para comparar
        taxas e juros no checkout. Só as opções ativas (com credencial) aparecem
        na loja.
      </p>
      <PaymentsAdmin />
    </div>
  );
}
