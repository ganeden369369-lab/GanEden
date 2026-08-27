import { useQuery } from '@tanstack/react-query';
import type { Database } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

export function useProfile(userId?: string) {
  return useQuery({
    queryKey: ['profile', userId],
    enabled: !!userId,
    queryFn: async (): Promise<ProfileRow | null> => {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId!).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
