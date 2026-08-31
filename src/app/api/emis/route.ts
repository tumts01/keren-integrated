import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tahunAjaranFilter = searchParams.get('tahunAjaran') || '';

    // Mengambil data induk (pengganti DATABASE tab)
    const pageSize = 1000;
    const pages = [0, 1, 2, 3];
    const results = await Promise.all(
      pages.map(page => 
        supabase
          .from('data_induk')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)
      )
    );
    
    for (const res of results) {
      if (res.error) throw res.error;
    }
    const sbRows = results.flatMap(r => r.data || []);

    type SiswaRecord = {
      nisn: string; nis: string; nama: string; status: string;
      kelas: string; tahunAjaran: string; isLatest: boolean;
    };

    const allRecords: SiswaRecord[] = sbRows.flatMap((row: any) => {
      const getVal = (key: string) => {
        if (key === 'ID SISWA') return row.id_siswa || '';
        if (key === 'NAMA') return row.nama || '';
        return row.metadata ? (row.metadata[key] || '') : '';
      };

      const nama = (getVal('NAMA') || '').trim();
      if (!nama) return []; 
      const status = (getVal('STATUS SISWA') || '').toLowerCase().trim();
      if (status === 'tidak aktif') return []; 

      const base = {
        nisn: (getVal('NISN') || '').trim(),
        nis: (getVal('ID SISWA') || '').trim(),
        nama,
        status: getVal('STATUS SISWA') || '',
        asalSekolah: getVal('SD/MI') || '',
        npsnSekolah: getVal('NPSN SD/MI') || '',
        alamatSekolah: getVal('ALAMAT SD/MI') || '',
        ttl: getVal('TEMPAT, TANGGAL LAHIR') || '',
      };

      const records: SiswaRecord[] = [];
      const ta7 = (getVal('TA KELAS 7') || '').trim();
      const r7  = (getVal('ROMBEL KELAS 7') || '').trim();
      if (ta7 && r7) records.push({ ...base, kelas: r7, tahunAjaran: ta7, isLatest: false });

      const ta8 = (getVal('TA KELAS 8') || '').trim();
      const r8  = (getVal('ROMBEL KELAS 8') || '').trim();
      if (ta8 && r8) records.push({ ...base, kelas: r8, tahunAjaran: ta8, isLatest: false });

      const ta9 = (getVal('TA KELAS 9') || '').trim();
      const r9  = (getVal('ROMBEL KELAS 9') || '').trim();
      if (ta9 && r9) records.push({ ...base, kelas: r9, tahunAjaran: ta9, isLatest: false });

      if (records.length === 0) {
        records.push({
          ...base,
          kelas:  (getVal('ROMBEL') || '').trim(),
          tahunAjaran: (getVal('TAHUN AJARAN') || '').trim(),
          isLatest: true,
        });
      } else {
        records[records.length - 1].isLatest = true;
      }

      return records;
    });

    const siswaAktif = allRecords.filter(s =>
      s.isLatest &&
      (!tahunAjaranFilter || s.tahunAjaran === tahunAjaranFilter)
    );

    const tahunAjaranList = Array.from(new Set(
      allRecords.filter(s => s.isLatest).map(s => s.tahunAjaran).filter(Boolean)
    )).sort().reverse();

    const { data: emisData, error: emisError } = await supabase.from('data_emis').select('*');
    if (emisError) throw emisError;

    const emisMap: Record<string, any> = {};
    (emisData || []).forEach((r: any) => {
      const rawNisn = String(r.metadata?.['NISN'] || '').replace(/^'/, '').trim();
      if (rawNisn) {
        const key = rawNisn.replace(/^0+/, '');
        const val = String(r.metadata?.['ValidasiWalkel'] || '');
        let validStatus = '';
        if (val.toUpperCase().includes('VALID')) validStatus = 'VALID';
        else if (val.toUpperCase().includes('PERBAIKAN')) validStatus = 'PERBAIKAN';

        emisMap[key] = {
          masukEMIS: String(r.metadata?.['MasukEMIS'] || '').toUpperCase() === 'YES',
          validasiWalkel: validStatus,
          tglValidasiWalkel: val,
          tglMasukEMIS: r.metadata?.['TglMasukEMIS'] || '',
        };
      }
    });

    const { data: namaEmisData, error: namaEmisError } = await supabase.from('nama_emis').select('*');
    if (namaEmisError) throw namaEmisError;

    const namaEmisMap: Record<string, string> = {};
    (namaEmisData || []).forEach((r: any) => {
      const rawNisn = String(r.metadata?.['NISN'] || '').replace(/^'/, '').trim();
      const nama = String(r.metadata?.['NAMA'] || '').trim();
      if (rawNisn && nama) {
        const key = rawNisn.replace(/^0+/, '');
        namaEmisMap[key] = nama;
      }
    });

    const data = siswaAktif.map(s => {
      const key = s.nisn.replace(/^0+/, '');
      const emis = emisMap[key] || { masukEMIS: false, validasiWalkel: '', tglValidasiWalkel: '', tglMasukEMIS: '' };
      
      let emisValidStatus = 'BEDA';
      const namaDiEmis = namaEmisMap[key];
      if (namaDiEmis && namaDiEmis.toLowerCase() === s.nama.toLowerCase()) {
        emisValidStatus = 'SAMA';
      }

      return { ...s, ...emis, emisValid: emisValidStatus };
    });

    return NextResponse.json({ success: true, data, tahunAjaranList }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });
  } catch (error: any) {
    console.error('EMIS GET error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nisn, nama, kelas, tahunAjaran, field } = body;
    if (!nisn || !field) return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });

    const { data: emisData, error: emisError } = await supabase.from('data_emis').select('*');
    if (emisError) throw emisError;

    const tglNow = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const searchNisn = nisn.trim().replace(/^0+/, '');
    const existingRow = (emisData || []).find((r: any) => 
      String(r.metadata?.['NISN'] || '').replace(/^'/, '').trim().replace(/^0+/, '') === searchNisn
    );

    if (existingRow) {
      let newVal: any = true;
      const updatedMetadata = { ...(existingRow.metadata || {}) };

      if (field === 'validasiWalkel') {
        const newValStr = body.value ? `${body.value.toUpperCase()} (${tglNow})` : '';
        updatedMetadata['ValidasiWalkel'] = newValStr;
        newVal = body.value ? body.value.toUpperCase() : '';
      } else {
        const colName = field === 'masukEMIS' ? 'MasukEMIS' : 'EMISValid';
        const tglCol  = field === 'masukEMIS' ? 'TglMasukEMIS' : 'TglEMISValid';
        const currentVal = String(updatedMetadata[colName] || '').toUpperCase();
        const newValStr = currentVal === 'YES' ? 'NO' : 'YES';
        
        updatedMetadata[colName] = newValStr;
        updatedMetadata[tglCol] = newValStr === 'YES' ? tglNow : '';
        newVal = newValStr === 'YES';
      }

      const { error: updateError } = await supabase
        .from('data_emis')
        .update({ metadata: updatedMetadata })
        .eq('id', existingRow.id);
        
      if (updateError) {
        // Fallback jika tidak ada id
        const { error: updateError2 } = await supabase
          .from('data_emis')
          .update({ metadata: updatedMetadata })
          .eq('metadata->>NISN', existingRow.metadata['NISN']);
        if (updateError2) throw updateError2;
      }

      return NextResponse.json({ success: true, newValue: newVal });
    } else {
      const newMetadata = {
        NISN: `'${nisn}`, 
        Nama: nama || '', 
        Kelas: kelas || '', 
        TahunAjaran: tahunAjaran || '',
        MasukEMIS: field === 'masukEMIS' ? 'YES' : 'NO',
        EMISValid: field === 'emisValid'  ? 'YES' : 'NO',
        ValidasiWalkel: field === 'validasiWalkel' && body.value ? `${body.value.toUpperCase()} (${tglNow})` : '',
        TglMasukEMIS: field === 'masukEMIS' ? tglNow : '',
        TglEMISValid: field === 'emisValid'  ? tglNow : '',
      };

      const { error: insertError } = await supabase
        .from('data_emis')
        .insert([{ metadata: newMetadata }]);

      if (insertError) throw insertError;

      return NextResponse.json({ success: true, newValue: field === 'validasiWalkel' ? (body.value || '') : true });
    }
  } catch (error: any) {
    console.error('EMIS POST error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
