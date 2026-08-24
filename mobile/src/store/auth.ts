import { create } from "zustand";
import { api, setToken, getToken } from "@/src/api/client";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
};

type User = {
  id: string;
  email: string;
  name?: string | null;
  role: string;
};

type AuthState = {
  ready: boolean;
  token: string | null;
  user: User | null;
  customer: Customer | null;
  hydrate: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (payload: Record<string, string>) => Promise<void>;
};

export const useAuth = create<AuthState>((set, get) => ({
  ready: false,
  token: null,
  user: null,
  customer: null,

  hydrate: async () => {
    const token = await getToken();
    if (!token) {
      set({ ready: true, token: null, user: null, customer: null });
      return;
    }
    try {
      const me = await api<{
        user: User;
        customer: Customer;
      }>("/api/auth/mobile/me", { token });
      set({
        ready: true,
        token,
        user: me.user,
        customer: me.customer,
      });
    } catch {
      await setToken(null);
      set({ ready: true, token: null, user: null, customer: null });
    }
  },

  login: async (email, password) => {
    const data = await api<{
      token: string;
      user: User;
      customer: Customer;
    }>("/api/auth/mobile/login", {
      auth: false,
      body: { email, password },
    });
    await setToken(data.token);
    set({
      token: data.token,
      user: data.user,
      customer: data.customer,
    });
  },

  logout: async () => {
    await setToken(null);
    set({ token: null, user: null, customer: null });
  },

  register: async (payload) => {
    await api("/api/auth/register", { auth: false, body: payload });
    await get().login(payload.email, payload.password);
  },
}));
