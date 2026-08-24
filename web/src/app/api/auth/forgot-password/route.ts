import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/password-reset";

export const runtime = "nodejs";

/**
 * Solicita e-mail de redefinição de senha (cliente da loja).
 * Sempre responde sucesso genérico para não vazar se o e-mail existe.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = String(body.email || "");
    const result = await requestPasswordReset(email);

    if (result.reason === "smtp_missing") {
      console.error("[forgot-password] SMTP não configurado");
      return NextResponse.json(
        {
          error:
            "Envio de e-mail indisponível no momento. Fale conosco no WhatsApp da loja.",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      ok: true,
      message:
        "Se este e-mail tiver conta na Majesté, você receberá um link para redefinir a senha. Confira também a caixa de spam.",
    });
  } catch (e) {
    console.error("[forgot-password]", e);
    return NextResponse.json(
      { error: "Não foi possível enviar o e-mail agora. Tente de novo em instantes." },
      { status: 500 }
    );
  }
}
