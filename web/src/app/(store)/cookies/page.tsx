import Link from "next/link";

export const metadata = {
  title: "Política de Cookies",
  description: "Como a Majesté utiliza cookies na loja online.",
};

export default function CookiesPage() {
  return (
    <div className="bg-[#f7f3ee]">
      <div className="container-maj py-12 md:py-16 max-w-3xl">
        <p className="text-xs uppercase tracking-[0.2em] text-[#8a7468] mb-3">
          LGPD
        </p>
        <h1
          className="text-4xl md:text-5xl text-[#2a2420]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Política de Cookies
        </h1>
        <p className="mt-4 text-[#5c534c] leading-relaxed">
          Usamos cookies e tecnologias semelhantes para o funcionamento seguro
          da loja.
        </p>

        <div className="mt-10 space-y-6 text-sm text-[#3a322c] leading-relaxed">
          <p>
            <strong>Essenciais:</strong> carrinho, login/sessão, preferências
            básicas e prevenção de abuso. Sem eles a loja não funciona
            corretamente.
          </p>
          <p>
            <strong>Parceiros de pagamento:</strong> o Mercado Pago e similares
            podem definir cookies próprios no checkout para autenticar a
            transação.
          </p>
          <p>
            Você pode bloquear cookies no navegador, mas isso pode impedir
            compra e login. Mais detalhes em nossa{" "}
            <Link href="/privacidade" className="underline text-[#95752c]">
              Política de Privacidade
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
