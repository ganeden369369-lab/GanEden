import { useQuery } from '@tanstack/react-query';
import type { Database } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

export type MessageRow = Database['public']['Tables']['messages']['Row'];

export function useMessages(chatId: string | undefined) {
  return useQuery({
    queryKey: ['messages', chatId],
    enabled: !!chatId,
    queryFn: async (): Promise<MessageRow[]> => {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
}
