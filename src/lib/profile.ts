import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/lib/store";

export type AppRole = "admin" | "moderator" | "user";

export interface ProfileRow {
  id: string;
  user_id: string;
  company_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  role: AppRole;
  created_at: string;
  updated_at: string;
}

export function useProfile() {
  const { user } = useAuthStore();
  const uid = user?.id || null;

  return useQuery({
    queryKey: ["profile", uid],
    enabled: !!uid,
    queryFn: async (): Promise<ProfileRow | null> => {
      if (!uid) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, company_id, first_name, last_name, email, phone, role, created_at, updated_at")
        .eq("id", uid)
        .maybeSingle();
      if (error) throw error;
      return data as ProfileRow | null;
    },
    staleTime: 60_000,
  });
}
