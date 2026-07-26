import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-ink text-white">
      <div className="container-maj grid gap-10 py-14 md:grid-cols-3">
        <div>
          <p
            className="text-3xl tracking-[0.08em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            ♛ Majesté
          </p>
          <p className="mt-3 max-w-xs text-sm text-white/65 leading-relaxed">
            Modelagens que unem conforto, desempenho e feminilidade em cada
            movimento.
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gold mb-4">
            Navegação
          </p>
          <ul className="space-y-2 text-sm text-white/75">
            <li>
              <Link href="/categoria/conjunto-legging">Conjunto Legging</Link>
            </li>
            <li>
              <Link href="/categoria/macacao">Macacão</Link>
            </li>
            <li>
              <Link href="/contato">Contato</Link>
            </li>
            <li>
              <Link href="/politicas-de-troca">Políticas de Troca</Link>
            </li>
          </ul>
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.16em] text-gold mb-4">
            Newsletter
          </p>
          <p className="text-sm text-white/65 mb-3">
            Receba lançamentos e ofertas exclusivas.
          </p>
          <form className="flex gap-2">
            <input
              type="email"
              placeholder="Seu e-mail"
              className="flex-1 bg-white/10 px-3 py-2 text-sm outline-none placeholder:text-white/40"
            />
            <button type="submit" className="btn btn-gold !py-2 !px-4">
              OK
            </button>
          </form>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/45">
        Copyright © {new Date().getFullYear()} amajeste.com.br
      </div>
    </footer>
  );
}
