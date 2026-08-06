import { NextResponse } from "next/server";
import { getEnabledCheckoutMethods } from "@/lib/payment-settings";

/** Métodos de pagamento ativos para o checkout da loja. */
export async function GET() {
  const methods = await getEnabledCheckoutMethods();
  return NextResponse.json({ methods });
}
