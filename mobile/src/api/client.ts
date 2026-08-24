import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  (Constants.expoConfig?.extra?.apiUrl as string) ||
  "https://amajeste.com.br";

const TOKEN_KEY = "majeste_mobile_token";

export function getApiBase() {
  return API_URL.replace(/\/$/, "");
}

export async function getToken() {
  try {
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function setToken(token: string | null) {
  if (!token) {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    return;
  }
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export class ApiError extends Error {
  status: number;
  data: unknown;
  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.status = status;
    this.data = data;
  }
}

type RequestOpts = {
  method?: string;
  body?: unknown;
  auth?: boolean;
  token?: string | null;
};

export async function api<T = unknown>(
  path: string,
  opts: RequestOpts = {}
): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }
  const token = opts.token !== undefined ? opts.token : await getToken();
  if (opts.auth !== false && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${getApiBase()}${path}`, {
    method: opts.method || (opts.body !== undefined ? "POST" : "GET"),
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      (data as { error?: string })?.error || `Erro ${res.status}`,
      res.status,
      data
    );
  }
  return data as T;
}
