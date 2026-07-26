import Link from "next/link";

export default function CheckoutPendingPage() {
  return (
    <div className="container-maj py-20 text-center">
      <h1 className="text-4xl mb-4" style={{ fontFamily: "var(--font-display)" }}>
        Pagamento pendente
      </h1>
      <p className="text-muted mb-6">
        Assim que confirmarmos, você recebe a atualização por e-mail.
      </p>
      <Link href="/" className="btn btn-primary">
        Ir para a loja
      </Link>
    </div>
  );
}
