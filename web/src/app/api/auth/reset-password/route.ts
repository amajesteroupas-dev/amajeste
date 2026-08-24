import { NextRequest, NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset";

export const runtime = "nodejs";

/** Redefine a senha com o token recebido por e-mail. */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await resetPasswordWithToken({
      token: String(body.token || ""),
      password: String(body.password || ""),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      ok: true,
      message: "Senha atualizada! Agora você já pode entrar.",
    });
  } catch (e) {
    console.error("[reset-password]", e);
    return NextResponse.json(
      { error: "Falha ao redefinir a senha. Tente de novo." },
      { status: 500 }
    );
  }
}
