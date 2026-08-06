"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type MiniPlayerPayload = {
  urls: string[];
  currentUrl: string;
  title?: string;
  /** Tempo atual em segundos (continua de onde parou). */
  currentTime?: number;
};

type MiniPlayerContextValue = {
  session: MiniPlayerPayload | null;
  startMini: (payload: MiniPlayerPayload) => void;
  stopMini: () => void;
  updateCurrentUrl: (url: string) => void;
};

const MiniPlayerContext = createContext<MiniPlayerContextValue | null>(null);

export function LiveMiniPlayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<MiniPlayerPayload | null>(null);

  const startMini = useCallback((payload: MiniPlayerPayload) => {
    setSession(payload);
  }, []);

  const stopMini = useCallback(() => {
    setSession(null);
  }, []);

  const updateCurrentUrl = useCallback((url: string) => {
    setSession((prev) => (prev ? { ...prev, currentUrl: url, currentTime: 0 } : prev));
  }, []);

  const value = useMemo(
    () => ({ session, startMini, stopMini, updateCurrentUrl }),
    [session, startMini, stopMini, updateCurrentUrl]
  );

  return (
    <MiniPlayerContext.Provider value={value}>
      {children}
    </MiniPlayerContext.Provider>
  );
}

export function useLiveMiniPlayer() {
  const ctx = useContext(MiniPlayerContext);
  if (!ctx) {
    return {
      session: null as MiniPlayerPayload | null,
      startMini: (_p: MiniPlayerPayload) => {},
      stopMini: () => {},
      updateCurrentUrl: (_u: string) => {},
    };
  }
  return ctx;
}
