import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data: rowsGuru, error: errGuru } = await supabase.from('data_guru').select('*');
    if (errGuru) throw errGuru;
    const { data: rowsUsers, error: errUsers } = await supabase.from('data_users').select('*');
    if (errUsers) throw errUsers;
    
    // Buat pemetaan foto dari tab Users berdasarkan Nama
    const userPhotos: Record<string, string> = {};
    (rowsUsers || []).forEach((u: any) => {
      const uNama = u.nama;
      const uFoto = u.metadata?.['Foto'] || u.metadata?.['foto'];
      if (uNama && uFoto) {
        userPhotos[uNama.trim().toLowerCase()] = uFoto;
      }
    });

    // Helper untuk mengubah link gdrive menjadi raw image link
    const getImageUrl = (url: string) => {
      if (!url) return '';
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (url.includes('drive.google.com') && match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}=w200-h200`;
      }
      return url;
    };

    // Map data to array of objects
    const data = (rowsGuru || []).map((row, index) => {
      const nama = row.nama || '';
      const rawFoto = userPhotos[nama.trim().toLowerCase()] || '';
      const foto = getImageUrl(rawFoto);

      return {
        id: index,
        nama,
        foto,
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
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });
  } catch (error: any) {
    console.error('Fetch Guru Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data dari Database' }, { status: 500 });
  }
}