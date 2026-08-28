import { useQuery } from '@tanstack/react-query';
import type { Database } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

export type ChatRow = Database['public']['Tables']['chats']['Row'];

export function useChats() {
  return useQuery({
    queryKey: ['chats'],
    queryFn: async (): Promise<ChatRow[]> => {
      const { data, error } = await supabase
        .from('chats')
        .select('*')
        .eq('archived', false)
        .order('last_message_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}
