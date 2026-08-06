import Link from "next/link";
import { formatBRL } from "@/lib/utils";
import {
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusLabel,
} from "@/lib/order-labels";
import { PixCopyPaste } from "@/components/store/PixCopyPaste";
import { checkoutSuccessPath } from "@/lib/order-access";

export type OrderReceiptData = {
  orderNumber: string;
  total: number | string;
  status: string;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  pixCode?: string | null;
  pixQrDataUrl?: string | null;
  boletoBarcode?: string | null;
  boletoUrl?: string | null;
  localDeliveryWhatsapp?: string | null;
  items?: {
    productName: string;
    size: string;
    color: string;
    quantity: number;
    total: number | string;
  }[];
};

/** Frases fitness / autoestima — uma por pedido, estável pelo nº. */
const FITNESS_NOTES = [
  {
    line: "Seu corpo não precisa caber em moldes.",
    sub: "Ele é o molde — e você decide o ritmo.",
  },
  {
    line: "Força também é delicadeza.",
    sub: "E você carrega as duas com presença.",
  },
  {
    line: "Cada movimento é um encontro consigo.",
    sub: "Treinar é lembrar do quanto você já evoluiu.",
  },
  {
    line: "Você não precisa provar nada a ninguém.",
    sub: "Só se mover com orgulho do que construiu.",
  },
  {
    line: "Confiança veste melhor que qualquer peça.",
    sub: "A Majesté só acompanha quem você já é.",
  },
  {
    line: "Beleza que se sente no corpo inteiro.",
    sub: "Leve, firme e sua — do jeito que te faz bem.",
  },
  {
    line: "Você é o resultado da sua constância.",
    sub: "E isso ninguém tira — nem um dia difícil.",
  },
  {
    line: "Poderosa não é volume. É presença.",
    sub: "Continue ocupando espaço com leveza e verdade.",
  },
];

function fitnessNoteForOrder(orderNumber: string) {
  let hash = 0;
  for (let i = 0; i < orderNumber.length; i++) {
    hash = (hash + orderNumber.charCodeAt(i) * (i + 1)) % FITNESS_NOTES.length;
  }
  return FITNESS_NOTES[hash] || FITNESS_NOTES[0];
}

export function OrderReceipt({
  order,
  variant = "store",
  showStoreCta = false,
}: {
  order: OrderReceiptData;
  variant?: "store" | "admin";
  /** Botão de retorno à loja (só na tela do cliente). */
  showStoreCta?: boolean;
}) {
  const isPix = Boolean(order.pixCode) || order.paymentMethod === "pix";
  const isBoleto = Boolean(order.boletoUrl || order.boletoBarcode);
  const isWhatsapp = order.paymentMethod === "whatsapp";
  const isCardPaid =
    order.paymentMethod === "credit_card" && order.status === "PAID";
  const paidLike =
    order.status === "PAID" ||
    order.status === "PROCESSING" ||
    order.status === "SHIPPED" ||
    order.status === "DELIVERED" ||
    order.paymentStatus === "APPROVED";

  const note = fitnessNoteForOrder(String(order.orderNumber));

  const thankYou = isPix
    ? "Pague o Pix abaixo para confirmarmos seu pedido."
    : isBoleto
      ? "Pague o boleto para confirmarmos seu pedido."
      : isWhatsapp
        ? "Combinamos o pagamento com você no WhatsApp."
        : "Obrigada pela compra — volte sempre!";

  return (
    <div className="space-y-4 border border-line bg-surface p-6 text-left">
      {variant === "admin" ? (
        <p className="text-xs uppercase tracking-wider text-muted mb-1">
          Comprovante (visão do cliente)
        </p>
      ) : null}

      <div className="text-center mb-2">
        <p
          className="text-2xl mb-1"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {isCardPaid || (paidLike && !isPix && !isBoleto && !isWhatsapp)
            ? "Pagamento aprovado"
            : "Pedido recebido"}
        </p>
        <p className="text-sm text-[#5c534c] leading-relaxed">{thankYou}</p>
      </div>

      <p>
        Número: <strong>{order.orderNumber}</strong>
      </p>
      <p>Total: {formatBRL(Number(order.total))}</p>
      <p className="text-sm text-muted">
        Status: {orderStatusLabel(order.status)}
        {order.paymentMethod
          ? ` · ${paymentMethodLabel(order.paymentMethod)}`
          : ""}
        {order.paymentStatus
          ? ` (${paymentStatusLabel(order.paymentStatus)})`
          : ""}
      </p>

      {order.items && order.items.length > 0 ? (
        <ul className="text-sm space-y-1 border-t border-line pt-3">
          {order.items.map((i, idx) => (
            <li key={idx} className="flex justify-between gap-3">
              <span>
                {i.productName} ({i.size}/{i.color}) ×{i.quantity}
              </span>
              <span className="tabular-nums shrink-0">
                {formatBRL(Number(i.total))}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {isPix && order.pixCode ? (
        <div className="mt-2 space-y-4 border-t border-line pt-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-[#2a2420]">QR Code Pix</p>
            {order.pixQrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={order.pixQrDataUrl}
                alt="QR Code Pix"
                className="mx-auto w-[220px] h-[220px] border border-line bg-white p-2"
              />
            ) : (
              <p className="text-xs text-muted">
                Use o código copia e cola abaixo.
              </p>
            )}
          </div>
          <PixCopyPaste code={order.pixCode} />
        </div>
      ) : null}

      {isBoleto ? (
        <div className="mt-2 space-y-3 border-t border-line pt-4">
          <p className="text-sm font-medium">Boleto</p>
          {order.boletoBarcode ? (
            <code className="block break-all text-xs bg-background p-3 border border-line">
              {order.boletoBarcode}
            </code>
          ) : null}
          {order.boletoUrl ? (
            <a
              href={order.boletoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary inline-flex"
            >
              Abrir boleto
            </a>
          ) : null}
        </div>
      ) : null}

      {order.localDeliveryWhatsapp ? (
        <div className="mt-2 border-t border-line pt-4 space-y-2">
          <p className="text-sm font-medium text-[#2a2420]">Entrega local</p>
          <p className="text-xs text-muted leading-relaxed">
            Agora combine o horário e os detalhes da entrega em Planaltina ou
            Sobradinho diretamente com a loja.
          </p>
          <a
            href={order.localDeliveryWhatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary inline-flex"
          >
            Combinar entrega pelo WhatsApp
          </a>
        </div>
      ) : null}

      <div className="mt-2 border-t border-line pt-5 text-center space-y-2">
        <p
          className="text-base md:text-lg text-[#2a2420] leading-snug"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {note.line}
        </p>
        <p className="text-sm text-[#6b5f56] leading-relaxed max-w-sm mx-auto">
          {note.sub}
        </p>
        {!isPix && !isBoleto ? (
          <p className="text-xs uppercase tracking-[0.14em] text-[#95752c] pt-1">
            Obrigada pela compra — volte sempre
          </p>
        ) : null}
      </div>

      {showStoreCta ? (
        <div className="pt-4 text-center">
          <Link href="/" className="btn btn-outline inline-flex">
            Continuar me sentindo poderosa
          </Link>
        </div>
      ) : null}

      {variant === "admin" ? (
        <div className="pt-2">
          <Link
            href={checkoutSuccessPath(order.orderNumber)}
            target="_blank"
            className="btn btn-outline inline-flex text-xs"
          >
            Abrir tela completa do cliente
          </Link>
        </div>
      ) : null}
    </div>
  );
}
