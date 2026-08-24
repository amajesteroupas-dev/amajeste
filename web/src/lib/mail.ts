import nodemailer from "nodemailer";

const DEFAULT_FROM =
  process.env.SMTP_FROM ||
  "Majeste <Josianesantosmajeste@gmail.com>";

export function isMailConfigured() {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS
  );
}

function getTransport() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;

  // Gmail: 587 + STARTTLS (secure:false). Porta 465 usa TLS direto.
  const isGmail =
    host.toLowerCase().includes("gmail.com") ||
    host.toLowerCase().includes("google.com");

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass },
    ...(isGmail
      ? {
          tls: {
            // Contas Google costumam exigir TLS moderno
            minVersion: "TLSv1.2" as const,
          },
        }
      : {}),
  });
}

export function buildCampaignHtml(opts: {
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  ctaLabel?: string | null;
  ctaHref?: string | null;
  siteUrl: string;
}) {
  const site = opts.siteUrl.replace(/\/$/, "");
  const img = opts.imageUrl
    ? opts.imageUrl.startsWith("http")
      ? opts.imageUrl
      : `${site}${opts.imageUrl}`
    : null;
  const ctaHref = opts.ctaHref
    ? opts.ctaHref.startsWith("http")
      ? opts.ctaHref
      : `${site}${opts.ctaHref}`
    : site;

  const paragraphs = (opts.body || "")
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map(
      (p) =>
        `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#5c534c;">${escapeHtml(p)}</p>`
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width"/></head>
<body style="margin:0;padding:0;background:#f4f1ec;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f1ec;padding:28px 12px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border:1px solid #e8e0d6;">
        <tr><td style="padding:28px 28px 12px;text-align:center;">
          <div style="font-size:28px;letter-spacing:0.02em;color:#c2a45b;">Majesté</div>
          <div style="font-family:system-ui,sans-serif;font-size:10px;letter-spacing:0.35em;color:#a8842f;margin-top:6px;">FITNESS</div>
        </td></tr>
        ${
          img
            ? `<tr><td style="padding:0 16px 8px;"><img src="${escapeAttr(img)}" alt="" width="528" style="display:block;width:100%;height:auto;border:0;"/></td></tr>`
            : ""
        }
        <tr><td style="padding:20px 28px 8px;">
          <h1 style="margin:0 0 14px;font-size:22px;font-weight:500;color:#2a2420;">${escapeHtml(opts.title)}</h1>
          ${paragraphs || `<p style="margin:0 0 14px;font-size:15px;line-height:1.55;color:#5c534c;">Novidades da Majesté para você.</p>`}
        </td></tr>
        ${
          opts.ctaLabel
            ? `<tr><td style="padding:4px 28px 28px;text-align:center;">
                <a href="${escapeAttr(ctaHref)}" style="display:inline-block;background:#a85f64;color:#ffffff;text-decoration:none;padding:12px 28px;font-family:system-ui,sans-serif;font-size:12px;letter-spacing:0.14em;text-transform:uppercase;">${escapeHtml(opts.ctaLabel)}</a>
              </td></tr>`
            : `<tr><td style="padding:0 0 24px;"></td></tr>`
        }
        <tr><td style="padding:16px 28px;border-top:1px solid #eee6dc;font-family:system-ui,sans-serif;font-size:11px;color:#9a8f86;text-align:center;">
          Você recebeu este e-mail porque se cadastrou ou se inscreveu na Majesté.<br/>
          <a href="${escapeAttr(site)}" style="color:#95752c;">${escapeHtml(site.replace(/^https?:\/\//, ""))}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/'/g, "&#39;");
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const transport = getTransport();
  if (!transport) {
    throw new Error(
      "SMTP não configurado. Defina SMTP_HOST, SMTP_USER e SMTP_PASS."
    );
  }
  const from = DEFAULT_FROM || process.env.SMTP_USER;

  await transport.sendMail({
    from,
    replyTo: process.env.SMTP_REPLY_TO || process.env.SMTP_USER || undefined,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });
}

export async function sendMarketingEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  return sendMail(opts);
}

export function buildPasswordResetHtml(opts: {
  name: string;
  resetUrl: string;
  siteUrl: string;
}) {
  const site = opts.siteUrl.replace(/\/$/, "");
  const first = (opts.name || "Maravilhosa").trim().split(/\s+/)[0] || "Maravilhosa";
  return buildCampaignHtml({
    title: `${first}, vamos redefinir sua senha`,
    body: `Recebemos um pedido para trocar a senha da sua conta Majesté.\n\nToque no botão abaixo. O link vale por 1 hora.\n\nSe você não pediu isso, ignore este e-mail — sua senha continua a mesma.`,
    ctaLabel: "Redefinir senha",
    ctaHref: opts.resetUrl,
    siteUrl: site,
  });
}
