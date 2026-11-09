import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: rowsGuru, error: errGuru } = await supabase.from('data_guru').select('*');
    if (errGuru) throw errGuru;
    const { data: rowsUsers, error: errUsers } = await supabase.from('data_users').select('*');
    if (errUsers) throw errUsers;
    const { data: rowsJadwal, error: errJadwal } = await supabase.from('jadwal_mengajar').select('*');
    if (errJadwal) throw errJadwal;
    
    // Buat pemetaan foto dari tab Users berdasarkan Nama
    const userPhotos: Record<string, string> = {};
    (rowsUsers || []).forEach((u: any) => {
      const uNama = u.nama;
      const uFoto = u.metadata?.['Foto'] || u.metadata?.['foto'];
      if (uNama && uFoto) {
        userPhotos[uNama.trim().toLowerCase()] = uFoto;
      }
    });

    // Buat pemetaan status sertifikasi dari jadwal_mengajar
    const sertifikasiMap: Record<string, boolean> = {};
    (rowsJadwal || []).forEach((j: any) => {
      const jNama = j.metadata?.['namaGuru'];
      const keterangan = (j.metadata?.['keterangan'] || '').toLowerCase();
      if (jNama && keterangan.includes('sertifikasi')) {
        sertifikasiMap[jNama.trim().toLowerCase()] = true;
      }
    });

    // Helper untuk mengubah link gdrive menjadi raw image link
    const getImageUrl = (url: string) => {
      if (!url) return '';
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (url.includes('drive.google.com') && match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200-h200`;
      }
      return url;
    };

    // Urutkan rowsGuru berdasarkan metadata->urutan, jika belum ada gunakan id
    const sortedRowsGuru = [...(rowsGuru || [])].sort((a: any, b: any) => {
      const uA = a.metadata?.urutan !== undefined && a.metadata?.urutan !== null ? Number(a.metadata.urutan) : (a.id || 9999);
      const uB = b.metadata?.urutan !== undefined && b.metadata?.urutan !== null ? Number(b.metadata.urutan) : (b.id || 9999);
      if (uA !== uB) return uA - uB;
      return (a.id || 0) - (b.id || 0);
    });

    // Map data to array of objects
    const data = sortedRowsGuru.map((row, index) => {
      const nama = row.nama || '';
      const rawFoto = userPhotos[nama.trim().toLowerCase()] || '';
      const foto = getImageUrl(rawFoto);
      const isSertifikasi = sertifikasiMap[nama.trim().toLowerCase()] || false;
      const urutan = row.metadata?.urutan !== undefined && row.metadata?.urutan !== null ? Number(row.metadata.urutan) : (index + 1);

      return {
        id: row.id,
        dbId: row.id,
        urutan,
        nama,
        foto,
        isSertifikasi,
        status: (row.metadata?.['Status'] || '') || '',
        nip: row.nomor_induk || '',
        pegId: (row.metadata?.['PEG ID'] || '') || '',
        passEmisHijau: (row.metadata?.['Pass EMIS Hijau'] || '') || '',
        passEmisDev: (row.metadata?.['Pass EMIS DEV'] || '') || '',
        jenisKelamin: (row.metadata?.['Jenis Kelamin'] || '') || '',
        jabatan: (row.metadata?.['Jabatan'] || '') || '',
        tempatLahir: (row.metadata?.['Tempat Lahir'] || '') || '',
        tanggalLahir: (row.metadata?.['Tanggal Lahir'] || '') || '',
        nik: (row.metadata?.['NIK'] || '') || '',
        noHp: (row.metadata?.['No WA'] || '') || '',
        alamat: (row.metadata?.['Alamat'] || '') || '',
        tanggalSk: (row.metadata?.['Tanggal SK Awal'] || '') || '',
        email: (row.metadata?.['Email'] || '') || '',
        pendidikan: (row.metadata?.['Pendidikan'] || '') || ''
      };
    });

    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error: any) {
    console.error('Fetch Guru Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { order } = body; // Array of IDs in ordered sequence: [1, 5, 2, ...]

    if (!Array.isArray(order) || order.length === 0) {
      return NextResponse.json({ success: false, error: 'Format urutan tidak valid' }, { status: 400 });
    }

    // Ambil data guru yang ada untuk menjaga metadata lainnya
    const { data: rowsGuru, error: fetchErr } = await supabase.from('data_guru').select('id, metadata');
    if (fetchErr) throw fetchErr;

    const guruMap = new Map((rowsGuru || []).map(g => [g.id, g.metadata || {}]));

    // Update hanya yang urutannya berubah untuk performa maksimal
    const updatePromises = order.map((id: number, idx: number) => {
      const targetUrutan = idx + 1;
      const currentMeta = guruMap.get(id) || {};
      if (currentMeta.urutan === targetUrutan) {
        return Promise.resolve({ error: null });
      }
      const newMeta = { ...currentMeta, urutan: targetUrutan };
      return supabase.from('data_guru').update({ metadata: newMeta }).eq('id', id);
    });

    const results = await Promise.all(updatePromises);
    const failed = results.find(r => r.error);
    if (failed) {
      throw failed.error;
    }

    return NextResponse.json({ success: true, message: 'Urutan guru & staf berhasil disimpan' });
  } catch (error: any) {
    console.error('Update Guru Urutan Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan urutan guru' }, { status: 500 });
  }
}
