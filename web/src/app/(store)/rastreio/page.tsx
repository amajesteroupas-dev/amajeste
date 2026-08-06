import { Suspense } from "react";
import { TrackingLookup } from "@/components/store/TrackingLookup";

export const dynamic = "force-dynamic";
export const metadata = { title: "Rastrear pedido" };

type Props = {
  searchParams: Promise<{ codigo?: string; pedido?: string }>;
};

export default async function RastreioPage({ searchParams }: Props) {
  const sp = await searchParams;

  return (
    <div className="container-maj py-12 md:py-16 max-w-xl">
      <h1
        className="text-3xl md:text-4xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Rastrear pedido
      </h1>
      <p className="text-sm text-muted mb-8">
        Informe o número do pedido ou o código dos Correios para acompanhar a
        entrega.
      </p>
      <Suspense fallback={null}>
        <TrackingLookup
          initialCodigo={sp.codigo || ""}
          initialPedido={sp.pedido || ""}
        />
      </Suspense>
    </div>
  );
}
