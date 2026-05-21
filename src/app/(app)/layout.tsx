import { SidebarNav, MobileNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";
import { ChatShell } from "@/components/chat/chat-shell";
import { NotifBanner } from "@/components/notif-banner";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ChatShell>
      <div className="flex min-h-screen bg-[#0B0B0B]">
        <SidebarNav />
        <div className="flex-1 flex flex-col overflow-y-auto pb-[calc(72px+env(safe-area-inset-bottom,0px))] md:pb-0">
          <TopBar />
          <main className="flex-1">
            {children}
          </main>
        </div>
        <MobileNav />
        <NotifBanner />
      </div>
    </ChatShell>
  );
}
