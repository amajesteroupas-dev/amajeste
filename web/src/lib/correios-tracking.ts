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

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const SEARCH_PARCEL_QUERY = `
mutation searchParcel ($tracker: TrackerSearchInput!) {
  result: searchParcel (tracker: $tracker) {
    lastStatus
    trackingEvents {
      createdAt
      title
      description
      location { complement city state }
    }
  }
}
`;

function officialCorreiosUrl(code: string) {
  return `https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(code)}`;
}

function normalizeCode(raw: string) {
  return raw.replace(/\s+/g, "").toUpperCase();
}

function formatLocation(loc?: {
  complement?: string | null;
  city?: string | null;
  state?: string | null;
} | null) {
  if (!loc) return null;
  const cityState = [loc.city, loc.state].filter(Boolean).join("/");
  if (cityState) return cityState;
  const extra = loc.complement?.trim();
  if (extra && !/^\d+$/.test(extra)) return extra;
  return null;
}

/** Datas sem fuso (ex.: "2026-08-10 09:16:40") são tratadas como Brasília. */
function brDateToIso(raw: string) {
  const s = String(raw || "").trim();
  if (!s) return "";
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);
  if (m) {
    const time = m[2].length === 5 ? `${m[2]}:00` : m[2];
    return `${m[1]}T${time}-03:00`;
  }
  return s;
}

function cityUfFromText(text?: string | null) {
  if (!text) return null;
  const matches = String(text).match(
    /([A-Za-zÀ-ÿ.' -]+?)\s*\/\s*([A-Z]{2})\b/g
  );
  if (!matches?.length) return null;
  const last = matches[matches.length - 1].replace(/\s+/g, " ").trim();
  return last.replace(/\s*\/\s*/, "/");
}

function sortEventsNewestFirst(events: TrackingEvent[]) {
  return [...events].sort((a, b) => {
    const ta = Date.parse(a.date) || 0;
    const tb = Date.parse(b.date) || 0;
    return tb - ta;
  });
}

type SourceFn = (code: string) => Promise<TrackingEvent[] | null>;

async function trackViaRastreadorPacotes(
  code: string
): Promise<TrackingEvent[] | null> {
  const res = await fetch(
    `https://api.rastreadordepacotes.com.br/rastreio/${encodeURIComponent(code)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
      },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    tracking?: Array<{
      Posicoes?: Array<{
        Acao?: string | null;
        Data?: string | null;
        Detalhes?: string | null;
        DetalhesFormatado?: string | null;
        Local?: string | null;
        UF?: string | null;
      }>;
    }>;
  };

  const positions = data.tracking?.[0]?.Posicoes;
  if (!Array.isArray(positions) || positions.length === 0) return null;

  return sortEventsNewestFirst(
    positions.map((p) => {
      const details = String(p.DetalhesFormatado || p.Detalhes || "").replace(
        /\r/g,
        ""
      );
      return {
        date: brDateToIso(p.Data || ""),
        description: p.Acao || "Atualização",
        location:
          cityUfFromText(details) ||
          cityUfFromText(p.Local) ||
          p.UF ||
          null,
      };
    })
  );
}

type MelhorRastreioPayload = {
  data?: {
    result?: {
      lastStatus?: string | null;
      trackingEvents?: Array<{
        createdAt?: string | null;
        title?: string | null;
        description?: string | null;
        location?: {
          complement?: string | null;
          city?: string | null;
          state?: string | null;
        } | null;
      }>;
    } | null;
  };
  errors?: unknown;
};

async function trackViaMelhorRastreio(
  code: string
): Promise<TrackingEvent[] | null> {
  const res = await fetch("https://api.melhorrastreio.com.br/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": BROWSER_UA,
    },
    body: JSON.stringify({
      query: SEARCH_PARCEL_QUERY,
      variables: {
        tracker: { trackingCode: code, type: "correios" },
      },
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) return null;

  const json = (await res.json()) as MelhorRastreioPayload;
  const raw = json?.data?.result?.trackingEvents;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  return sortEventsNewestFirst(
    raw.map((ev) => ({
      date: ev.createdAt || "",
      description: ev.title || ev.description || "Atualização",
      location: formatLocation(ev.location),
    }))
  );
}

async function trackViaProxyapp(code: string): Promise<TrackingEvent[] | null> {
  const res = await fetch(
    `https://proxyapp.correios.com.br/v1/sro-rastro/${encodeURIComponent(code)}`,
    {
      headers: {
        Accept: "application/json",
        "User-Agent": BROWSER_UA,
        Origin: "https://rastreamento.correios.com.br",
        Referer: "https://rastreamento.correios.com.br/",
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }
  );
  if (!res.ok) return null;

  const data = (await res.json()) as {
    objetos?: Array<{
      eventos?: Array<{
        dtHrCriado?: string | { date?: string };
        descricao?: string;
        unidade?: {
          endereco?: { cidade?: string; uf?: string };
          tipo?: string;
        };
      }>;
    }>;
  };

  const raw = data.objetos?.[0]?.eventos;
  if (!Array.isArray(raw) || raw.length === 0) return null;

  return sortEventsNewestFirst(
    raw.map((ev) => {
      const rawDate =
        typeof ev.dtHrCriado === "string"
          ? ev.dtHrCriado
          : ev.dtHrCriado?.date || "";
      const city = ev.unidade?.endereco?.cidade;
      const uf = ev.unidade?.endereco?.uf;
      const location =
        [city, uf].filter(Boolean).join("/") || ev.unidade?.tipo || null;
      return {
        date: rawDate,
        description: ev.descricao || "Atualização",
        location,
      };
    })
  );
}

async function firstEvents(code: string, sources: SourceFn[]) {
  const results = await Promise.allSettled(sources.map((fn) => fn(code)));
  for (const result of results) {
    if (result.status === "fulfilled" && result.value?.length) {
      return result.value;
    }
  }
  return null;
}

/** Consulta eventos dos Correios para qualquer código (PAC/SEDEX, ME ou Manda Bem). */
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

  const events = await firstEvents(code, [
    trackViaRastreadorPacotes,
    trackViaMelhorRastreio,
    trackViaProxyapp,
  ]);

  if (events?.length) {
    return {
      code,
      carrier: "Correios",
      events,
      officialUrl,
      source: "correios",
    };
  }

  return {
    code,
    carrier: "Correios",
    events: [],
    officialUrl,
    source: "fallback",
    error: "Não foi possível consultar os Correios agora",
  };
}
