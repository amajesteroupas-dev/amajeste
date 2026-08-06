"use client";

import {
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { Download, MonitorSmartphone, X } from "lucide-react";

const DISMISS_KEY = "majeste-admin-pwa-dismissed";
const MANIFEST_HREF = "/admin.webmanifest?v=2";
const APPLE_ICON_HREF = "/admin-apple-touch-icon.png?v=2";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

type Platform = "ios" | "android" | "desktop";

function isStandalone() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const ios = Boolean(
    (window.navigator as Navigator & { standalone?: boolean }).standalone
  );
  return mq || ios;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent || "";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  if (/android/i.test(ua)) return "android";
  return "desktop";
}

async function ensureServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    await navigator.serviceWorker.register("/sw.js", { scope: "/" });
  } catch {
    /* ignore */
  }
}

function usePwaInstallState() {
  const [standalone, setStandalone] = useState(true);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [platform, setPlatform] = useState<Platform>("desktop");
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    setStandalone(isStandalone());
    setPlatform(detectPlatform());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setStandalone(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const runInstall = useCallback(async () => {
    if (deferred) {
      await deferred.prompt();
      await deferred.userChoice;
      setDeferred(null);
      return;
    }
    setShowHelp(true);
  }, [deferred]);

  return {
    standalone,
    deferred,
    platform,
    showHelp,
    setShowHelp,
    runInstall,
  };
}

/**
 * Garante que só o PWA do painel exista no <head> (iOS lê o primeiro
 * manifest/ícone — se a loja ficar junto, instala a loja).
 */
export function AdminPwaBootstrap({ children }: { children: ReactNode }) {
  useEffect(() => {
    document
      .querySelectorAll('link[rel="manifest"]')
      .forEach((el) => el.remove());
    const manifest = document.createElement("link");
    manifest.rel = "manifest";
    manifest.href = MANIFEST_HREF;
    document.head.appendChild(manifest);

    document
      .querySelectorAll('link[rel="apple-touch-icon"]')
      .forEach((el) => el.remove());
    const apple = document.createElement("link");
    apple.rel = "apple-touch-icon";
    apple.setAttribute("sizes", "180x180");
    apple.href = APPLE_ICON_HREF;
    document.head.appendChild(apple);

    const ensureMeta = (name: string, content: string) => {
      let el = document.querySelector(
        `meta[name="${name}"]`
      ) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.name = name;
        document.head.appendChild(el);
      }
      el.content = content;
    };
    ensureMeta("apple-mobile-web-app-capable", "yes");
    ensureMeta("apple-mobile-web-app-title", "Painel Majesté");
    ensureMeta("application-name", "Painel Majesté");
    ensureMeta("mobile-web-app-capable", "yes");

    if (!document.title.toLowerCase().includes("painel")) {
      document.title = "Painel Majesté";
    }

    void ensureServiceWorker();
  }, []);

  return <>{children}</>;
}

/** Aviso na primeira visita (pode fechar; o botão do menu continua). */
export function AdminPwaInstallBanner() {
  const { standalone, deferred, platform, showHelp, setShowHelp, runInstall } =
    usePwaInstallState();
  const [dismissed, setDismissed] = useState(true);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      setDismissed(false);
    }
  }, []);

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  if (standalone || dismissed) {
    return showHelp ? (
      <AdminPwaHelpModal platform={platform} onClose={() => setShowHelp(false)} />
    ) : null;
  }

  return (
    <>
      <div className="admin-pwa-banner" role="status">
        <div className="admin-pwa-banner-copy">
          <MonitorSmartphone size={20} strokeWidth={1.75} aria-hidden />
          <div>
            <p className="admin-pwa-banner-title">
              Instalar o painel neste aparelho
            </p>
            <p className="admin-pwa-banner-sub">
              Use como app no computador, iPhone ou Android — atalho na tela
              inicial, sem loja de aplicativos.
            </p>
          </div>
        </div>
        <div className="admin-pwa-banner-actions">
          <button
            type="button"
            className="admin-pwa-btn"
            disabled={installing}
            onClick={() => {
              setInstalling(true);
              void runInstall().finally(() => setInstalling(false));
            }}
          >
            <Download size={15} strokeWidth={2} />
            {deferred ? "Instalar agora" : "Como instalar"}
          </button>
          <button
            type="button"
            className="admin-pwa-dismiss"
            onClick={dismiss}
            aria-label="Fechar aviso"
          >
            <X size={16} />
          </button>
        </div>
      </div>
      {showHelp ? (
        <AdminPwaHelpModal
          platform={platform}
          onClose={() => setShowHelp(false)}
        />
      ) : null}
    </>
  );
}

/** Opção permanente no rodapé do menu. */
export function AdminPwaInstallButton() {
  const { standalone, deferred, platform, showHelp, setShowHelp, runInstall } =
    usePwaInstallState();

  if (standalone) return null;

  return (
    <>
      <button
        type="button"
        className="admin-nav-store admin-pwa-sidebar-btn"
        onClick={() => void runInstall()}
      >
        <Download size={16} strokeWidth={1.75} />
        <span>{deferred ? "Instalar painel" : "Instalar painel"}</span>
      </button>
      {showHelp ? (
        <AdminPwaHelpModal
          platform={platform}
          onClose={() => setShowHelp(false)}
        />
      ) : null}
    </>
  );
}

function AdminPwaHelpModal({
  platform,
  onClose,
}: {
  platform: Platform;
  onClose: () => void;
}) {
  return (
    <div
      className="admin-pwa-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-pwa-help-title"
    >
      <div className="admin-pwa-modal">
        <div className="admin-pwa-modal-head">
          <h2 id="admin-pwa-help-title">Instalar o painel Majesté</h2>
          <button type="button" onClick={onClose} aria-label="Fechar">
            <X size={18} />
          </button>
        </div>

        {platform === "ios" ? (
          <ol className="admin-pwa-steps">
            <li>
              Use o <strong>Safari</strong> (não o Chrome) e fique em uma página
              do <strong>/admin</strong> (login ou painel).
            </li>
            <li>
              Se já existir um ícone “Majesté” que abre a <em>loja</em>, apague
              esse atalho antes (segure → Remover app).
            </li>
            <li>
              Toque em <strong>Compartilhar</strong> →{" "}
              <strong>Adicionar à Tela de Início</strong>.
            </li>
            <li>
              O nome deve ser <strong>Painel Majesté</strong> e o ícone com
              selo <strong>ADMIN</strong> — confirme.
            </li>
          </ol>
        ) : platform === "android" ? (
          <ol className="admin-pwa-steps">
            <li>No Chrome, toque no menu ⋮ (três pontos).</li>
            <li>
              Toque em <strong>Instalar app</strong> ou{" "}
              <strong>Adicionar à tela inicial</strong>.
            </li>
            <li>Confirme — o ícone “Painel” aparece na home.</li>
          </ol>
        ) : (
          <ol className="admin-pwa-steps">
            <li>
              No Chrome ou Edge, use o ícone de instalação na barra de endereço.
            </li>
            <li>
              Ou abra o menu ⋮ → <strong>Instalar Majesté Painel…</strong>
            </li>
            <li>
              Se ainda não aparecer, recarregue a página e aguarde alguns
              segundos.
            </li>
          </ol>
        )}

        <p className="admin-pwa-note">
          O atalho abre direto em <code>/admin</code>. Você pode ver estas
          instruções de novo pelo botão <strong>Instalar painel</strong> no
          menu.
        </p>

        <button type="button" className="admin-pwa-btn" onClick={onClose}>
          Entendi
        </button>
      </div>
    </div>
  );
}
