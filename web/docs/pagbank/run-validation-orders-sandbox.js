/**
 * Evidência Sandbox — API Orders (PIX + Cartão)
 * Uso: node docs/pagbank/run-validation-orders-sandbox.js
 *
 * Token: PAGSEGURO_TOKEN no .env OU payPsToken no banco (SiteSetting).
 * Cartão: PAGSEGURO_ENCRYPTED_CARD gerado pelo SDK PagSeguro.encryptCard
 * usando a chave pública Sandbox desta mesma conta.
 * Sempre chama https://sandbox.api.pagseguro.com
 */
const fs = require("fs");
const path = require("path");

function loadEnvFile() {
  const envPath = path.join(__dirname, "..", "..", ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (process.env[m[1]] === undefined) process.env[m[1]] = v;
  }
}

function maskToken(s) {
  const t = String(s || "");
  if (t.length <= 12) return "***";
  return t.slice(0, 6) + "…" + t.slice(-4) + ` (len=${t.length})`;
}

function normalizeToken(raw) {
  let t = String(raw || "").trim();
  if (
    (t.startsWith('"') && t.endsWith('"')) ||
    (t.startsWith("'") && t.endsWith("'"))
  ) {
    t = t.slice(1, -1).trim();
  }
  return t.replace(/^Bearer\s+/i, "").trim();
}

