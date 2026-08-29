import { useQuery } from '@tanstack/react-query';
import type { Language } from '@gan-eden/shared';
import { supabase } from '../../lib/supabase';

export type Meaning = { title: string; body: string };

export function useMeanings(language: Language) {
  return useQuery({
    queryKey: ['meanings', language],
    staleTime: 24 * 60 * 60 * 1000,
    queryFn: async (): Promise<Record<string, Meaning>> => {
      const { data, error } = await supabase.from('content_meanings').select('number_type,value,title,body').eq('language', language);
      if (error) throw error;
      const map: Record<string, Meaning> = {};
      for (const m of data) map[`${m.number_type}:${m.value}`] = { title: m.title, body: m.body };
      return map;
    },
  });
}
