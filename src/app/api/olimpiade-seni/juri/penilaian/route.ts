import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

// GET: Ambil daftar peserta untuk cabang lomba tertentu beserta nilainya (jika sudah dinilai)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const juriId = searchParams.get('juriId');
    const cabangLomba = searchParams.get('cabangLomba');

    if (!juriId || !cabangLomba) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    // Ambil semua peserta yang daftar lomba ini dan sudah LUNAS
    const { data: peserta, error: errPeserta } = await supabase
      .from('data_olimpiade_seni')
      .select('*')
      .eq('jenis_pendaftar', 'Individu');

    if (errPeserta) throw errPeserta;

    // Karena cabang lomba disimpan di metadata (LOMBA_DIPILIH atau KATEGORI), kita harus filter di server
    // Atau ambil dari REKAP_PESERTA untuk kolektif
    
    // Tapi tunggu, untuk lomba individu, LOMBA_DIPILIH atau cabang ada di metadata.
    // Dan untuk kolektif, mereka menggunakan file_excel_url. Kita tidak punya nama pesertanya di DB secara langsung!
    // Ah, ini masalah: pendaftar kolektif hanya upload excel, data siswanya tidak masuk ke tabel satu per satu.
    // Kita harus fetch semua, lalu ekstrak data siswa.
    
    // Untuk saat ini, asumsikan Juri hanya menilai Individu atau Kolektif yang sudah diekstrak.
    // Mari kita ekstrak semua peserta.
    
    // FETCH semua data lunas
    const { data: allData, error: errAll } = await supabase
      .from('data_olimpiade_seni')
      .select('*')
      .eq('metadata->>STATUS_PEMBAYARAN', 'Valid');

    if (errAll) throw errAll;

    let pesertaList: any[] = [];
    allData.forEach(row => {
      const meta = row.metadata || {};
      if (row.jenis_pendaftaran?.toLowerCase() === 'individu') {
        if (meta.LOMBA_DIPILIH === cabangLomba || meta.KATEGORI?.includes(cabangLomba)) {
          pesertaList.push({
            id: row.id, // Gunakan ID asli
            nama: meta.NAMA || meta.NAMA_REGU || 'Tanpa Nama',
            asal_sekolah: meta.ASAL_SEKOLAH,
            jenis: 'Individu'
          });
        }
      } else if (row.jenis_pendaftaran?.toLowerCase() === 'kolektif') {
        // Untuk kolektif, kita butuh data peserta detail. 
        // Jika data peserta disimpan di REKAP_PESERTA, itu hanya hitungan jumlah.
        // Jika Juri mau menilai kolektif, nama peserta harus diinput, atau juri menilai per tim?
        // Untuk saat ini, kita filter Individu saja, atau jika ada data nama di metadata.
      }
    });

    // Ambil nilai dari Juri ini
    const { data: nilai, error: errNilai } = await supabase
      .from('olimpiade_nilai')
      .select('*')
      .eq('juri_id', juriId);
    
    if (errNilai) throw errNilai;

    // Gabungkan
    const result = pesertaList.map(p => {
      const n = nilai.find(x => x.peserta_id === p.id);
      return {
        ...p,
        nilai: n ? n.nilai : null
      };
    });

    return NextResponse.json({ success: true, data: result });
  } catch (err: any) {
    console.error('Error GET penilaian:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

// POST: Simpan nilai
export async function POST(req: Request) {
  try {
    const { juri_id, peserta_id, nilai } = await req.json();

    if (!juri_id || !peserta_id || nilai === undefined) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('olimpiade_nilai')
      .upsert({
        juri_id,
        peserta_id,
        nilai,
        updated_at: new Date().toISOString()
      }, { onConflict: 'peserta_id, juri_id' })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error POST penilaian:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
