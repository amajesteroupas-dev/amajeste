import { prisma } from "@/lib/prisma";
import {
  getFinanceOpsSettings,
  type FinanceNfeSettings,
} from "@/lib/finance-settings";

export type NfeEmitResult = {
  ok: boolean;
  skipped?: boolean;
  status: string;
  number?: string;
  key?: string;
  pdfUrl?: string;
  externalId?: string;
  error?: string;
};

type OrderForNfe = {
  id: string;
  orderNumber: string;
  guestName: string | null;
  guestEmail: string | null;
  guestPhone: string | null;
  total: { toString(): string } | number;
  subtotal: { toString(): string } | number;
  shippingCost: { toString(): string } | number;
  discount: { toString(): string } | number;
  shippingStreet: string | null;
  shippingNumber: string | null;
  shippingComplement: string | null;
  shippingNeighborhood: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingZip: string | null;
  customer?: {
    name: string;
    email: string;
    phone: string | null;
    cpf: string | null;
  } | null;
  items: {
    productName: string;
    quantity: number;
    unitPrice: { toString(): string } | number;
    total: { toString(): string } | number;
  }[];
};

function nuvemBase(env: FinanceNfeSettings["environment"]) {
  return env === "production"
    ? "https://api.nuvemfiscal.com.br"
    : "https://api.sandbox.nuvemfiscal.com.br";
}

async function emitNuvemFiscal(
  order: OrderForNfe,
  cfg: FinanceNfeSettings
): Promise<NfeEmitResult> {
  if (!cfg.apiToken) {
    return { ok: false, status: "ERROR", error: "Token NF-e ausente" };
  }

  const buyerName =
    order.customer?.name || order.guestName || "Consumidor final";
  const buyerCpf = (order.customer?.cpf || "").replace(/\D/g, "");
  const items = order.items.map((it, i) => ({
    numero_item: i + 1,
    codigo_produto: `ITEM${i + 1}`,
    descricao: it.productName.slice(0, 120),
    quantidade_comercial: it.quantity,
    valor_unitario_comercial: Number(it.unitPrice),
    valor_bruto: Number(it.total),
  }));

  // Payload mínimo — ajuste finos (CFOP/NCM) no painel do provedor / próximos passos
  const body = {
    referencia: order.orderNumber,
    ambiente: cfg.environment === "production" ? "producao" : "homologacao",
    natureza_operacao: "Venda de mercadoria",
    comprador: {
      nome: buyerName,
      cpf: buyerCpf || undefined,
      email: order.customer?.email || order.guestEmail || undefined,
      endereco: order.shippingStreet
        ? {
            logradouro: order.shippingStreet,
            numero: order.shippingNumber || "S/N",
            complemento: order.shippingComplement || undefined,
            bairro: order.shippingNeighborhood || "Centro",
            codigo_municipio: undefined,
            cidade: order.shippingCity || undefined,
            uf: order.shippingState || undefined,
            cep: (order.shippingZip || "").replace(/\D/g, "") || undefined,
          }
        : undefined,
    },
    itens: items,
    valor: {
      total: Number(order.total),
      produtos: Number(order.subtotal),
      frete: Number(order.shippingCost),
      desconto: Number(order.discount),
    },
  };

  const res = await fetch(`${nuvemBase(cfg.environment)}/nfe`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json().catch(() => ({}))) as {
    id?: string;
    numero?: string | number;
    chave?: string;
    status?: string;
    mensagem?: string;
    error?: { message?: string };
    pdf?: string;
    links?: { pdf?: string };
  };

  if (!res.ok) {
    return {
      ok: false,
      status: "ERROR",
      error:
        data.mensagem ||
        data.error?.message ||
        `Nuvem Fiscal HTTP ${res.status}`,
    };
  }

  return {
    ok: true,
    status: "ISSUED",
    number: data.numero != null ? String(data.numero) : undefined,
    key: data.chave,
    pdfUrl: data.pdf || data.links?.pdf,
    externalId: data.id,
  };
}

