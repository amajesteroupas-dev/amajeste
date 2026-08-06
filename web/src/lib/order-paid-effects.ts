import { maybeAutoEmitNfe } from "@/lib/nfe";
import { maybeAutoPrintOrder } from "@/lib/order-print";
import {
  sendAllPurchaseConversionEvents,
  syncTrafficAttributionOnPaid,
} from "@/lib/traffic-attribution-server";

/** Dispara NF-e, impressão, atribuição de tráfego e CAPI após pedido pago. */
export async function onOrderPaidSideEffects(orderId: string) {
  const results = {
    nfe: null as unknown,
    print: null as unknown,
    traffic: null as unknown,
    conversions: null as unknown,
  };
  try {
    results.nfe = await maybeAutoEmitNfe(orderId);
  } catch (e) {
    console.error("[onOrderPaid] nfe", e);
    results.nfe = {
      ok: false,
      error: e instanceof Error ? e.message : "nfe error",
    };
  }
  try {
    results.print = await maybeAutoPrintOrder(orderId);
  } catch (e) {
    console.error("[onOrderPaid] print", e);
    results.print = {
      ok: false,
      error: e instanceof Error ? e.message : "print error",
    };
  }
  try {
    results.traffic = await syncTrafficAttributionOnPaid(orderId);
  } catch (e) {
    console.error("[onOrderPaid] traffic", e);
    results.traffic = {
      ok: false,
      error: e instanceof Error ? e.message : "traffic error",
    };
  }
  try {
    results.conversions = await sendAllPurchaseConversionEvents(orderId);
  } catch (e) {
    console.error("[onOrderPaid] conversions", e);
    results.conversions = {
      ok: false,
      error: e instanceof Error ? e.message : "conversions error",
    };
  }
  return results;
}
