"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { canAccess, extraRoutesForEmail } from "@/lib/roles";

/**
 * Vynucení přístupu na stránky podle rolí. Menu sice nepovolené položky skrývá,
 * ale bez tohohle by šla stránka otevřít napřímo přes URL. Data jsou sice
 * chráněná i serverově (RLS + /api/sync), tohle je správné UX + obrana navíc:
 * když uživatel nemá na cestu právo, přesměruje ho na jeho úvod (/dnes).
 */
export function RouteGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useUserRole();
  const pathname = usePathname();
  const router = useRouter();

  // Uživatel mimo roster (bez rolí) neblokujeme zde — data stejně nedostane.
  const extras = user ? [...(user.extraRoutes ?? []), ...extraRoutesForEmail(user.email)] : [];
  const allowed = !user || canAccess(user.roles, pathname, extras);

  useEffect(() => {
    if (loading || !user) return;
    if (!allowed) router.replace("/dnes");
  }, [loading, user, allowed, router]);

  if (!loading && user && !allowed) {
    return (
      <div className="p-8 text-[14px] text-[--muted-foreground]">
        Na tuto sekci nemáš oprávnění. Přesměrovávám…
      </div>
    );
  }
  return <>{children}</>;
}
