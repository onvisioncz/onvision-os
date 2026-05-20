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

export function SwRegister() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Register service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => console.log("[SW] Registered:", reg.scope))
        .catch((err) => console.warn("[SW] Failed:", err));
    }

    // Capture install prompt — fires before Chrome shows its own UI
    const handler = (e: Event) => {
      e.preventDefault(); // suppress Chrome's mini-infobar
      const prompt = e as BeforeInstallPromptEvent;
      window.__pwaInstallPrompt = prompt;
      // Notify any listeners (e.g. install button components)
      window.__pwaInstallListeners.forEach((fn) => fn(prompt));
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  return null;
}
