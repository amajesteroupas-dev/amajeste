/** ViaCEP — preenchimento automático de endereço */

export type CepAddress = {
  zipCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  complement?: string;
};

export function digitsOnlyCep(value: string) {
  return (value || "").replace(/\D/g, "").slice(0, 8);
}

export function formatCep(value: string) {
  const d = digitsOnlyCep(value);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export async function fetchAddressByCep(
  cepRaw: string
): Promise<CepAddress | null> {
  const cep = digitsOnlyCep(cepRaw);
  if (cep.length !== 8) return null;

  const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
    next: { revalidate: 86400 },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as {
    erro?: boolean;
    cep?: string;
    logradouro?: string;
    complemento?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
  };
  if (data.erro) return null;

  return {
    zipCode: cep,
    street: data.logradouro || "",
    neighborhood: data.bairro || "",
    city: data.localidade || "",
    state: data.uf || "",
    complement: data.complemento || "",
  };
}
