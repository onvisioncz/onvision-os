"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { UserConfig, DEFAULT_USERS } from "@/lib/roles";

export interface UseUserRoleReturn {
  user: UserConfig | null;
  email: string | null;
  loading: boolean;
}

/**
 * Returns the current authenticated user's UserConfig (roles, clients, etc.)
 * Reads from Supabase key "ov-user-roles" (array of UserConfig), falls back to DEFAULT_USERS.
 */
export function useUserRole(): UseUserRoleReturn {
  const [email, setEmail] = useState<string | null>(null);
  const [user, setUser] = useState<UserConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const supabase = createClient();
      const { data: authData } = await supabase.auth.getUser();
      const currentEmail = authData.user?.email ?? null;

      if (cancelled) return;
      setEmail(currentEmail);

      if (!currentEmail) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Try to fetch custom role overrides from Supabase
      try {
        const res = await fetch(`/api/sync?key=ov-user-roles`);
        const { value } = await res.json();
        const users: UserConfig[] = Array.isArray(value) ? value : DEFAULT_USERS;
        const found = users.find(
          (u) => u.email.toLowerCase() === currentEmail.toLowerCase()
        );
        if (!cancelled) {
          setUser(found ?? null);
          setLoading(false);
        }
      } catch {
        // Fallback to hardcoded defaults
        const found = DEFAULT_USERS.find(
          (u) => u.email.toLowerCase() === currentEmail.toLowerCase()
        );
        if (!cancelled) {
          setUser(found ?? null);
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, []);

  return { user, email, loading };
}
