import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { getPaymentSettings } from "@/lib/payment-settings";
import { checkoutSuccessPath } from "@/lib/order-access";

async function getClient() {
  const s = await getPaymentSettings();
  const token = s.mercadopago.accessToken;
  if (!token) return null;
  return new MercadoPagoConfig({ accessToken: token });
}

function splitName(full: string) {
  const parts = (full || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { first: "Cliente", last: "Majeste" };
  if (parts.length === 1) return { first: parts[0], last: parts[0] };
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

export async function createPixPayment(params: {
  amount: number;
  description: string;
  email: string;
  orderId: string;
}) {
  const client = await getClient();
  if (!client) {
    return {
      mock: true,
      id: `mock-pix-${params.orderId}`,
      status: "pending",
      point_of_interaction: {
        transaction_data: {
          qr_code: `00020126MOCKPIX${params.orderId}`,
          qr_code_base64: "",
        },
      },
    };
  }

  const payment = new Payment(client);
  return payment.create({
    body: {
      transaction_amount: Number(params.amount.toFixed(2)),
      description: params.description,
      payment_method_id: "pix",
      payer: { email: params.email },
      external_reference: params.orderId,
    },
  });
}

export async function createCardPayment(params: {
  amount: number;
  description: string;
  email: string;
  orderId: string;
  token: string;
  paymentMethodId: string;
  installments: number;
  issuerId?: string | number;
  cpf: string;
}) {
  const client = await getClient();
  if (!client) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "Mercado Pago não configurado. Defina o access token antes de aceitar cartão."
      );
    }
    return {
      mock: true,
      id: `mock-card-${params.orderId}`,
      status: "approved",
      status_detail: "accredited",
    };
  }

  const payment = new Payment(client);
  return payment.create({
    body: {
      transaction_amount: Number(params.amount.toFixed(2)),
      token: params.token,
      description: params.description,
      installments: Math.max(1, Number(params.installments) || 1),
      payment_method_id: params.paymentMethodId,
      issuer_id: params.issuerId ? Number(params.issuerId) : undefined,
      payer: {
        email: params.email,
        identification: {
          type: "CPF",
          number: params.cpf.replace(/\D/g, ""),
        },
      },
      external_reference: params.orderId,
    },
  });
}

export async function createBoletoPayment(params: {
  amount: number;
  description: string;
  email: string;
  orderId: string;
  name: string;
  cpf: string;
  zip: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}) {
  const client = await getClient();
  const { first, last } = splitName(params.name);

  if (!client) {
    return {
      mock: true,
      id: `mock-boleto-${params.orderId}`,
      status: "pending",
      transaction_details: {
        external_resource_url: `https://www.mercadopago.com.br/payments/mock-boleto`,
      },
      barcode: { content: `23793MOCK${params.orderId}` },
    };
  }

  const payment = new Payment(client);
  return payment.create({
    body: {
      transaction_amount: Number(params.amount.toFixed(2)),
      description: params.description,
      payment_method_id: "bolbradesco",
      payer: {
        email: params.email,
        first_name: first,
        last_name: last,
        identification: {
          type: "CPF",
          number: params.cpf.replace(/\D/g, ""),
        },
        address: {
          zip_code: params.zip.replace(/\D/g, ""),
          street_name: params.street,
          street_number: params.number || "S/N",
          neighborhood: params.neighborhood || "Centro",
          city: params.city,
          federal_unit: params.state.toUpperCase().slice(0, 2),
        },
      },
      external_reference: params.orderId,
    },
  });
}

/** Preferência só para Wallet Brick (sem redirecionar o checkout inteiro). */
export async function createCheckoutPreference(params: {
  items: { title: string; quantity: number; unit_price: number }[];
  orderId: string;
  orderNumber: string;
  email: string;
  shippingCost?: number;
}) {
  const client = await getClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  const successPath = checkoutSuccessPath(params.orderNumber).replace(
    /^\//,
    ""
  );
  const success = `${baseUrl}/${successPath}`;
  const failure = `${baseUrl}/checkout/erro?order=${params.orderNumber}`;
  const pending = `${baseUrl}/checkout/pendente?order=${params.orderNumber}`;

  if (!client) {
    return {
      mock: true,
      id: `mock-pref-${params.orderId}`,
      init_point: success,
      sandbox_init_point: success,
    };
  }

  const preference = new Preference(client);
  const items = params.items.map((item) => ({
    id: params.orderId,
    title: item.title,
    quantity: item.quantity,
    unit_price: item.unit_price,
    currency_id: "BRL" as const,
  }));

  if (params.shippingCost && params.shippingCost > 0) {
    items.push({
      id: `${params.orderId}-frete`,
      title: "Frete",
      quantity: 1,
      unit_price: Number(params.shippingCost.toFixed(2)),
      currency_id: "BRL",
    });
  }

  return preference.create({
    body: {
      items,
      payer: { email: params.email },
      external_reference: params.orderId,
      back_urls: {
        success,
        failure,
        pending,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    },
  });
}

export async function getPayment(paymentId: string) {
  const client = await getClient();
  if (!client) return null;
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}
