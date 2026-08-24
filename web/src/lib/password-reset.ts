import { createHash, randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { siteBaseUrl } from "@/lib/catalog-api";
import { buildPasswordResetHtml, isMailConfigured, sendMail } from "@/lib/mail";

const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hora

export function hashResetToken(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

export function createRawResetToken() {
  return randomBytes(32).toString("hex");
}

/**
 * Gera token e envia e-mail. Sempre responde ok ao cliente (não vaza se o e-mail existe).
 * Retorna detalhes só para logs/admin.
 */
export async function requestPasswordReset(emailRaw: string): Promise<{
  ok: true;
  mailed: boolean;
  reason?: string;
}> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { ok: true, mailed: false, reason: "invalid_email" };
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true },
  });

  if (!user || user.role !== "CUSTOMER") {
    return { ok: true, mailed: false, reason: "no_customer" };
  }

  if (!isMailConfigured()) {
    return { ok: true, mailed: false, reason: "smtp_missing" };
  }

  // Invalida tokens anteriores deste e-mail
  await prisma.passwordResetToken.updateMany({
    where: { email, usedAt: null },
    data: { usedAt: new Date() },
  });

  const raw = createRawResetToken();
  const tokenHash = hashResetToken(raw);
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS);

  await prisma.passwordResetToken.create({
    data: { email, tokenHash, expiresAt },
  });

  const base = siteBaseUrl().replace(/\/$/, "");
  const resetUrl = `${base}/redefinir-senha?token=${encodeURIComponent(raw)}`;

  await sendMail({
    to: user.email,
    subject: "Redefinir senha — Majesté",
    html: buildPasswordResetHtml({
      name: user.name,
      resetUrl,
      siteUrl: base,
    }),
  });

  return { ok: true, mailed: true };
}

export async function resetPasswordWithToken(opts: {
  token: string;
  password: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const raw = String(opts.token || "").trim();
  const password = String(opts.password || "");

  if (!raw) {
    return { ok: false, error: "Link inválido ou incompleto." };
  }
  if (password.length < 6) {
    return {
      ok: false,
      error: "A nova senha precisa ter pelo menos 6 caracteres.",
    };
  }

  const tokenHash = hashResetToken(raw);
  const row = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    return {
      ok: false,
      error: "Este link expirou ou já foi usado. Peça um novo em Esqueci a senha.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { email: row.email },
    select: { id: true, role: true },
  });
  if (!user || user.role !== "CUSTOMER") {
    return { ok: false, error: "Conta não encontrada para este link." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: row.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return { ok: true };
}
