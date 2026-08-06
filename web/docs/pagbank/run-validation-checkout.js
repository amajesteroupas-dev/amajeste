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
  return {
    status: res.status,
    ms: Date.now() - started,
    data,
    text: text.slice(0, 3000),
  };
}

(async () => {
  const rows = await prisma.siteSetting.findMany({
    where: {
      key: { in: ["payPsToken", "payPsSandbox", "payPsEnabled"] },
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
  const ref = "chk-valid-" + Date.now();
  const log = [];
  const push = (s) => log.push(s);

  push("================================================================");
  push("LOG DE VALIDAÇÃO — PagBank API CHECKOUT (Produção)");
  push("Loja: Majesté Fitness | Site: https://amajeste.com.br");
  push("Aplicação Connect: majeste-fitness");
  push("Data/hora (UTC): " + ts);
  push("Ambiente API: https://api.pagseguro.com");
  push("Escopo deste log: API Checkout (POST /checkouts + GET)");
  push("================================================================");
  push("");
  push("1) CREDENCIAIS (mascaradas)");
  push("----------------------------------------------------------------");
  push("payPsEnabled: " + String(map.payPsEnabled));
  push("payPsSandbox: " + String(map.payPsSandbox) + " (false = produção)");
  push("Token Integrações (Bearer): " + mask(token));
  push("Notification URL: https://amajeste.com.br/api/webhooks/pagseguro");
  push("Redirect/Return URL: https://amajeste.com.br/checkout/sucesso");
  push("");

  push("2) TESTE A — POST /checkouts (R$ 1,00)");
  push("----------------------------------------------------------------");
  const checkoutBody = {
    reference_id: ref,
    customer: {
      name: "Validacao Homologacao Majeste",
      email: "validacao@amajeste.com.br",
      tax_id: "39053344705",
    },
    items: [
      {
        reference_id: "item-checkout-validacao",
        name: "Teste homologacao API Checkout",
        quantity: 1,
        unit_amount: 100,
      },
    ],
    redirect_url: "https://amajeste.com.br/checkout/sucesso",
    return_url: "https://amajeste.com.br/checkout/sucesso",
    notification_urls: ["https://amajeste.com.br/api/webhooks/pagseguro"],
  };
  push("Request body: " + JSON.stringify(checkoutBody));
  const a = await fetchApi("/checkouts", {
    method: "POST",
    token,
    body: checkoutBody,
  });
  push("HTTP " + a.status + " (" + a.ms + " ms)");
  push("Resposta: " + a.text);
  const checkoutId = a.data && a.data.id;
  const links = (a.data && a.data.links) || [];
  push("checkout.id: " + (checkoutId || "(nenhum)"));
  push("status: " + String((a.data && a.data.status) || ""));
  push("links: " + JSON.stringify(links).slice(0, 800));
  push("Resultado: " + (a.status >= 200 && a.status < 300 ? "OK" : "FALHA"));
  push("");

  if (checkoutId) {
    push("3) TESTE B — GET /checkouts/" + checkoutId);
    push("----------------------------------------------------------------");
    const b = await fetchApi("/checkouts/" + checkoutId, { token });
    push("HTTP " + b.status + " (" + b.ms + " ms)");
    push("Resposta (trecho): " + b.text.slice(0, 1500));
    push("Resultado: " + (b.status >= 200 && b.status < 300 ? "OK" : "FALHA"));
    push("");
  } else {
    push("3) TESTE B — GET /checkouts/{id} — pulado");
    push("");
  }

  push("4) TESTE C — Webhook loja GET /api/webhooks/pagseguro");
  push("----------------------------------------------------------------");
  const whStarted = Date.now();
  const whRes = await fetch("https://amajeste.com.br/api/webhooks/pagseguro");
  const whText = await whRes.text();
  push("HTTP " + whRes.status + " (" + (Date.now() - whStarted) + " ms)");
  push("Resposta: " + whText.slice(0, 300));
  push("Resultado: " + (whRes.status === 200 ? "OK" : "FALHA"));
  push("");

  push("5) RESUMO — API CHECKOUT");
  push("----------------------------------------------------------------");
  push(
    "A POST /checkouts: " +
      (a.status >= 200 && a.status < 300 ? "OK (" + a.status + ")" : "FALHA (" + a.status + ")")
  );
  push("C Webhook health:  " + (whRes.status === 200 ? "OK" : "FALHA"));
  push("");
  push("Integração Checkout:");
  push("- Criação de checkout hospedado via POST /checkouts");
  push("- Cliente redirecionado à página PagBank para pagar");
  push("- Retorno: https://amajeste.com.br/checkout/sucesso");
  push("- Notificações: https://amajeste.com.br/api/webhooks/pagseguro");
  push("");
  push("Fim do log (API Checkout).");

  console.log(log.join("\n"));
  await prisma.$disconnect();
})().catch((err) => {
  console.error("ERRO_DIAG:", err && err.stack ? err.stack : err);
  process.exit(1);
});
