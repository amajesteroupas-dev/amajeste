/** Validação e formatação de CPF (Brasil) */

export function digitsOnly(value: string) {
  return (value || "").replace(/\D/g, "");
}

export function formatCpf(value: string) {
  const d = digitsOnly(value).slice(0, 11);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9)
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function calcDigit(base: string, factor: number) {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * (factor - i);
  }
  const mod = (sum * 10) % 11;
  return mod === 10 ? 0 : mod;
}

export function isValidCpf(value: string) {
  const cpf = digitsOnly(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const d1 = calcDigit(cpf.slice(0, 9), 10);
  const d2 = calcDigit(cpf.slice(0, 10), 11);
  return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
}

/**
 * Busca nome pelo CPF via API opcional (Hub do Desenvolvedor).
 * Configure CPF_LOOKUP_TOKEN no .env. Sem token, retorna só validação.
 */
export async function lookupCpfName(cpfRaw: string): Promise<{
  valid: boolean;
  cpf: string;
  name?: string;
  source?: string;
}> {
  const cpf = digitsOnly(cpfRaw);
  if (!isValidCpf(cpf)) {
    return { valid: false, cpf };
  }

  const token = process.env.CPF_LOOKUP_TOKEN;
  if (!token) {
    return { valid: true, cpf };
  }

  try {
    const url = `https://ws.hubdodesenvolvedor.com.br/v2/cpf/?cpf=${cpf}&token=${token}`;
    const res = await fetch(url, { next: { revalidate: 0 } });
    const json = (await res.json()) as {
      status?: boolean;
      result?: { nome_da_pf?: string; nome?: string };
    };
    const name =
      json.result?.nome_da_pf || json.result?.nome || undefined;
    if (json.status && name) {
      return { valid: true, cpf, name, source: "hubdev" };
    }
  } catch {
    /* ignore */
  }

  return { valid: true, cpf };
}
