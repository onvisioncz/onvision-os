"use client";

import { useState, useCallback, createContext, useContext } from "react";
import { ChatOverlay } from "./chat-overlay";
import { AiOverlay } from "@/components/ai/ai-overlay";

/* ── Context ─────────────────────────────────────────────────────────── */
interface ChatCtx {
  open: boolean;
  unread: number;
  toggle: () => void;
  aiOpen: boolean;
  toggleAi: () => void;
}

const ChatContext = createContext<ChatCtx>({
  open: false, unread: 0, toggle: () => {},
  aiOpen: false, toggleAi: () => {},
});

export function useChatContext() {
  return useContext(ChatContext);
}

/* ── Shell wraps the whole app layout ────────────────────────────────── */
export function ChatShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);

  const toggle = useCallback(() => setOpen(o => !o), []);
  const handleUnread = useCallback((n: number) => setUnread(n), []);
  const toggleAi = useCallback(() => setAiOpen(o => !o), []);

  return (
    <ChatContext.Provider value={{ open, unread, toggle, aiOpen, toggleAi }}>
      {children}
      <ChatOverlay
        open={open}
        onClose={() => setOpen(false)}
        onUnread={handleUnread}
      />
      <AiOverlay
        open={aiOpen}
        onClose={() => setAiOpen(false)}
      />
    </ChatContext.Provider>
  );
}
