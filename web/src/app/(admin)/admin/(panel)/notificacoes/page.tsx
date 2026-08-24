import { OrderNotifyAdmin } from "@/components/admin/OrderNotifyAdmin";

export const dynamic = "force-dynamic";

export default function AdminNotificacoesPage() {
  return (
    <div>
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Notificações de pedido
      </h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Quando a cliente finalizar um pedido no site, a loja envia um
        agradecimento por e-mail (Gmail SMTP) e por WhatsApp (pelo número da
        loja, via Z-API ou Evolution).
      </p>
      <OrderNotifyAdmin />
    </div>
  );
}
