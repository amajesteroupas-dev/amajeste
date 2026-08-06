export type TrackingEvent = {
  date: string;
  description: string;
  location?: string | null;
};

export type TrackingResult = {
  code: string;
  carrier: string;
  events: TrackingEvent[];
  officialUrl: string;
  source: "correios" | "fallback";
  error?: string;
};

function officialCorreiosUrl(code: string) {
  return `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(code)}`;
}

function normalizeCode(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Consulta SRO dos Correios (endpoint público proxyapp). */
export async function trackCorreios(codeRaw: string): Promise<TrackingResult> {
  const code = normalizeCode(codeRaw);
  const officialUrl = officialCorreiosUrl(code);

  if (!code || code.length < 8) {
    return {
      code,
      carrier: "Correios",
      events: [],
      officialUrl,
      source: "fallback",
      error: "Código de rastreio inválido",
    };
  }

  try {
    const res = await fetch(
      `https://proxyapp.correios.com.br/v1/sro-rastro/${encodeURIComponent(code)}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent":
            "Mozilla/5.0 (compatible; MajesteShop/1.0; +https://equilibra.tech)",
        },
        next: { revalidate: 120 },
      }
    );

    if (!res.ok) {
      return {
        code,
        carrier: "Correios",
        events: [],
        officialUrl,
        source: "fallback",
        error: "Não foi possível consultar os Correios agora",
      };
    }

    const data = (await res.json()) as {
      objetos?: Array<{
        codObjeto?: string;
        eventos?: Array<{
          dtHrCriado?: string | { date?: string };
          descricao?: string;
          unidade?: { endereco?: { cidade?: string; uf?: string }; tipo?: string };
        }>;
        mensagem?: string;
      }>;
    };

    const obj = data.objetos?.[0];
    const events: TrackingEvent[] = (obj?.eventos || []).map((ev) => {
      const rawDate =
        typeof ev.dtHrCriado === "string"
          ? ev.dtHrCriado
          : ev.dtHrCriado?.date || "";
      const city = ev.unidade?.endereco?.cidade;
      const uf = ev.unidade?.endereco?.uf;
      const location = [city, uf].filter(Boolean).join("/") || ev.unidade?.tipo || null;
      return {
        date: rawDate,
        description: ev.descricao || "Atualização",
        location,
      };
    });

    if (events.length === 0) {
      return {
        code,
        carrier: "Correios",
        events: [],
        officialUrl,
        source: "fallback",
        error: obj?.mensagem || "Sem eventos ainda para este código",
      };
    }

    return {
      code,
      carrier: "Correios",
      events,
      officialUrl,
      source: "correios",
    };
  } catch {
    return {
      code,
      carrier: "Correios",
      events: [],
      officialUrl,
      source: "fallback",
      error: "Falha de conexão com os Correios",
    };
  }
}