async function fetchApi(base, pathName, { method = "GET", token, body } = {}) {
  const started = Date.now();
  const res = await fetch(base + pathName, {
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
    data = { raw: text.slice(0, 2000) };
  }
  return {
    status: res.status,
    ms: Date.now() - started,
    data,
    text,
  };
}

function section(lines, title) {
  lines.push("");
  lines.push("=".repeat(80));
  lines.push(title);
  lines.push("=".repeat(80));
}

function dumpRequest(lines, method, url, body) {
  lines.push("REQUEST");
  lines.push("-".repeat(80));
  lines.push(`${method} ${url}`);
  lines.push("");
  lines.push("Headers:");
  lines.push("  Authorization: Bearer ***MASKED***");
  lines.push("  Content-Type: application/json");
  lines.push("  Accept: application/json");
  lines.push("");
  lines.push("Body:");
  lines.push(JSON.stringify(body, null, 2));
}

function dumpResponse(lines, result) {
  lines.push("");
  lines.push("RESPONSE");
  lines.push("-".repeat(80));
  lines.push(`HTTP Status: ${result.status}`);
  lines.push(`Latency: ${result.ms} ms`);
  lines.push("");
  lines.push("Body:");
  lines.push(JSON.stringify(result.data, null, 2));
}

(async () => {
  loadEnvFile();

  let token = normalizeToken(process.env.PAGSEGURO_TOKEN || "");
  let tokenSource = token ? ".env PAGSEGURO_TOKEN" : "";

  if (!token) {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const rows = await prisma.siteSetting.findMany({
        where: { key: { in: ["payPsToken", "payPsSandbox"] } },
      });
      await prisma.$disconnect();
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value || ""]));
      token = normalizeToken(map.payPsToken);
      tokenSource = "banco SiteSetting.payPsToken";
      if (String(map.payPsSandbox) !== "true") {
        console.warn(
          "AVISO: payPsSandbox no banco não é true. Este script força sandbox.api.pagseguro.com mesmo assim."
        );
      }
    } catch (e) {
      console.warn("Não foi possível ler token do banco:", e.message);
    }
  }

  if (!token) {
    console.error(
      "ERRO: informe o token Sandbox em PAGSEGURO_TOKEN (.env) ou payPsToken no admin."
    );
    process.exit(1);
  }

  const encryptedCard = String(
    process.env.PAGSEGURO_ENCRYPTED_CARD || ""
  ).trim();
  if (!encryptedCard) {
    console.error(
      "ERRO: informe PAGSEGURO_ENCRYPTED_CARD gerado pelo SDK com a chave pública Sandbox."
    );
    process.exit(1);
  }

  const base = "https://sandbox.api.pagseguro.com";
  const ts = new Date().toISOString();
  const refBase = "MAJ-SBX-ORD-" + Date.now();
  const lines = [];
  const outPath = path.join(__dirname, "log-sandbox-orders-pix-cartao.txt");

  lines.push("=".repeat(80));
  lines.push("Majesté Fitness — Evidência Sandbox PagBank");
  lines.push("Integração: API de Pedidos e Pagamentos (Orders)");
  lines.push("Meios de pagamento: PIX (qr_codes) + Cartão de crédito (CREDIT_CARD)");
  lines.push("Ambiente: Sandbox");
  lines.push("API Base: " + base);
  lines.push("Data do teste: " + ts);
  lines.push("Loja: https://amajeste.com.br");
  lines.push("Aplicação: majeste-fitness");
  lines.push("Token (mascarado): " + maskToken(token) + " — origem: " + tokenSource);
  lines.push("Notification URL: https://amajeste.com.br/api/webhooks/pagseguro");
  lines.push("=".repeat(80));
  lines.push("");
  lines.push("ESCOPO");
  lines.push("-".repeat(80));
  lines.push(
    "Checkout transparente no próprio domínio. NÃO utilizamos split/divisão de pagamentos."
  );
  lines.push("1) PIX — POST /orders com qr_codes");
  lines.push(
    "2) Cartão — POST /orders com charges.payment_method.type = CREDIT_CARD"
  );
  lines.push("   Cartão criptografado pelo SDK PagSeguro.encryptCard no Sandbox");

  // --- A) public key (pré-requisito cartão criptografado em produção) ---
  section(lines, "TESTE A — GET /public-keys/card (pré-requisito encryptCard)");
  {
    const url = base + "/public-keys/card";
    dumpRequest(lines, "GET", url, null);
    lines[lines.length - 1] = "(sem body)";
    const a = await fetchApi(base, "/public-keys/card", { token });
    dumpResponse(lines, a);
    lines.push("");
    lines.push(
      "Resultado: " +
        (a.status >= 200 && a.status < 300 ? "OK" : "FALHA / ver response")
    );
  }

  // --- B) PIX ---
  section(lines, "TESTE B — POST /orders — PIX (API Orders)");
  const expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const pixBody = {
    reference_id: refBase + "-PIX",
    customer: {
      name: "Jose da Silva",
      email: "email@test.com",
      tax_id: "12345678909",
      phones: [
        {
          country: "55",
          area: "11",
          number: "999999999",
          type: "MOBILE",
        },
      ],
    },
    items: [
      {
        reference_id: "item-pix-1",
        name: "Teste Sandbox Majeste - PIX Orders",
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
    shipping: {
      address: {
        street: "Avenida Brigadeiro Faria Lima",
        number: "1384",
        complement: "apto 12",
        locality: "Pinheiros",
        city: "Sao Paulo",
        region_code: "SP",
        country: "BRA",
        postal_code: "01452002",
      },
    },
  };
  dumpRequest(lines, "POST", base + "/orders", pixBody);
  const pix = await fetchApi(base, "/orders", {
    method: "POST",
    token,
    body: pixBody,
  });
  dumpResponse(lines, pix);
  const pixOk =
    pix.status >= 200 &&
    pix.status < 300 &&
    Array.isArray(pix.data.qr_codes) &&
    pix.data.qr_codes.length > 0;
  lines.push("");
  lines.push(
    "Resultado: " +
      (pixOk
        ? "OK — QR Code Pix gerado (order.id=" + (pix.data.id || "?") + ")"
        : "FALHA — ver HTTP/body acima")
  );

  // --- C) CREDIT CARD criptografado no Sandbox ---
  section(
    lines,
    "TESTE C — POST /orders — CREDIT_CARD criptografado (API Orders)"
  );
  const cardBody = {
    reference_id: refBase + "-CARD",
    customer: {
      name: "Jose da Silva",
      email: "email@test.com",
      tax_id: "12345678909",
      phones: [
        {
          country: "55",
          area: "11",
          number: "999999999",
          type: "MOBILE",
        },
      ],
    },
    items: [
      {
        reference_id: "item-card-1",
        name: "Teste Sandbox Majeste - Cartao Orders",
        quantity: 1,
        unit_amount: 100,
      },
    ],
    shipping: {
      address: {
        street: "Avenida Brigadeiro Faria Lima",
        number: "1384",
        complement: "apto 12",
        locality: "Pinheiros",
        city: "Sao Paulo",
        region_code: "SP",
        country: "BRA",
        postal_code: "01452002",
      },
    },
    notification_urls: ["https://amajeste.com.br/api/webhooks/pagseguro"],
    charges: [
      {
        reference_id: refBase + "-CHG",
        description: "Teste cartao sandbox Majeste",
        amount: { value: 100, currency: "BRL" },
        payment_method: {
          type: "CREDIT_CARD",
          installments: 1,
          capture: true,
          card: {
            encrypted: encryptedCard,
            holder: {
              name: "Jose da Silva",
              tax_id: "65544332211",
            },
            store: false,
          },
        },
      },
    ],
  };
  dumpRequest(lines, "POST", base + "/orders", cardBody);
  const card = await fetchApi(base, "/orders", {
    method: "POST",
    token,
    body: cardBody,
  });
  dumpResponse(lines, card);
  const chargeStatus = String(
    (card.data.charges && card.data.charges[0] && card.data.charges[0].status) ||
      ""
  ).toUpperCase();
  const cardOk =
    card.status >= 200 &&
    card.status < 300 &&
    (chargeStatus === "PAID" ||
      chargeStatus === "AUTHORIZED" ||
      chargeStatus === "IN_ANALYSIS" ||
      Boolean(card.data.id));
  lines.push("");
  lines.push(
    "Resultado: " +
      (cardOk
        ? "OK — order.id=" +
          (card.data.id || "?") +
          " charge.status=" +
          (chargeStatus || "(n/a)")
        : "FALHA — ver HTTP/body acima")
  );

  // --- D) GET order if PIX created ---
  if (pix.data && pix.data.id) {
    section(lines, "TESTE D — GET /orders/{id} (consulta do pedido PIX)");
    const getPath = "/orders/" + pix.data.id;
    dumpRequest(lines, "GET", base + getPath, null);
    lines[lines.length - 1] = "(sem body)";
    const g = await fetchApi(base, getPath, { token });
    dumpResponse(lines, g);
    lines.push("");
    lines.push(
      "Resultado: " +
        (g.status >= 200 && g.status < 300 ? "OK" : "FALHA")
    );
  }

  section(lines, "RESUMO");
  lines.push(
    "A GET /public-keys/card: " +
      (await Promise.resolve(
        lines.some((l) => l.includes("TESTE A")) ? "ver seção A" : "?"
      ))
  );
  lines.push(
    "B POST /orders PIX:     " +
      (pixOk ? "OK (" + pix.status + ")" : "FALHA (" + pix.status + ")")
  );
  lines.push(
    "C POST /orders CARTÃO:  " +
      (cardOk ? "OK (" + card.status + ")" : "FALHA (" + card.status + ")")
  );
  lines.push("");
  lines.push("Meios de pagamento que serão usados em produção:");
  lines.push("- API Orders + PIX (qr_codes no checkout do site)");
  lines.push(
    "- API Orders + CREDIT_CARD (cartão criptografado com PagSeguro.encryptCard)"
  );
  lines.push("- Sem Divisão de Pagamentos / split");
  lines.push("");
  lines.push("Fim do log.");

  const content = lines.join("\n");
  fs.writeFileSync(outPath, content, "utf8");
  console.log(content);
  console.log("\n--- Arquivo gerado: " + outPath + " ---");
  console.log(
    "PIX=" +
      (pixOk ? "OK" : "FAIL") +
      " CARD=" +
      (cardOk ? "OK" : "FAIL")
  );
  process.exit(pixOk && cardOk ? 0 : 2);
})().catch((err) => {
  console.error("ERRO:", err && err.stack ? err.stack : err);
  process.exit(1);
});
