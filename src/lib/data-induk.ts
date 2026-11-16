import { supabase } from './supabase';

const PAGE_SIZE = 1000;
const MEMORY_TTL_MS = 60 * 1000; // 60 detik in-process cache (hindari Vercel Legacy/Runtime Data Cache read/write per 8KB)

let cachedRows: any[] | null = null;
let cachedAt = 0;
let inflightFetch: Promise<any[]> | null = null;

export function clearDataIndukMemoryCache() {
  cachedRows = null;
  cachedAt = 0;
}

export async function getCachedIndukChunk(pageIndex: number) {
  const { data, error } = await supabase
    .from('data_induk')
    .select('*')
    .range(pageIndex * 500, (pageIndex + 1) * 500 - 1);

  if (error) throw error;
  return data || [];
}

async function fetchAllDataIndukFresh(): Promise<any[]> {
  const allRows: any[] = [];
  let page = 0;

  while (page < 10) {
    const { data, error } = await supabase
      .from('data_induk')
      .select('*')
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    page++;
  }

  cachedRows = allRows;
  cachedAt = Date.now();
  return allRows;
}

export async function getAllCachedDataInduk(): Promise<any[]> {
  const now = Date.now();
  if (cachedRows && now - cachedAt < MEMORY_TTL_MS) {
    return cachedRows;
  }

  if (!inflightFetch) {
    inflightFetch = fetchAllDataIndukFresh().finally(() => {
      inflightFetch = null;
    });
  }

  return inflightFetch;
}
