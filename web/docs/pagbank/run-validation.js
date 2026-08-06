const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function mask(s) {
  const t = String(s || "");
  if (t.length <= 12) return "***";
  return t.slice(0, 6) + "…" + t.slice(-4) + ` (len=${t.length})`;
}

async function fetchApi(path, { method = "GET", token, body } = {}) {
  const started = Date.now();
  const res = await fetch("https://api.pagseguro.com" + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text.slice(0, 500) };
  }
  return { status: res.status, ms: Date.now() - started, data, text: text.slice(0, 2500) };
}

(async () => {
  const rows = await prisma.siteSetting.findMany({
    where: {
      key: { in: ["payPsToken", "payPsSandbox", "payPsEnabled", "payPsPublicKey"] },
    },
  });
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value || ""]));
  let token = String(map.payPsToken || "")
    .trim()
    .replace(/^Bearer\s+/i, "");
  if (
    (token.startsWith('"') && token.endsWith('"')) ||
    (token.startsWith("'") && token.endsWith("'"))
  ) {
    token = token.slice(1, -1);
  }

  const ts = new Date().toISOString();
  const ref = "valid-" + Date.now();
  const log = [];
  const push = (s) => log.push(s);

  push("================================================================");
  push("LOG DE VALIDAÇÃO — PagBank API Produção");
  push("Loja: Majesté Fitness | Site: https://amajeste.com.br");
  push("Aplicação Connect: majeste-fitness");
  push("Data/hora (UTC): " + ts);
  push("Ambiente API: https://api.pagseguro.com");
  push("================================================================");
  push("");
  push("1) CREDENCIAIS (mascaradas)");
  push("----------------------------------------------------------------");
  push("payPsEnabled: " + String(map.payPsEnabled));
  push("payPsSandbox: " + String(map.payPsSandbox) + " (false = produção)");
  push("Token Integrações (Bearer): " + mask(token));
  push(
    "Chave pública cartão salva: " +
      (map.payPsPublicKey ? mask(map.payPsPublicKey) : "(vazia)")
  );
  push("Notification URL: https://amajeste.com.br/api/webhooks/pagseguro");
  push("");

  push("2) TESTE A — GET /public-keys/card");
  push("----------------------------------------------------------------");
  const a = await fetchApi("/public-keys/card", { token });
  push("HTTP " + a.status + " (" + a.ms + " ms)");
  const pk = a.data && (a.data.public_key || a.data.publicKey);
  push("public_key presente: " + Boolean(pk) + (pk ? " " + mask(pk) : ""));
  push("Resposta (trecho): " + JSON.stringify(a.data).slice(0, 400));
  push("Resultado: " + (a.status >= 200 && a.status < 300 ? "OK" : "FALHA"));
  push("");

  push("3) TESTE B — POST /public-keys { type: card }");
  push("----------------------------------------------------------------");
  const b = await fetchApi("/public-keys", {
    method: "POST",
    token,
    body: { type: "card" },
  });
  push("HTTP " + b.status + " (" + b.ms + " ms)");
  push("Resposta (trecho): " + JSON.stringify(b.data).slice(0, 400));
  push("Resultado: " + (b.status >= 200 && b.status < 300 ? "OK" : "FALHA"));
  push("");

  push("4) TESTE C — POST /orders (Pix transparente R$1,00)");
  push("----------------------------------------------------------------");
  const expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const orderBody = {
    reference_id: ref,
    customer: {
      name: "Validacao Homologacao Majeste",
      email: "validacao@amajeste.com.br",
      tax_id: "39053344705",
    },
    items: [
      {
        reference_id: "item-validacao",
        name: "Teste homologacao API Orders",
        quantity: 1,
        unit_amount: 100,
      },
    ],
    qr_codes: [
      {
        amount: { value: 100 },
        expiration_date: expires,
      },
    ],
    notification_urls: ["https://amajeste.com.br/api/webhooks/pagseguro"],
  };
  push("Request body (sem segredos): " + JSON.stringify(orderBody));
  const c = await fetchApi("/orders", { method: "POST", token, body: orderBody });
  push("HTTP " + c.status + " (" + c.ms + " ms)");
  push("Resposta (trecho): " + c.text);
  const orderId = c.data && c.data.id;
  const hasQr =
    Array.isArray(c.data && c.data.qr_codes) && c.data.qr_codes.length > 0;
  push("order.id: " + (orderId || "(nenhum)"));
  push("qr_codes gerado: " + hasQr);
  push(
    "Resultado: " +
      (c.status >= 200 && c.status < 300 && hasQr
        ? "OK — API Orders liberada"
        : "FALHA / BLOQUEIO")
  );
  push("");

  if (orderId) {
    push("5) TESTE D — GET /orders/" + orderId);
    push("----------------------------------------------------------------");
    const d = await fetchApi("/orders/" + orderId, { token });
    push("HTTP " + d.status + " (" + d.ms + " ms)");
    push("Resposta (trecho): " + d.text.slice(0, 800));
    push("Resultado: " + (d.status >= 200 && d.status < 300 ? "OK" : "FALHA"));
    push("");
  } else {
    push("5) TESTE D — GET /orders/{id} — pulado (pedido não criado)");
    push("");
  }

  push("6) TESTE E — POST /checkouts (checkout hospedado — referência)");
  push("----------------------------------------------------------------");
  const checkoutBody = {
    reference_id: ref + "-chk",
    customer: {
      name: "Validacao Homologacao Majeste",
      email: "validacao@amajeste.com.br",
      tax_id: "39053344705",
    },
    items: [
      {
        reference_id: "item-validacao",
        name: "Teste checkout hospedado",
        quantity: 1,
        unit_amount: 100,
      },
    ],
    redirect_url: "https://amajeste.com.br/checkout/sucesso",
    return_url: "https://amajeste.com.br/checkout/sucesso",
    notification_urls: ["https://amajeste.com.br/api/webhooks/pagseguro"],
  };
  const e = await fetchApi("/checkouts", {
    method: "POST",
    token,
    body: checkoutBody,
  });
  push("HTTP " + e.status + " (" + e.ms + " ms)");
  push("Resposta (trecho): " + e.text.slice(0, 800));
  push("Resultado: " + (e.status >= 200 && e.status < 300 ? "OK" : "FALHA"));
  push("");

  push("7) TESTE F — Webhook loja GET /api/webhooks/pagseguro");
  push("----------------------------------------------------------------");
  const whStarted = Date.now();
  const whRes = await fetch("https://amajeste.com.br/api/webhooks/pagseguro");
  const whText = await whRes.text();
  push("HTTP " + whRes.status + " (" + (Date.now() - whStarted) + " ms)");
  push("Resposta: " + whText.slice(0, 300));
  push("Resultado: " + (whRes.status === 200 ? "OK" : "FALHA"));
  push("");

  push("8) RESUMO");
  push("----------------------------------------------------------------");
  push(
    "A GET /public-keys/card: " +
      (a.status >= 200 && a.status < 300 ? "OK" : "FALHA (" + a.status + ")")
  );
  push(
    "B POST /public-keys:     " +
      (b.status >= 200 && b.status < 300 ? "OK" : "FALHA (" + b.status + ")")
  );
  push(
    "C POST /orders (Pix):    " +
      (c.status >= 200 && c.status < 300
        ? "OK (" + c.status + ")"
        : "FALHA (" +
            c.status +
            ") — " +
            JSON.stringify(c.data).slice(0, 200))
  );
  push(
    "E POST /checkouts:       " +
      (e.status >= 200 && e.status < 300 ? "OK" : "FALHA (" + e.status + ")")
  );
  push(
    "F Webhook health:        " + (whRes.status === 200 ? "OK" : "FALHA")
  );
  push("");
  push("Integração no site:");
  push("- Checkout transparente no próprio domínio (cartão encryptCard + Pix QR)");
  push("- POST /orders com notification_urls apontando para o webhook da loja");
  push("- Não é marketplace / sem split de recebíveis");
  push("");
  push("Fim do log.");

  console.log(log.join("\n"));
  await prisma.$disconnect();
})().catch((err) => {
  console.error("ERRO_DIAG:", err && err.stack ? err.stack : err);
  process.exit(1);
});
