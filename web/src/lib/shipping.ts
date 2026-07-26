const ME_BASE = process.env.MELHOR_ENVIO_SANDBOX === "true"
  ? "https://sandbox.melhorenvio.com.br"
  : "https://melhorenvio.com.br";

export type ShippingQuote = {
  id: string;
  name: string;
  company: string;
  price: number;
  deliveryDays: number;
  currency: string;
};

export async function quoteShipping(params: {
  fromZip: string;
  toZip: string;
  weightKg: number;
  heightCm?: number;
  widthCm?: number;
  lengthCm?: number;
}): Promise<ShippingQuote[]> {
  const token = process.env.MELHOR_ENVIO_TOKEN;

  if (!token) {
    // Mock quotes for development
    return [
      {
        id: "pac",
        name: "PAC",
        company: "Correios",
        price: 22.9,
        deliveryDays: 8,
        currency: "BRL",
      },
      {
        id: "sedex",
        name: "SEDEX",
        company: "Correios",
        price: 39.9,
        deliveryDays: 3,
        currency: "BRL",
      },
      {
        id: "jadlog",
        name: ".Package",
        company: "Jadlog",
        price: 28.5,
        deliveryDays: 5,
        currency: "BRL",
      },
    ];
  }

  const res = await fetch(`${ME_BASE}/api/v2/me/shipment/calculate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      from: { postal_code: params.fromZip.replace(/\D/g, "") },
      to: { postal_code: params.toZip.replace(/\D/g, "") },
      products: [
        {
          id: "1",
          width: params.widthCm ?? 20,
          height: params.heightCm ?? 5,
          length: params.lengthCm ?? 30,
          weight: params.weightKg,
          insurance_value: 0,
          quantity: 1,
        },
      ],
    }),
  });

  if (!res.ok) {
    throw new Error("Falha ao cotar frete no Melhor Envio");
  }

  const data = await res.json();
  return (data as Array<{
    id: number | string;
    name: string;
    company?: { name?: string };
    price?: string | number;
    custom_price?: string | number;
    delivery_time?: number;
    currency?: string;
    error?: string;
  }>)
    .filter((q) => !q.error)
    .map((q) => ({
      id: String(q.id),
      name: q.name,
      company: q.company?.name || "Transportadora",
      price: Number(q.custom_price ?? q.price ?? 0),
      deliveryDays: q.delivery_time ?? 7,
      currency: q.currency || "BRL",
    }));
}
