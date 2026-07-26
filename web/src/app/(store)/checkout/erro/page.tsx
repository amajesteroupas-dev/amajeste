import Link from "next/link";

export default function CheckoutErrorPage() {
  return (
    <div className="container-maj py-20 text-center">
      <h1 className="text-4xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
        Pagamento não concluído
      </h1>
      <p className="text-muted mb-6">Tente novamente ou escolha Pix.</p>
      <Link href="/checkout" className="btn btn-primary">
        Voltar ao checkout
      </Link>
    </div>
  );
}
