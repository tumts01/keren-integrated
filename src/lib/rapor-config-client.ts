export interface RaporConfigRow {
  key: string;
  value: string;
}

export async function getRaporConfigSingle(
  key: string
): Promise<{ data: RaporConfigRow | null; error: Error | null }> {
  try {
    const res = await fetch(`/api/rapor/config?key=${encodeURIComponent(key)}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || 'Gagal memuat konfigurasi') };
    }
    return { data: json.data || null, error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function getRaporConfigMany(
  keys: string[]
): Promise<{ data: RaporConfigRow[] | null; error: Error | null }> {
  try {
    const res = await fetch(`/api/rapor/config?keys=${encodeURIComponent(keys.join(','))}`, {
      cache: 'no-store',
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { data: null, error: new Error(json.error || 'Gagal memuat konfigurasi') };
    }
    return { data: Array.isArray(json.data) ? json.data : [], error: null };
  } catch (err: any) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function upsertRaporConfig(
  key: string,
  value: string
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch('/api/rapor/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { error: new Error(json.error || 'Gagal menyimpan konfigurasi') };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

export async function upsertRaporConfigMany(
  items: Array<{ key: string; value: string }>
): Promise<{ error: Error | null }> {
  try {
    const res = await fetch('/api/rapor/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    const json = await res.json();
    if (!res.ok || !json.success) {
      return { error: new Error(json.error || 'Gagal menyimpan konfigurasi') };
    }
    return { error: null };
  } catch (err: any) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}
