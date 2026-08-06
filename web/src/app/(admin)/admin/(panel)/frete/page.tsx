import { MelhorEnvioAdmin } from "@/components/admin/MelhorEnvioAdmin";

export const dynamic = "force-dynamic";

export default function FreteAdminPage() {
  return (
    <div>
      <h1
        className="text-3xl mb-2"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Frete · Melhor Envio
      </h1>
      <p className="text-sm text-muted mb-6 max-w-2xl">
        Conta Melhor Envio, pedidos e etiquetas — no checkout só aparecem Correios
        PAC, SEDEX e entrega local em Planaltina/Sobradinho (combine pelo
        WhatsApp). Preencha o remetente da loja para gerar etiquetas. Para fretes
        via{" "}
        <a href="/admin/manda-bem" className="underline text-rose-dark">
          Manda Bem
        </a>
        , use a página dedicada.
      </p>
      <MelhorEnvioAdmin />
    </div>
  );
}
