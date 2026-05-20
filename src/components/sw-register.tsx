"use client";

import { useEffect } from "react";

// Store the deferred install prompt globally so any component can use it
type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Window {
    __pwaInstallPrompt: BeforeInstallPromptEvent | null;
    __pwaInstallListeners: Array<(e: BeforeInstallPromptEvent) => void>;
  }
}

if (typeof window !== "undefined") {
  window.__pwaInstallPrompt = null;
  window.__pwaInstallListeners = window.__pwaInstallListeners ?? [];
}

/** Tell the SW to clear the badge and clear it in the browser too */
async function clearAppBadge() {
  try {
    if ("clearAppBadge" in navigator) {
      await (navigator as Navigator & { clearAppBadge: () => Promise<void> }).clearAppBadge();
    }
    const reg = await navigator.serviceWorker?.ready;
    reg?.active?.postMessage({ type: "CLEAR_BADGE" });
  } catch {
    // non-fatal
  }
}

export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          console.log("[SW] Registered:", reg.scope);
          // Clear badge as soon as app loads
          clearAppBadge();
        })
        .catch((err) => console.warn("[SW] Failed:", err));
    }

    // Clear badge when app comes back to foreground
    const handleVisibility = () => {
      if (document.visibilityState === "visible") clearAppBadge();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Also clear on window focus (e.g. alt-tab back)
    window.addEventListener("focus", clearAppBadge);

    // Capture install prompt — fires before Chrome shows its own UI
    const handler = (e: Event) => {
      e.preventDefault();
      const prompt = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = prompt;
      window.__pwaInstallListeners.forEach((fn) => fn(prompt));
    };
    window.addEventListener("beforeinstallprompt", handler);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", clearAppBadge);
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  return null;
}
