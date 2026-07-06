"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface NotifEvent {
  id: string;
  type: "task_assigned" | "output_uploaded";
  title: string;
  body: string;
  url: string;
  createdAt: string;
  targetEmail: string | null;
}

const LS_KEY = "ov-notif-last-seen";

export function NotifBanner() {
  const [newEvents, setNewEvents] = useState<NotifEvent[]>([]);
  const [visible, setVisible] = useState(false);
  const checked = useRef(false);

  useEffect(() => {
    // Run only once per app session mount
    if (checked.current) return;
    checked.current = true;

    async function check() {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user?.email) return;
        const email = user.email;

        const lastSeen = localStorage.getItem(LS_KEY);

        // Mark "seen" now — next app open will count from this moment
        localStorage.setItem(LS_KEY, new Date().toISOString());

        // First-ever visit: no baseline, skip showing anything
        if (!lastSeen) return;

        const res = await fetch("/api/sync?key=ov-notif-events");
        const { value } = await res.json();
        if (!Array.isArray(value)) return;

        const all: NotifEvent[] = value;
        const since = new Date(lastSeen);

        const fresh = all.filter((ev) => {
          // Only show if it targets this user or is a broadcast
          if (ev.targetEmail !== null && ev.targetEmail !== email) return false;
          return new Date(ev.createdAt) > since;
        });

        if (fresh.length > 0) {
          setNewEvents(fresh);
          setVisible(true);
        }
      } catch {
        // Non-fatal — silently skip
      }
    }

    // Small delay so the page has time to hydrate before showing the banner
    const t = setTimeout(check, 800);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => setVisible(false);
  const count = newEvents.length;
  const newest = newEvents[count - 1];

  return (
    <AnimatePresence>
      {visible && newest && (
        <motion.div
          key="notif-banner"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: "fixed",
            top: "max(env(safe-area-inset-top, 0px) + 12px, 16px)",
            left: 0,
            right: 0,
            marginLeft: "auto",
            marginRight: "auto",
            width: "min(90vw, 420px)",
            zIndex: 9999,
            background: "oklch(0.11 0.02 265)",
            border: "1px solid oklch(0.62 0.27 265 / 0.40)",
            borderRadius: 14,
            padding: "12px 14px",
            boxShadow:
              "0 12px 40px oklch(0 0 0 / 0.55), 0 0 0 1px oklch(0.62 0.27 265 / 0.10), 0 0 28px oklch(0.62 0.27 265 / 0.06)",
            fontFamily: "var(--font-jakarta)",
            display: "flex",
            alignItems: "flex-start",
            gap: 10,
          }}
        >
          {/* Bell icon block */}
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 9,
              flexShrink: 0,
              background: "oklch(0.62 0.27 265 / 0.10)",
              border: "1px solid oklch(0.62 0.27 265 / 0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: 1,
            }}
          >
            <Bell
              style={{
                width: 14,
                height: 14,
                color: "oklch(0.80 0.20 265)",
              }}
            />
          </div>

          {/* Text content */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {count > 1 && (
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.10em",
                  textTransform: "uppercase",
                  color: "oklch(0.70 0.22 265)",
                  marginBottom: 3,
                }}
              >
                {count} nová upozornění
              </div>
            )}
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: "oklch(0.93 0.005 222)",
                lineHeight: 1.3,
                marginBottom: 2,
              }}
            >
              {newest.title}
            </div>
            <div
              style={{
                fontSize: 12,
                color: "oklch(0.52 0.005 222)",
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {newest.body}
            </div>
            <Link
              href={newest.url}
              onClick={dismiss}
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "oklch(0.80 0.20 265)",
                marginTop: 6,
                display: "inline-block",
                letterSpacing: "0.03em",
                textDecoration: "none",
              }}
            >
              Zobrazit →
            </Link>
          </div>

          {/* Dismiss button */}
          <button
            onClick={dismiss}
            aria-label="Zavřít upozornění"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "oklch(0.38 0.005 222)",
              padding: 0,
              width: 32,
              height: 32,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginTop: -6,
              marginRight: -8,
            }}
          >
            <X style={{ width: 15, height: 15 }} />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
