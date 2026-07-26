export default function ExchangePolicyPage() {
  return (
    <div className="container-maj py-14 max-w-3xl prose-like">
      <h1 className="text-4xl mb-8" style={{ fontFamily: "var(--font-display)" }}>
        Políticas de Troca Majesté
      </h1>
      <section className="space-y-4 text-sm leading-relaxed text-foreground/85">
        <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          1. Trocas
        </h2>
        <p>
          <strong>Prazo:</strong> até 7 dias corridos após o recebimento.
        </p>
        <p>
          <strong>Estado da peça:</strong> sem uso, com etiqueta e na embalagem
          original. Não pode ter marca de desodorante, suor, perfume ou maquiagem.
        </p>
        <p>
          <strong>Como funciona:</strong> 1 troca por pedido. Você paga o frete da
          troca, exceto se for erro nosso de envio/tamanho.
        </p>
        <p className="font-medium">Motivos que aceitamos:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tamanho não serviu</li>
          <li>Defeito de fabricação</li>
          <li>Cor/modelo diferente do enviado por erro nosso</li>
        </ul>
        <p className="font-medium">Motivos que NÃO aceitamos:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Peça usada, lavada ou com cheiro</li>
          <li>Arrependimento após 7 dias</li>
          <li>Peça de coleção promocional/Liquida</li>
        </ul>
        <h2 className="text-xl font-semibold pt-4" style={{ fontFamily: "var(--font-display)" }}>
          2. Diferença de valor
        </h2>
        <p>
          Se trocar por peça mais cara: paga a diferença via Pix. Se trocar por
          peça mais barata: o valor fica como crédito na loja em até 12 meses.
        </p>
      </section>
    </div>
  );
}
