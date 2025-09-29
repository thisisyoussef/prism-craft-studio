import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
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
      const { data } = await api.get('/profile');
      if (!data) return null;
      // Map server profile (camelCase) to existing ProfileRow (snake_case)
      const p = data as any;
      const mapped: ProfileRow = {
        id: p.id,
        user_id: p.userId,
        company_id: p.companyId ?? null,
        first_name: p.firstName ?? null,
        last_name: p.lastName ?? null,
        email: p.email ?? null,
        phone: p.phone ?? null,
        role: p.role,
        created_at: p.createdAt,
        updated_at: p.updatedAt,
      };
      return mapped;
    },
    staleTime: 60_000,
  });
}
