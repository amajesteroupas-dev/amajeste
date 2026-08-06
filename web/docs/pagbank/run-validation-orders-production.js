/**
 * Evidência PRODUÇÃO — API Orders (PIX + cartão)
 * Uso: node docs/pagbank/run-validation-orders-production.js
 *
 * Pré-requisitos:
 * - Token de produção em payPsToken (admin) ou PAGSEGURO_TOKEN
 * - Sandbox desmarcado (payPsSandbox=false)
 * - Chave Pix cadastrada na conta PagBank
 * - Opcional cartão: PAGSEGURO_ENCRYPTED_CARD (encryptCard com chave pública de PRODUÇÃO)
 *
 * Gera: docs/pagbank/log-producao-orders-pix-cartao.txt
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

async function fetchApi(base, apiPath, { method = "GET", token, body } = {}) {
  const started = Date.now();
  const res = await fetch(base + apiPath, {
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
    data = { raw: text.slice(0, 4000) };
  }
  return { status: res.status, ms: Date.now() - started, data, text };
}

function pushReq(lines, method, url, body) {
  lines.push("");
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
  lines.push(body == null ? "(sem body)" : JSON.stringify(body, null, 2));
}

function pushRes(lines, result) {
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
  let sandboxFlag = String(process.env.PAGSEGURO_SANDBOX || "").toLowerCase();
  let tokenSource = token ? ".env PAGSEGURO_TOKEN" : "";

  if (!token) {
    try {
      const { PrismaClient } = require("@prisma/client");
      const prisma = new PrismaClient();
      const rows = await prisma.siteSetting.findMany({
        where: {
          key: { in: ["payPsToken", "payPsSandbox", "payPsPublicKey"] },
        },
      });
      await prisma.$disconnect();
      const map = Object.fromEntries(rows.map((r) => [r.key, r.value || ""]));
      token = normalizeToken(map.payPsToken);
      tokenSource = "banco SiteSetting.payPsToken";
      sandboxFlag = String(map.payPsSandbox || "").toLowerCase();
      if (!process.env.PAGSEGURO_PUBLIC_KEY && map.payPsPublicKey) {
        process.env.PAGSEGURO_PUBLIC_KEY = map.payPsPublicKey;
      }
    } catch (e) {
      console.warn("Não foi possível ler token do banco:", e.message);
    }
  }

  if (!token) {
    console.error(
      "ERRO: informe o token de PRODUÇÃO em PAGSEGURO_TOKEN ou Admin → Pagamentos."
    );
    process.exit(1);
  }

  if (sandboxFlag === "true" || sandboxFlag === "1") {
    console.error(
      "ERRO: payPsSandbox/PAGSEGURO_SANDBOX está true. Desmarque Sandbox no admin e use token de produção."
    );
    process.exit(1);
  }

  const base = "https://api.pagseguro.com";
  const ts = new Date().toISOString();
  const refBase = "MAJ-PROD-ORD-" + Date.now();
  const lines = [];
  const outPath = path.join(__dirname, "log-producao-orders-pix-cartao.txt");
  const encryptedCard = String(
    process.env.PAGSEGURO_ENCRYPTED_CARD || ""
  ).trim();

  lines.push("=".repeat(80));
  lines.push("Majesté Fitness — Evidência PRODUÇÃO PagBank");
  lines.push("Integração: API de Pedidos e Pagamentos (Orders)");
  lines.push("Meios: PIX (qr_codes) + Cartão (CREDIT_CARD / encrypted)");
  lines.push("Ambiente: Produção");
  lines.push("API Base: " + base);
  lines.push("Data do teste: " + ts);
  lines.push("Loja: https://amajeste.com.br");
  lines.push("Notification URL: https://amajeste.com.br/api/webhooks/pagseguro");
  lines.push("Token (mascarado): " + maskToken(token) + " — " + tokenSource);
  lines.push("=".repeat(80));
  lines.push("");
  lines.push("ESCOPO");
  lines.push("- Checkout transparente no domínio amajeste.com.br");
  lines.push("- Cartão e Pix como meios SEPARADOS no checkout");
  lines.push("- Sem redirecionamento para página hospedada PagBank");
  lines.push("- Sem Divisão de Pagamentos / split");

  // A) public key
  lines.push("");
  lines.push("#".repeat(80));
  lines.push("# TESTE A — GET /public-keys/card");
  lines.push("#".repeat(80));
  pushReq(lines, "GET", base + "/public-keys/card", null);
  const a = await fetchApi(base, "/public-keys/card", { token });
  pushRes(lines, a);
  let publicKey =
    (a.data && (a.data.public_key || a.data.publicKey)) ||
    process.env.PAGSEGURO_PUBLIC_KEY ||
    "";

  if (!(a.status >= 200 && a.status < 300 && publicKey)) {
    lines.push("");
    lines.push("#".repeat(80));
    lines.push("# TESTE A2 — POST /public-keys { type: card }");
    lines.push("#".repeat(80));
    const pkBody = { type: "card" };
    pushReq(lines, "POST", base + "/public-keys", pkBody);
    const a2 = await fetchApi(base, "/public-keys", {
      method: "POST",
      token,
      body: pkBody,
    });
    pushRes(lines, a2);
    publicKey =
      (a2.data && (a2.data.public_key || a2.data.publicKey)) || publicKey;
  }

  // B) PIX
  lines.push("");
  lines.push("#".repeat(80));
  lines.push("# TESTE B — POST /orders — PIX");
  lines.push("#".repeat(80));
  const expires = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
  const pixBody = {
    reference_id: refBase + "-PIX",
    customer: {
      name: "Jose da Silva",
      email: "email@test.com",
      tax_id: "12345678909",
      phones: [
        { country: "55", area: "11", number: "999999999", type: "MOBILE" },
      ],
    },
    items: [
      {
        reference_id: "item-1",
        name: "Teste producao Majeste - PIX Orders",
        quantity: 1,
        unit_amount: 100,
      },
    ],
    qr_codes: [{ amount: { value: 100 }, expiration_date: expires }],
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
  };
  pushReq(lines, "POST", base + "/orders", pixBody);
  const pix = await fetchApi(base, "/orders", {
    method: "POST",
    token,
    body: pixBody,
  });
  pushRes(lines, pix);
  const pixOk =
    pix.status >= 200 &&
    pix.status < 300 &&
    Array.isArray(pix.data.qr_codes) &&
    pix.data.qr_codes.length > 0;
  lines.push("");
  lines.push(
    "Resultado PIX: " +
      (pixOk ? "OK — QR gerado (" + (pix.data.id || "") + ")" : "FALHA")
  );

  // C) CARD
  lines.push("");
  lines.push("#".repeat(80));
  lines.push("# TESTE C — POST /orders — CREDIT_CARD");
  lines.push("#".repeat(80));

  let cardOk = false;
  if (!encryptedCard) {
    lines.push("");
    lines.push(
      "PULADO: defina PAGSEGURO_ENCRYPTED_CARD (encryptCard com a chave pública de PRODUÇÃO)."
    );
    lines.push(
      "Ex.: no browser com SDK PagBank + publicKey de produção, depois:"
    );
    lines.push(
      '  $env:PAGSEGURO_ENCRYPTED_CARD="..."; node docs/pagbank/run-validation-orders-production.js'
    );
    if (publicKey) {
      lines.push("");
      lines.push(
        "public_key disponível (mascarada): " + maskToken(String(publicKey))
      );
    }
  } else {
    const cardBody = {
      reference_id: refBase + "-CARD",
      customer: {
        name: "Jose da Silva",
        email: "email@test.com",
        tax_id: "12345678909",
        phones: [
          { country: "55", area: "11", number: "999999999", type: "MOBILE" },
        ],
      },
      items: [
        {
          reference_id: "item-1",
          name: "Teste producao Majeste - Cartao Orders",
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
          description: "Teste cartao producao Majeste",
          amount: { value: 100, currency: "BRL" },
          payment_method: {
            type: "CREDIT_CARD",
            installments: 1,
            capture: true,
            card: {
              encrypted: encryptedCard,
              store: false,
              holder: {
                name: "Jose da Silva",
                tax_id: "65544332211",
              },
            },
          },
        },
      ],
    };
    pushReq(lines, "POST", base + "/orders", cardBody);
    const card = await fetchApi(base, "/orders", {
      method: "POST",
      token,
      body: cardBody,
    });
    pushRes(lines, card);
    const chargeStatus = String(
      (card.data.charges &&
        card.data.charges[0] &&
        card.data.charges[0].status) ||
        ""
    ).toUpperCase();
    cardOk =
      card.status >= 200 &&
      card.status < 300 &&
      Boolean(card.data.id);
    lines.push("");
    lines.push(
      "Resultado CARTÃO: " +
        (cardOk
          ? "OK — " +
            (card.data.id || "") +
            " status=" +
            (chargeStatus || "n/a")
          : "FALHA")
    );
  }

  lines.push("");
  lines.push("#".repeat(80));
  lines.push("# RESUMO");
  lines.push("#".repeat(80));
  lines.push(
    "A public-keys: " +
      (a.status >= 200 && a.status < 300 ? "OK" : "FALHA (" + a.status + ")")
  );
  lines.push(
    "B PIX POST /orders: " +
      (pixOk ? "OK (" + pix.status + ")" : "FALHA (" + pix.status + ")")
  );
  lines.push(
    "C CARD POST /orders: " +
      (encryptedCard
        ? cardOk
          ? "OK"
          : "FALHA"
        : "PULADO (sem PAGSEGURO_ENCRYPTED_CARD)")
  );
  lines.push("");
  lines.push("Fim do log.");

  const content = lines.join("\n");
  fs.writeFileSync(outPath, content, "utf8");
  console.log(content);
  console.log("\n--- Arquivo: " + outPath + " ---");
  process.exit(pixOk ? 0 : 2);
})().catch((err) => {
  console.error("ERRO:", err && err.stack ? err.stack : err);
  process.exit(1);
});
