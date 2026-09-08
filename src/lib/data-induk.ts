import { unstable_cache } from 'next/cache';
import { supabase } from './supabase';

const PAGE_SIZE = 500;

export const getCachedIndukChunk = unstable_cache(
  async (pageIndex: number) => {
    const { data, error } = await supabase
      .from('data_induk')
      .select('*')
      .range(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE - 1);
    
    if (error) throw error;
    return data || [];
  },
  ['data_induk_chunk'],
  { revalidate: 3600, tags: ['data_induk'] }
);

export async function getAllCachedDataInduk() {
  const chunks = [0, 1, 2, 3, 4, 5, 6, 7]; // Up to 4000 rows
  const results = await Promise.all(chunks.map(p => getCachedIndukChunk(p)));
  return results.flat();
}
