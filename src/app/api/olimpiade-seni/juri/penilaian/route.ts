import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  DEFAULT_TABEL_PENILAIAN_SENI,
  TabelPenilaianCabangConfig,
  normalizeCabangSeni
} from '@/lib/olimpiade-config';

export const dynamic = 'force-dynamic';

// GET: Ambil daftar peserta untuk cabang lomba tertentu beserta konfigurasi tabel aspek & nilainya
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const juriId = searchParams.get('juriId');
    const cabangLombaRaw = searchParams.get('cabangLomba');

    if (!juriId || !cabangLombaRaw) {
      return NextResponse.json({ success: false, error: 'Parameter tidak lengkap' }, { status: 400 });
    }

    const cabangTarget = normalizeCabangSeni(cabangLombaRaw);

    // 1. Ambil konfigurasi tabel aspek penilaian untuk cabang ini
    const { data: configRow } = await supabase
      .from('profil_lembaga')
      .select('metadata')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .maybeSingle();

    const savedKriteria = configRow?.metadata?.kriteria_juri_seni || {};
    const tabelConfig: TabelPenilaianCabangConfig =
      savedKriteria[cabangTarget] && Array.isArray(savedKriteria[cabangTarget].aspek) && savedKriteria[cabangTarget].aspek.length > 0
        ? savedKriteria[cabangTarget]
        : (DEFAULT_TABEL_PENILAIAN_SENI[cabangTarget] || DEFAULT_TABEL_PENILAIAN_SENI['Singer Solo']);

    // 2. Ambil semua data peserta (baik individu maupun peserta_kolektif)
    const { data: allData, error: errAll } = await supabase
      .from('data_olimpiade_seni')
      .select('id, jenis_pendaftaran, metadata')
      .range(0, 4999);

    if (errAll) throw errAll;

    const pesertaList: any[] = [];
    (allData || []).forEach(row => {
      const meta = row.metadata || {};
      const nomorPeserta = String(meta.NOMOR_PESERTA || '').trim();
      if (meta.IS_BYPASS === true || nomorPeserta.startsWith('BYPASS-')) return;

      const jenis = String(row.jenis_pendaftaran || '').toLowerCase();
      if (jenis !== 'individu' && jenis !== 'peserta_kolektif') return;

      // Hanya tampilkan yang status pembayarannya Valid (atau kosong untuk kolektif yang sudah tervalidasi)
      const statusBayar = String(meta.STATUS_PEMBAYARAN || 'Valid').trim().toLowerCase();
      if (statusBayar === 'ditolak' || statusBayar === 'menunggu') return;

      const rawCabang = String(meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || '').trim();
      const cabangRow = normalizeCabangSeni(rawCabang);

      if (cabangRow === cabangTarget) {
        const namaIndividu = String(meta.NAMA || meta['NAMA LENGKAP SISWA'] || '').trim();
        const namaRegu = String(
          meta.NAMA_REGU ||
          meta['NAMA REGU/GRUP (KHUSUS LOMBA BEREGU)'] ||
          meta['NAMA REGU/GRUP (LOMBA MAPEL TIDAK PERLU MENGISI)'] ||
          ''
        ).trim();
        const asalSekolah = String(meta.ASAL_SEKOLAH || meta['NAMA SD/MI'] || '').trim();

        let displayNama = namaIndividu || namaRegu || 'Tanpa Nama';
        if ((cabangTarget === 'Al Banjari' || cabangTarget === 'SMS') && namaRegu) {
          if (namaIndividu && namaIndividu.toLowerCase() !== asalSekolah.toLowerCase() && namaIndividu.toLowerCase() !== namaRegu.toLowerCase()) {
            displayNama = `${namaRegu} (${namaIndividu})`;
          } else {
            displayNama = namaRegu;
          }
        }

        const rincianJuriIni = meta.PENILAIAN_JURI?.[juriId] || null;

        pesertaList.push({
          id: row.id,
          nomor_peserta: nomorPeserta || `SEN-${row.id}`,
          nama: displayNama,
          nama_regu: namaRegu,
          asal_sekolah: asalSekolah || '-',
          jenis: jenis === 'peserta_kolektif' ? 'Kolektif' : 'Individu',
          aspek: rincianJuriIni?.aspek || {},
          catatan: rincianJuriIni?.catatan || ''
        });
      }
    });

    pesertaList.sort((a, b) =>
      String(a.nomor_peserta).localeCompare(String(b.nomor_peserta), undefined, { numeric: true })
    );

    // 3. Ambil nilai dari Juri ini di olimpiade_nilai
    const { data: nilaiRows, error: errNilai } = await supabase
      .from('olimpiade_nilai')
      .select('*')
      .eq('juri_id', juriId);

    if (errNilai) throw errNilai;

    const result = pesertaList.map(p => {
      const n = (nilaiRows || []).find(x => x.peserta_id === p.id);
      return {
        ...p,
        nilai: n && n.nilai !== null && n.nilai !== undefined ? Number(n.nilai) : null,
        updated_at: n?.updated_at || null
      };
    });

    return NextResponse.json({
      success: true,
      cabang_lomba: cabangTarget,
      tabel_config: tabelConfig,
      data: result
    });
  } catch (err: any) {
    console.error('Error GET penilaian:', err);
    return NextResponse.json({ success: false, error: err.message || 'Internal server error' }, { status: 500 });
  }
}

// POST: Simpan nilai (beserta rincian aspek & catatan juri)
export async function POST(req: Request) {
  try {
    const { juri_id, peserta_id, nilai, aspek, catatan } = await req.json();

    if (!juri_id || !peserta_id || nilai === undefined) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const numericNilai = Number(Number(nilai).toFixed(2));
    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from('olimpiade_nilai')
      .upsert(
        {
          juri_id,
          peserta_id: Number(peserta_id),
          nilai: numericNilai,
          updated_at: nowIso
        },
        { onConflict: 'peserta_id, juri_id' }
      )
      .select();

    if (error) throw error;

    // Simpan rincian aspek & catatan ke metadata peserta di data_olimpiade_seni
    const { data: pRow } = await supabase
      .from('data_olimpiade_seni')
      .select('id, metadata')
      .eq('id', Number(peserta_id))
      .maybeSingle();

    if (pRow) {
      const currentMeta = pRow.metadata || {};
      const currentPenilaianJuri = currentMeta.PENILAIAN_JURI || {};
      const nextMeta = {
        ...currentMeta,
        PENILAIAN_JURI: {
          ...currentPenilaianJuri,
          [juri_id]: {
            nilai: numericNilai,
            aspek: aspek || {},
            catatan: catatan || '',
            updated_at: nowIso
          }
        }
      };

      await supabase
        .from('data_olimpiade_seni')
        .update({ metadata: nextMeta })
        .eq('id', pRow.id);
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Error POST penilaian:', err);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
