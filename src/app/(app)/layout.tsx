import { SidebarNav, MobileNav } from "@/components/layout/sidebar-nav";
import { TopBar } from "@/components/layout/top-bar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-[#0B0B0B]">
      <SidebarNav />
      <div className="flex-1 flex flex-col overflow-y-auto pb-20 md:pb-0">
        <TopBar />
        <main className="flex-1">
          {children}
        </main>
      </div>
      <MobileNav />
    </div>
  );
}
