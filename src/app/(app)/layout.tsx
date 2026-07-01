import { SidebarNav, MobileNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
import { ChatShell } from "@/components/chat/chat-shell";
import { NotifBanner } from "@/components/notif-banner";
import { VystupyFab } from "@/components/layout/vystup-fab";
import { CommandPalette } from "@/components/command-palette";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatShell>
      {/* Nebula gradient background — fixed behind everything */}
      <div className="ov-nebula" aria-hidden="true" />

      <div className="relative z-10 flex min-h-screen" style={{ background: "transparent" }}>
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom,0px))] md:pb-0">
          <TopBar />
          <main className="flex-1">
            {children}
          </main>
        </div>
        <MobileNav />
        <NotifBanner />
        <VystupyFab />
      </div>
      <CommandPalette />
    </ChatShell>
  );
}
