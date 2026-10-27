import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');

    if (!kelas) {
      return NextResponse.json({ success: false, error: 'Parameter kelas diperlukan' }, { status: 400 });
    }

    const cleanKelas = kelas.trim().toUpperCase();
    const isMultiple = cleanKelas === 'ALL' || cleanKelas.includes(',');

    // 1. Ambil data kelas dari table data_kelas
    const { data: rowsKelas, error: errKelas } = await supabase
      .from('data_kelas')
      .select('*');

    if (errKelas) {
      console.error('Error fetch data_kelas:', errKelas);
      return NextResponse.json({ success: false, error: errKelas.message }, { status: 500 });
    }

    // 2. Ambil data guru & user untuk mendapatkan No WA, NIP, dan Foto
    const { data: rowsGuru } = await supabase.from('data_guru').select('nama, nomor_induk, metadata');
    const { data: rowsUsers } = await supabase.from('data_users').select('nama, metadata');

    // Helper normalisasi nama (hilangkan gelar dan karakter non-alphanumeric untuk perbandingan aman)
    const normalizeName = (name: string) => {
      return name
        .toLowerCase()
        .split(',')[0]
        .replace(/^(drs\.|dra\.|h\.|hj\.|kh\.)\s*/i, '')
        .replace(/[^a-z0-9]/g, '')
        .trim();
    };

    // Helper thumbnail foto Google Drive
    const getThumbUrl = (url: string) => {
      if (!url) return '';
      const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
      if (url.includes('drive.google.com') && match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400-h400`;
      }
      return url;
    };

    const extractWaliInfo = (k: any, rombelKey: string) => {
      const namaWaliRaw = (k.wali_kelas || k.metadata?.['WALI KELAS'] || '').trim();
      if (!namaWaliRaw) {
        return {
          rombel: rombelKey,
          nama: 'Belum ditentukan',
          noWa: '',
          cleanWa: '',
          foto: '',
          nip: '',
          email: ''
        };
      }

      const targetKey = normalizeName(namaWaliRaw);
      const matchedGuru = (rowsGuru || []).find((g: any) => {
        const gNama = g.nama || '';
        return normalizeName(gNama) === targetKey || (namaWaliRaw && gNama.toLowerCase().includes(namaWaliRaw.toLowerCase().split(',')[0].trim()));
      });

      const matchedUser = (rowsUsers || []).find((u: any) => {
        const uNama = u.nama || '';
        return normalizeName(uNama) === targetKey || (namaWaliRaw && uNama.toLowerCase().includes(namaWaliRaw.toLowerCase().split(',')[0].trim()));
      });

      const rawFoto = matchedUser?.metadata?.['Foto'] || matchedUser?.metadata?.['foto'] || matchedGuru?.metadata?.['Foto'] || '';
      const noWaRaw = matchedGuru?.metadata?.['No WA'] || matchedGuru?.metadata?.['no_wa'] || matchedGuru?.metadata?.['NO WA'] || '';

      let cleanWa = String(noWaRaw || '').replace(/[^0-9]/g, '');
      if (cleanWa.startsWith('0')) {
        cleanWa = '62' + cleanWa.substring(1);
      }

      return {
        rombel: rombelKey,
        nama: namaWaliRaw,
        nip: matchedGuru?.nomor_induk || matchedGuru?.metadata?.['Nomor Induk Pegawai'] || '',
        noWa: noWaRaw,
        cleanWa: cleanWa,
        foto: getThumbUrl(rawFoto),
        email: matchedGuru?.metadata?.['Email'] || ''
      };
    };

    // Mode Multiple / All
    if (isMultiple) {
      const targetList = cleanKelas === 'ALL'
        ? []
        : cleanKelas.split(',').map((c: string) => c.trim().toUpperCase()).filter(Boolean);

      const waliMap: Record<string, any> = {};

      (rowsKelas || []).forEach((k: any) => {
        const rombel = (k.rombel || k.metadata?.['ROMBEL'] || '').trim().toUpperCase();
        if (!rombel) return;
        if (targetList.length > 0 && !targetList.includes(rombel) && !targetList.includes(rombel.replace(/[^A-Z0-9]/g, ''))) {
          return;
        }
        waliMap[rombel] = extractWaliInfo(k, rombel);
      });

      return NextResponse.json({
        success: true,
        data: waliMap
      }, {
        headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
      });
    }

    // Mode Single Class
    const matchedKelas = (rowsKelas || []).find((k: any) => {
      const rombel = (k.rombel || k.metadata?.['ROMBEL'] || '').trim().toUpperCase();
      return rombel === cleanKelas;
    });

    if (!matchedKelas) {
      return NextResponse.json({ success: true, data: null, message: 'Kelas tidak ditemukan' });
    }

    const waliInfo = extractWaliInfo(matchedKelas, cleanKelas);

    return NextResponse.json({
      success: true,
      data: waliInfo
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('API Portal Wali Kelas Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
