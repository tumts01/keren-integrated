import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const promises = [
      supabase.from('data_surat_keluar').select('*').order('id', { ascending: true }),
      supabase.from('data_surat_masuk').select('*').order('id', { ascending: false }),
      supabase.from('data_kode_surat').select('*').order('id', { ascending: true }),
      supabase.from('data_riwayat_cetak_surat').select('*').order('id', { ascending: false })
    ];

    const [keluarRes, masukRes, kodeRes, riwayatRes] = await Promise.all(promises);

    if (keluarRes.error) throw keluarRes.error;
    if (masukRes.error) throw masukRes.error;
    if (kodeRes.error) throw kodeRes.error;
    if (riwayatRes.error) throw riwayatRes.error;

    const dataKeluar = (keluarRes.data || []).map((row: any) => {
      const meta = row.metadata || {};
      return {
        id: row.id,
        rowNumber: row.id, // Fallback for frontend
        no: meta['NO'] || '',
        tanggal: meta['TANGGAL'] || '',
        namaSurat: meta['NAMA SURAT'] || '',
        yangDitugaskan: meta['yang Ditugaskan'] || meta['YANG DITUGASKAN'] || meta['NAMA KORBAN'] || '',
        topik: meta['TOPIK'] || '',
        pj: meta['PJ'] || '',
        noSurat: meta['NO. SURAT'] || '',
        batasWaktu: meta['BATAS WAKTU TUGAS'] || '',
        fileScan: (() => {
          const val = meta['FILE/SCAN SURAT'] || '';
          if (val.toLowerCase().includes('klik disini') || !val.includes('http')) {
            return '';
          }
          return val;
        })(),
      };
    }).filter((item: any) => item.noSurat || item.namaSurat);

    const dataMasuk = (masukRes.data || []).map((row: any) => {
      const meta = row.metadata || {};
      // Handle various header variations from the legacy Google Sheet
      const headerTanggal = Object.keys(meta).find(h => h.includes('TANGGAL') || h.includes('TGL')) || 'TANGGAL';
      const headerNamaSurat = Object.keys(meta).find(h => h.includes('NAMA SURAT') || h.includes('PERIHAL')) || 'NAMA SURAT';
      const headerPengirim = Object.keys(meta).find(h => h.includes('INSTANSI') || h.includes('ASAL') || h.includes('PENGIRIM')) || 'NAMA INSTANSI';
      const headerFile = Object.keys(meta).find(h => h.includes('FILE') || h.includes('SCAN')) || 'FILE SURAT';

      return {
        id: row.id,
        rowNumber: row.id,
        tanggal: meta[headerTanggal] || '',
        namaSurat: meta[headerNamaSurat] || '',
        pengirim: meta[headerPengirim] || '',
        fileScan: (() => {
          const val = meta[headerFile] || '';
          if (val.toLowerCase().includes('klik disini') || !val.includes('http')) {
            return '';
          }
          return val;
        })()
      };
    }).filter((item: any) => item.namaSurat || item.pengirim || item.fileScan);

    const listTopik = (kodeRes.data || []).map((row: any) => row.topik?.trim()).filter(Boolean);

    const riwayatCetak = (riwayatRes.data || []).map((row: any) => {
      const parsed = row.data_json;
      return parsed.payload ? parsed.payload : parsed;
    });

    const instansiList = Array.from(new Set(dataMasuk.map((item: any) => item.pengirim).filter(Boolean))).sort();

    return NextResponse.json({ 
      success: true, 
      suratKeluar: dataKeluar,
      suratMasuk: dataMasuk,
      topikList: listTopik,
      instansiList,
      riwayatCetak,
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    console.error('API Persuratan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data dari Supabase: ' + error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { action, noSurat, ...data } = payload;

    if (action === 'delete') {
      const targetId = payload.id || payload.rowNumber;
      if (!targetId) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });
      
      const { error } = await supabase.from('data_surat_keluar').delete().eq('id', targetId);
      if (error) throw error;
      
      return NextResponse.json({ success: true });
    }

    if (action === 'generate' || action === 'generate_no_surat') {
      const reqData = data.payload || data;
      const { topik } = reqData;
      
      // Ambil kode surat
      const { data: kodeRows, error: kodeErr } = await supabase.from('data_kode_surat').select('*').eq('topik', topik).single();
      if (kodeErr || !kodeRows) {
        return NextResponse.json({ success: false, error: `Kode surat tidak ditemukan untuk topik: ${topik}` }, { status: 400 });
      }
      const kodeTopik = kodeRows.kode;

      // Cari nomor surat terakhir (NO max)
      const { data: allSurat } = await supabase.from('data_surat_keluar').select('metadata');
      let maxNo = 0;
      allSurat?.forEach(s => {
        const currentNo = parseInt(s.metadata?.['NO'], 10);
        if (!isNaN(currentNo) && currentNo > maxNo) {
          maxNo = currentNo;
        }
      });
      const nextNo = maxNo + 1;
      const formattedNo = String(nextNo).padStart(3, '0');

      const dateObj = reqData.tanggal ? new Date(reqData.tanggal) : new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const monthRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][dateObj.getMonth()];
      const year = dateObj.getFullYear();

      // Format resmi: 000/YPA/MTs-01.KODE/BULAN/TAHUN
      const newNoSurat = `${formattedNo}/YPA/MTs-01.${kodeTopik}/${monthRoman}/${year}`;

      const { data: inserted, error: insertErr } = await supabase.from('data_surat_keluar').insert([{
        metadata: {
          'NO': nextNo,
          'TANGGAL': reqData.tanggal,
          'NAMA SURAT': reqData.namaSurat,
          'yang Ditugaskan': reqData.yangDitugaskan,
          'TOPIK': topik,
          'PJ': reqData.pj,
          'BATAS WAKTU TUGAS': reqData.batasWaktu,
          'NO. SURAT': newNoSurat,
          'FILE/SCAN SURAT': ''
        }
      }]).select().single();

      if (insertErr) throw insertErr;

      return NextResponse.json({ success: true, newRowNumber: inserted.id, noSurat: newNoSurat });
    }

    if (action === 'edit') {
      const targetId = payload.id || payload.rowNumber;
      if (!targetId) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });

      const reqData = data.payload || data;

      const { data: existing, error: getErr } = await supabase.from('data_surat_keluar').select('*').eq('id', targetId).single();
      if (getErr || !existing) return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });

      const newMeta = {
        ...existing.metadata,
        'NAMA SURAT': reqData.namaSurat,
        'yang Ditugaskan': reqData.yangDitugaskan,
        'TOPIK': reqData.topik,
        'PJ': reqData.pj,
        'BATAS WAKTU TUGAS': reqData.batasWaktu,
      };

      const { error: updateErr } = await supabase.from('data_surat_keluar').update({ metadata: newMeta }).eq('id', targetId);
      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true });
    }

    if (action === 'upload_scan') {
      const targetId = payload.id || payload.rowNumber;
      if (!targetId) return NextResponse.json({ success: false, error: 'ID tidak valid' }, { status: 400 });

      const { data: existing, error: getErr } = await supabase.from('data_surat_keluar').select('*').eq('id', targetId).single();
      if (getErr || !existing) return NextResponse.json({ success: false, error: 'Surat tidak ditemukan' }, { status: 404 });

      const newMeta = {
        ...existing.metadata,
        'FILE/SCAN SURAT': data.fileScan
      };

      const { error: updateErr } = await supabase.from('data_surat_keluar').update({ metadata: newMeta }).eq('id', targetId);
      if (updateErr) throw updateErr;

      return NextResponse.json({ success: true });
    }

    if (action === 'save_riwayat') {
      const { error } = await supabase.from('data_riwayat_cetak_surat').insert([{ data_json: data.payload }]);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Aksi tidak valid' }, { status: 400 });

  } catch (error: any) {
    console.error('POST Persuratan Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses data: ' + error.message }, { status: 500 });
  }
}
