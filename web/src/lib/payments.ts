import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

function getClient() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) return null;
  return new MercadoPagoConfig({ accessToken: token });
}

export async function createPixPayment(params: {
  amount: number;
  description: string;
  email: string;
  orderId: string;
}) {
  const client = getClient();
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
      transaction_amount: params.amount,
      description: params.description,
      payment_method_id: "pix",
      payer: { email: params.email },
      external_reference: params.orderId,
    },
  });
}

export async function createCheckoutPreference(params: {
  items: { title: string; quantity: number; unit_price: number }[];
  orderId: string;
  email: string;
}) {
  const client = getClient();
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  if (!client) {
    return {
      mock: true,
      id: `mock-pref-${params.orderId}`,
      init_point: `${baseUrl}/checkout/sucesso?order=${params.orderId}&mock=1`,
    };
  }

  const preference = new Preference(client);
  return preference.create({
    body: {
      items: params.items.map((item) => ({
        id: params.orderId,
        title: item.title,
        quantity: item.quantity,
        unit_price: item.unit_price,
        currency_id: "BRL",
      })),
      payer: { email: params.email },
      external_reference: params.orderId,
      back_urls: {
        success: `${baseUrl}/checkout/sucesso`,
        failure: `${baseUrl}/checkout/erro`,
        pending: `${baseUrl}/checkout/pendente`,
      },
      auto_return: "approved",
      notification_url: `${baseUrl}/api/webhooks/mercadopago`,
    },
  });
}

export async function getPayment(paymentId: string) {
  const client = getClient();
  if (!client) return null;
  const payment = new Payment(client);
  return payment.get({ id: paymentId });
}
