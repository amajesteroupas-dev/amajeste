import { AdminPlanner } from "@/components/admin/AdminPlanner";

export const dynamic = "force-dynamic";

export default function PlanejamentoPage() {
  return (
    <div>
      <h1 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)" }}>
        Meu dia
      </h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Organize o dia com horário, área e prioridade — planeje amanhã, marque o
        que concluiu e acompanhe pedidos, estoque, frete e Instagram.
      </p>
      <AdminPlanner />
    </div>
  );
}