async function emitFocusNfe(
  order: OrderForNfe,
  cfg: FinanceNfeSettings
): Promise<NfeEmitResult> {
  if (!cfg.apiToken) {
    return { ok: false, status: "ERROR", error: "Token Focus NFe ausente" };
  }
  const host =
    cfg.environment === "production"
      ? "https://api.focusnfe.com.br"
      : "https://homologacao.focusnfe.com.br";

  const auth = Buffer.from(`${cfg.apiToken}:`).toString("base64");
  const items = order.items.map((it, i) => ({
    numero_item: String(i + 1),
    codigo_produto: `ITEM${i + 1}`,
    descricao: it.productName.slice(0, 120),
    cfop: "5102",
    quantidade_comercial: it.quantity,
    quantidade_tributavel: it.quantity,
    valor_unitario_comercial: Number(it.unitPrice),
    valor_unitario_tributavel: Number(it.unitPrice),
    unidade_comercial: "UN",
    unidade_tributavel: "UN",
    icms_origem: "0",
    icms_situacao_tributaria: "102",
  }));

  const body = {
    natureza_operacao: "Venda de mercadoria",
    data_emissao: new Date().toISOString(),
    tipo_documento: "1",
    finalidade_emissao: "1",
    local_destino: "1",
    consumidor_final: "1",
    presenca_comprador: "2",
    cnpj_emitente: cfg.companyCnpj || undefined,
    nome_destinatario:
      order.customer?.name || order.guestName || "Consumidor final",
    cpf_destinatario: (order.customer?.cpf || "").replace(/\D/g, "") || undefined,
    email_destinatario: order.customer?.email || order.guestEmail || undefined,
    logradouro_destinatario: order.shippingStreet || undefined,
    numero_destinatario: order.shippingNumber || undefined,
    bairro_destinatario: order.shippingNeighborhood || undefined,
    municipio_destinatario: order.shippingCity || undefined,
    uf_destinatario: order.shippingState || undefined,
    cep_destinatario: (order.shippingZip || "").replace(/\D/g, "") || undefined,
    items,
    valor_frete: Number(order.shippingCost) || 0,
    valor_desconto: Number(order.discount) || 0,
  };

  const res = await fetch(
    `${host}/v2/nfe?ref=${encodeURIComponent(order.orderNumber)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }
  );

  const data = (await res.json().catch(() => ({}))) as {
    status?: string;
    mensagem?: string;
    codigo?: string;
    chave_nfe?: string;
    numero?: string;
    caminho_danfe?: string;
  };

  if (!res.ok && res.status !== 202) {
    return {
      ok: false,
      status: "ERROR",
      error: data.mensagem || `Focus NFe HTTP ${res.status}`,
    };
  }

  return {
    ok: true,
    status: data.status === "autorizado" ? "ISSUED" : "PENDING",
    number: data.numero,
    key: data.chave_nfe,
    pdfUrl: data.caminho_danfe
      ? `${host}${data.caminho_danfe}`
      : undefined,
    externalId: order.orderNumber,
  };
}

/** Emite NF-e do pedido conforme provedor configurado. */
export async function emitSaleInvoice(orderId: string): Promise<NfeEmitResult> {
  const cfg = (await getFinanceOpsSettings()).nfe;
  if (!cfg.enabled || cfg.provider === "none") {
    return { ok: true, skipped: true, status: "SKIPPED" };
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      customer: { select: { name: true, email: true, phone: true, cpf: true } },
    },
  });
  if (!order) {
    return { ok: false, status: "ERROR", error: "Pedido não encontrado" };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: { nfeStatus: "PENDING", nfeError: null },
  });

  let result: NfeEmitResult;
  try {
    if (cfg.provider === "nuvemfiscal") {
      result = await emitNuvemFiscal(order, cfg);
    } else if (cfg.provider === "focus") {
      result = await emitFocusNfe(order, cfg);
    } else {
      result = { ok: true, skipped: true, status: "SKIPPED" };
    }
  } catch (e) {
    result = {
      ok: false,
      status: "ERROR",
      error: e instanceof Error ? e.message : "Falha ao emitir NF-e",
    };
  }

  await prisma.order.update({
    where: { id: orderId },
    data: {
      nfeStatus: result.status,
      nfeNumber: result.number || null,
      nfeKey: result.key || null,
      nfePdfUrl: result.pdfUrl || null,
      nfeExternalId: result.externalId || null,
      nfeError: result.error || null,
      nfeIssuedAt:
        result.status === "ISSUED" ? new Date() : undefined,
    },
  });

  return result;
}

export async function maybeAutoEmitNfe(orderId: string) {
  const cfg = (await getFinanceOpsSettings()).nfe;
  if (!cfg.enabled || !cfg.autoEmitOnPaid || cfg.provider === "none") {
    return { skipped: true as const };
  }
  return emitSaleInvoice(orderId);
}
