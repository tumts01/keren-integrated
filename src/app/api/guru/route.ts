import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Helper untuk mengubah link gdrive menjadi raw image link
const getImageUrl = (url: string) => {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (url.includes('drive.google.com') && match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w200-h200`;
  }
  return url;
};

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
      const rawFoto = row.metadata?.['Foto'] || row.metadata?.['foto'] || userPhotos[nama.trim().toLowerCase()] || '';
      const foto = getImageUrl(rawFoto);
      const isSertifikasi = sertifikasiMap[nama.trim().toLowerCase()] || false;
      const urutan = row.metadata?.urutan !== undefined && row.metadata?.urutan !== null ? Number(row.metadata.urutan) : (index + 1);

      return {
        id: row.id,
        dbId: row.id,
        urutan,
        nama,
        foto,
        rawFoto,
        isSertifikasi,
        status: (row.metadata?.['Status'] || '') || '',
        statusGuru: (row.metadata?.['Status Guru'] || '') || '',
        nip: row.nomor_induk || (row.metadata?.['Nomor Induk Pegawai'] || '') || '',
        pegId: (row.metadata?.['PEG ID'] || '') || '',
        nuptk: (row.metadata?.['NUPTK / PEG ID'] || row.metadata?.['NUPTK'] || '') || '',
        rfidUid: (row.metadata?.['RFID_UID'] || '') || '',
        domisili: (row.metadata?.['Domisili'] || '') || '',
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
        pendidikan: (row.metadata?.['Pendidikan'] || '') || '',
        rawMetadata: row.metadata || {}
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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, nama, nip, metadata } = body;

    const finalNama = (nama || metadata?.['Nama'] || '').trim();
    const finalNip = (nip || metadata?.['Nomor Induk Pegawai'] || '').trim();

    if (!finalNama) {
      return NextResponse.json({ success: false, error: 'Nama guru wajib diisi' }, { status: 400 });
    }

    if (id) {
      // UPDATE DATA GURU
      const { data: existingGuru, error: fetchErr } = await supabase
        .from('data_guru')
        .select('id, nama, nomor_induk, metadata')
        .eq('id', id)
        .single();

      if (fetchErr) throw fetchErr;

      const mergedMetadata = {
        ...(existingGuru?.metadata || {}),
        ...(metadata || {})
      };

      mergedMetadata['Nama'] = finalNama;
      mergedMetadata['Nomor Induk Pegawai'] = finalNip;

      const { error: updateErr } = await supabase
        .from('data_guru')
        .update({
          nama: finalNama,
          nomor_induk: finalNip,
          metadata: mergedMetadata
        })
        .eq('id', id);

      if (updateErr) throw updateErr;

      // Sinkronkan ke data_users jika ada record yang sesuai
      try {
        const oldNama = existingGuru?.nama ? existingGuru.nama.trim().toLowerCase() : '';
        if (oldNama) {
          const { data: matchedUsers } = await supabase.from('data_users').select('id, nama, metadata');
          const userToUpdate = (matchedUsers || []).find((u: any) => (u.nama || '').trim().toLowerCase() === oldNama);
          if (userToUpdate) {
            const userMeta = { ...(userToUpdate.metadata || {}) };
            if (mergedMetadata['Foto']) {
              userMeta['Foto'] = mergedMetadata['Foto'];
            }
            userMeta['Nama'] = finalNama;
            await supabase.from('data_users').update({
              nama: finalNama,
              metadata: userMeta
            }).eq('id', userToUpdate.id);
          }
        }
      } catch (syncErr) {
        console.warn('Gagal sinkronisasi data_users:', syncErr);
      }

      return NextResponse.json({ success: true, message: 'Data guru & staf berhasil diperbarui' });
    } else {
      // TAMBAH DATA GURU BARU
      const finalMetadata = { ...(metadata || {}) };
      finalMetadata['Nama'] = finalNama;
      finalMetadata['Nomor Induk Pegawai'] = finalNip;

      // Ambil urutan terakhir
      const { data: allGuru } = await supabase.from('data_guru').select('metadata');
      const maxUrutan = (allGuru || []).reduce((max: number, g: any) => {
        const u = Number(g.metadata?.urutan) || 0;
        return u > max ? u : max;
      }, 0);
      finalMetadata['urutan'] = maxUrutan + 1;

      const { data: newRow, error: insertErr } = await supabase
        .from('data_guru')
        .insert([{
          nama: finalNama,
          nomor_induk: finalNip,
          metadata: finalMetadata
        }])
        .select()
        .single();

      if (insertErr) throw insertErr;

      return NextResponse.json({ success: true, message: 'Data guru baru berhasil ditambahkan', data: newRow });
    }
  } catch (error: any) {
    console.error('Save Guru Error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan data guru' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    // Jika body berisi id tanpa urutan khusus, delegasikan ke POST
    if (body.id && !body.order) {
      return POST(new Request(req.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }));
    }

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
