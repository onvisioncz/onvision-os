"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { ChatOverlay } from "./chat-overlay";

/* ── Context ─────────────────────────────────────────────────────────── */
interface ChatCtx {
  open: boolean;
  unread: number;
  toggle: () => void;
}

const ChatContext = createContext<ChatCtx>({ open: false, unread: 0, toggle: () => {} });

export function useChatContext() {
  return useContext(ChatContext);
}

/* ── Shell wraps the whole app layout ────────────────────────────────── */
export function ChatShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);

  const toggle = useCallback(() => setOpen(o => !o), []);
  const handleUnread = useCallback((n: number) => setUnread(n), []);

  return (
    <ChatContext.Provider value={{ open, unread, toggle }}>
      {children}
      <ChatOverlay
        open={open}
        onClose={() => setOpen(false)}
        onUnread={handleUnread}
      />
    </ChatContext.Provider>
  );
}
