import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { digitsOnly, isValidCpf } from "@/lib/cpf";
import { digitsOnlyCep } from "@/lib/cep";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");
    const phone = body.phone ? String(body.phone).trim() : null;
    const cpfRaw = body.cpf ? String(body.cpf) : "";
    const cpf = cpfRaw ? digitsOnly(cpfRaw) : null;

    const zipCode = digitsOnlyCep(String(body.zipCode || body.zip || ""));
    const street = String(body.street || "").trim();
    const number = String(body.number || "").trim();
    const complement = body.complement ? String(body.complement).trim() : null;
    const neighborhood = String(body.neighborhood || "").trim();
    const city = String(body.city || "").trim();
    const state = String(body.state || "")
      .trim()
      .toUpperCase()
      .slice(0, 2);

    if (!name || !email || password.length < 6) {
      return NextResponse.json(
        { error: "Preencha nome, e-mail e senha (mín. 6 caracteres)." },
        { status: 400 }
      );
    }

    if (cpf && !isValidCpf(cpf)) {
      return NextResponse.json({ error: "CPF inválido." }, { status: 400 });
    }

    if (
      zipCode.length !== 8 ||
      !street ||
      !number ||
      !neighborhood ||
      !city ||
      state.length !== 2
    ) {
      return NextResponse.json(
        {
          error:
            "Preencha o endereço completo (CEP, rua, número, bairro, cidade e UF).",
        },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return NextResponse.json(
        { error: "Já existe uma conta com este e-mail." },
        { status: 409 }
      );
    }

    if (cpf) {
      const cpfTaken = await prisma.customer.findFirst({ where: { cpf } });
      if (cpfTaken) {
        return NextResponse.json(
          { error: "Este CPF já está cadastrado." },
          { status: 409 }
        );
      }
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const result = await prisma.$transaction(async (tx) => {
      let customer = await tx.customer.findUnique({ where: { email } });

      const user = await tx.user.create({
        data: {
          email,
          name,
          passwordHash,
          role: "CUSTOMER",
        },
      });

      if (customer) {
        customer = await tx.customer.update({
          where: { id: customer.id },
          data: {
            userId: user.id,
            name,
            phone: phone || customer.phone,
            cpf: cpf || customer.cpf,
          },
        });
      } else {
        customer = await tx.customer.create({
          data: {
            userId: user.id,
            email,
            name,
            phone,
            cpf,
          },
        });
      }

      const hasAddress = await tx.address.count({
        where: { customerId: customer.id },
      });
      if (hasAddress === 0) {
        await tx.address.create({
          data: {
            customerId: customer.id,
            label: String(body.addressLabel || "Principal"),
            street,
            number,
            complement,
            neighborhood,
            city,
            state,
            zipCode,
            isDefault: true,
          },
        });
      }

      return { userId: user.id, customerId: customer.id };
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Falha no cadastro" }, { status: 500 });
  }
}
