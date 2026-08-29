import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Database } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

export type MemoryFactRow = Database['public']['Tables']['memory_facts']['Row'];

export function useMemoryFacts() {
  return useQuery({
    queryKey: ['memory'],
    queryFn: async (): Promise<MemoryFactRow[]> => {
      const { data, error } = await supabase
        .from('memory_facts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useDeleteMemoryFact() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const { error } = await supabase.from('memory_facts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['memory'] });
    },
  });
}
