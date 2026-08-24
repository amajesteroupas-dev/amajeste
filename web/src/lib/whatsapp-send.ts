import { getNotifyConfig } from "@/lib/notify-settings";

function toWhatsAppPhone(raw?: string | null) {
  const d = String(raw || "").replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("55") && d.length >= 12) return d;
  if (d.length === 10 || d.length === 11) return `55${d}`;
  return d.length >= 12 ? d : null;
}

export async function sendWhatsappText(opts: {
  phone?: string | null;
  message: string;
  force?: boolean;
}) {
  const phone = toWhatsAppPhone(opts.phone);
  if (!phone) {
    return { ok: false as const, error: "Cliente sem WhatsApp válido" };
  }

  const cfg = await getNotifyConfig();
  if (!opts.force && !cfg.whatsappOnOrder) {
    return { ok: false as const, error: "WhatsApp automático desligado" };
  }
  if (!cfg.whatsappReady) {
    return {
      ok: false as const,
      error: "API do WhatsApp não configurada (Z-API ou Evolution)",
    };
  }

  if (cfg.provider === "evolution") {
    return sendEvolution(cfg.evolutionUrl, cfg.evolutionKey, cfg.evolutionInstance, phone, opts.message);
  }
  return sendZapi(
    cfg.zapiInstance,
    cfg.zapiToken,
    cfg.zapiClientToken,
    phone,
    opts.message
  );
}

async function sendZapi(
  instance: string,
  token: string,
  clientToken: string,
  phone: string,
  message: string
) {
  const res = await fetch(
    `https://api.z-api.io/instances/${encodeURIComponent(instance)}/token/${encodeURIComponent(token)}/send-text`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(clientToken ? { "Client-Token": clientToken } : {}),
      },
      body: JSON.stringify({ phone, message }),
      signal: AbortSignal.timeout(15000),
    }
  );
  const text = await res.text();
  let json: { error?: string; message?: string } = {};
  try {
    json = JSON.parse(text) as { error?: string; message?: string };
  } catch {
    json = { message: text.slice(0, 180) };
  }
  if (!res.ok) {
    return {
      ok: false as const,
      error: json.error || json.message || `Z-API ${res.status}`,
    };
  }
  return { ok: true as const };
}

async function sendEvolution(
  baseUrl: string,
  apiKey: string,
  instance: string,
  phone: string,
  message: string
) {
  const url = `${baseUrl.replace(/\/$/, "")}/message/sendText/${encodeURIComponent(instance)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      apikey: apiKey,
    },
    body: JSON.stringify({ number: phone, text: message }),
    signal: AbortSignal.timeout(15000),
  });
  const text = await res.text();
  let json: { error?: string; message?: string } = {};
  try {
    json = JSON.parse(text) as { error?: string; message?: string };
  } catch {
    json = { message: text.slice(0, 180) };
  }
  if (!res.ok) {
    return {
      ok: false as const,
      error: json.error || json.message || `Evolution ${res.status}`,
    };
  }
  return { ok: true as const };
}
