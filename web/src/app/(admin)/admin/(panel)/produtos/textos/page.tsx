import { PaymentCopyAdmin } from "@/components/admin/PaymentCopyAdmin";

export const dynamic = "force-dynamic";

export default function ProdutosTextosPage() {
  return (
    <div>
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Textos de pagamento
      </h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Altere as frases de Pix e parcelamento de todos os produtos de uma vez.
        O manual à direita explica cada campo.
      </p>
      <PaymentCopyAdmin />
    </div>
  );
}
