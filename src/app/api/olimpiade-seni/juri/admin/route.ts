import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import {
  CABANG_SENI_CANONICAL,
  DEFAULT_TABEL_PENILAIAN_SENI,
  TabelPenilaianCabangConfig,
  normalizeCabangSeni
} from '@/lib/olimpiade-config';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Ambil seluruh akun juri
    const { data: juriRows, error: errJuri } = await supabase
      .from('olimpiade_juri')
      .select('*')
      .order('cabang_lomba', { ascending: true })
      .order('nama_juri', { ascending: true });

    if (errJuri) throw errJuri;

    // 2. Ambil konfigurasi tabel penilaian dari profil_lembaga (jenis = CONFIG_OLIMPIADE)
    const { data: configRow } = await supabase
      .from('profil_lembaga')
      .select('id, metadata')
      .eq('jenis', 'CONFIG_OLIMPIADE')
      .limit(1)
      .maybeSingle();

    const savedKriteria = configRow?.metadata?.kriteria_juri_seni || {};
    const tabelConfig: Record<string, TabelPenilaianCabangConfig> = {};
    CABANG_SENI_CANONICAL.forEach(cab => {
      if (savedKriteria[cab] && Array.isArray(savedKriteria[cab].aspek) && savedKriteria[cab].aspek.length > 0) {
        tabelConfig[cab] = savedKriteria[cab];
      } else {
        tabelConfig[cab] = DEFAULT_TABEL_PENILAIAN_SENI[cab];
      }
    });

    // 3. Ambil seluruh peserta Lomba Seni dari data_olimpiade_seni
    const { data: allPesertaRows, error: errPeserta } = await supabase
      .from('data_olimpiade_seni')
      .select('id, jenis_pendaftaran, metadata')
      .range(0, 4999);

    if (errPeserta) throw errPeserta;

    // 4. Ambil seluruh nilai dari olimpiade_nilai
    const { data: allNilaiRows, error: errNilai } = await supabase
      .from('olimpiade_nilai')
      .select('*')
      .range(0, 4999);

    if (errNilai) throw errNilai;

    // Filter & normalisasi peserta Lomba Seni
    const pesertaSeni: any[] = [];
    (allPesertaRows || []).forEach(row => {
      const meta = row.metadata || {};
      const nomorPeserta = String(meta.NOMOR_PESERTA || '').trim();
      if (meta.IS_BYPASS === true || nomorPeserta.startsWith('BYPASS-')) return;

      const jenis = String(row.jenis_pendaftaran || '').toLowerCase();
      if (jenis !== 'individu' && jenis !== 'peserta_kolektif') return;

      const rawCabang = String(meta.LOMBA_DIPILIH || meta['LOMBA YANG DIPILIH'] || '').trim();
      const cabang = normalizeCabangSeni(rawCabang);
      if (!CABANG_SENI_CANONICAL.includes(cabang as any)) return;

      const namaIndividu = String(meta.NAMA || meta['NAMA LENGKAP SISWA'] || '').trim();
      const namaRegu = String(
        meta.NAMA_REGU ||
        meta['NAMA REGU/GRUP (KHUSUS LOMBA BEREGU)'] ||
        meta['NAMA REGU/GRUP (LOMBA MAPEL TIDAK PERLU MENGISI)'] ||
        ''
      ).trim();
      const asalSekolah = String(meta.ASAL_SEKOLAH || meta['NAMA SD/MI'] || '').trim();

      // Untuk Al Banjari & SMS, prioritaskan nama regu jika ada dan bukan sekadar nama sekolah
      let displayNama = namaIndividu || namaRegu || 'Tanpa Nama';
      if ((cabang === 'Al Banjari' || cabang === 'SMS') && namaRegu) {
        if (namaIndividu && namaIndividu.toLowerCase() !== asalSekolah.toLowerCase() && namaIndividu.toLowerCase() !== namaRegu.toLowerCase()) {
          displayNama = `${namaRegu} (${namaIndividu})`;
        } else {
          displayNama = namaRegu;
        }
      }

      pesertaSeni.push({
        id: row.id,
        nomor_peserta: nomorPeserta || `SEN-${row.id}`,
        nama: displayNama,
        nama_individu: namaIndividu,
        nama_regu: namaRegu,
        asal_sekolah: asalSekolah || '-',
        cabang_lomba: cabang,
        status_pembayaran: meta.STATUS_PEMBAYARAN || 'Valid',
        no_urut_tampil: meta.NO_URUT_TAMPIL || null,
        rincian_juri: meta.PENILAIAN_JURI || {}
      });
    });

    // Urutkan peserta berdasarkan nomor peserta / nomor urut tampil
    pesertaSeni.sort((a, b) => {
      if (a.cabang_lomba !== b.cabang_lomba) return a.cabang_lomba.localeCompare(b.cabang_lomba);
      if (a.no_urut_tampil && b.no_urut_tampil) return Number(a.no_urut_tampil) - Number(b.no_urut_tampil);
      return String(a.nomor_peserta).localeCompare(String(b.nomor_peserta), undefined, { numeric: true });
    });

    // Normalisasi daftar Juri + hitung progres penilaiannya
    const juriList = (juriRows || []).map(j => {
      const cabangNorm = normalizeCabangSeni(j.cabang_lomba);
      const pesertaDiCabang = pesertaSeni.filter(p => p.cabang_lomba === cabangNorm);
      const pesertaIdsDiCabang = new Set(pesertaDiCabang.map(p => p.id));

      const nilaiJuriIni = (allNilaiRows || []).filter(
        n => n.juri_id === j.id && pesertaIdsDiCabang.has(n.peserta_id) && n.nilai !== null && n.nilai !== undefined
      );

      let lastUpdated: string | null = null;
      nilaiJuriIni.forEach(n => {
        if (n.updated_at && (!lastUpdated || new Date(n.updated_at) > new Date(lastUpdated))) {
          lastUpdated = n.updated_at;
        }
      });

      const totalPeserta = pesertaDiCabang.length;
      const sudahDinilai = nilaiJuriIni.length;
      const belumDinilai = Math.max(0, totalPeserta - sudahDinilai);
      const persentase = totalPeserta > 0 ? Math.round((sudahDinilai / totalPeserta) * 100) : 0;

      return {
        id: j.id,
        nama_juri: j.nama_juri,
        username: j.username,
        password: j.password,
        cabang_lomba: cabangNorm,
        created_at: j.created_at,
        total_peserta: totalPeserta,
        sudah_dinilai: sudahDinilai,
        belum_dinilai: belumDinilai,
        persentase,
        last_updated: lastUpdated
      };
    });

    // Map nilai per (peserta_id, juri_id)
    const nilaiLookup: Record<string, any> = {};
    (allNilaiRows || []).forEach(n => {
      nilaiLookup[`${n.peserta_id}_${n.juri_id}`] = n;
    });

    // Susun rekap lengkap peserta beserta nilai dari masing-masing juri di cabangnya
    const rekapPeserta = pesertaSeni.map(p => {
      const juriCabang = juriList.filter(j => j.cabang_lomba === p.cabang_lomba);
      const nilaiPerJuri: Record<string, any> = {};
      let sumNilai = 0;
      let countJuriMenilai = 0;

      juriCabang.forEach(j => {
        const rowNilai = nilaiLookup[`${p.id}_${j.id}`];
        const rincian = p.rincian_juri?.[j.id] || null;
        if (rowNilai && rowNilai.nilai !== null && rowNilai.nilai !== undefined) {
          const val = Number(rowNilai.nilai);
          sumNilai += val;
          countJuriMenilai++;
          nilaiPerJuri[j.id] = {
            nilai: val,
            aspek: rincian?.aspek || {},
            catatan: rincian?.catatan || '',
            updated_at: rowNilai.updated_at || rincian?.updated_at || null
          };
        } else {
          nilaiPerJuri[j.id] = null;
        }
      });

      // Fallback jika ada nilai dari juri yang sudah dihapus atau beda cabang
      if (countJuriMenilai === 0) {
        const extraNilai = (allNilaiRows || []).filter(n => n.peserta_id === p.id && n.nilai !== null);
        extraNilai.forEach(en => {
          sumNilai += Number(en.nilai);
          countJuriMenilai++;
        });
      }

      const rataRata = countJuriMenilai > 0 ? Number((sumNilai / countJuriMenilai).toFixed(2)) : 0;

      return {
        ...p,
        nilai_per_juri: nilaiPerJuri,
        jumlah_juri_menilai: countJuriMenilai,
        total_juri_cabang: juriCabang.length,
        total_nilai: Number(sumNilai.toFixed(2)),
        rata_rata: rataRata
      };
    });

    return NextResponse.json({
      success: true,
      cabang_seni: CABANG_SENI_CANONICAL,
      juri_list: juriList,
      tabel_config: tabelConfig,
      peserta_list: rekapPeserta
    });
  } catch (error: any) {
    console.error('Error GET admin juri:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // 1. BUAT AKUN JURI BARU
    if (action === 'create_juri') {
      const { nama_juri, username, password, cabang_lomba } = body;
      if (!nama_juri || !username || !password || !cabang_lomba) {
        return NextResponse.json({ success: false, error: 'Semua kolom akun juri wajib diisi' }, { status: 400 });
      }

      const cleanUsername = String(username).trim();
      const cabangNorm = normalizeCabangSeni(cabang_lomba);

      // Cek username duplikat
      const { data: existing } = await supabase
        .from('olimpiade_juri')
        .select('id')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (existing) {
        return NextResponse.json({ success: false, error: `Username "${cleanUsername}" sudah digunakan oleh juri lain.` }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('olimpiade_juri')
        .insert([{
          nama_juri: String(nama_juri).trim(),
          username: cleanUsername,
          password: String(password).trim(),
          cabang_lomba: cabangNorm
        }])
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // 2. UPDATE AKUN JURI
    if (action === 'update_juri') {
      const { id, nama_juri, username, password, cabang_lomba } = body;
      if (!id || !nama_juri || !username || !password || !cabang_lomba) {
        return NextResponse.json({ success: false, error: 'Data akun juri tidak lengkap' }, { status: 400 });
      }

      const cleanUsername = String(username).trim();
      const cabangNorm = normalizeCabangSeni(cabang_lomba);

      // Cek duplikat username selain ID ini
      const { data: dup } = await supabase
        .from('olimpiade_juri')
        .select('id')
        .eq('username', cleanUsername)
        .neq('id', id)
        .maybeSingle();

      if (dup) {
        return NextResponse.json({ success: false, error: `Username "${cleanUsername}" sudah dipakai akun juri lain.` }, { status: 400 });
      }

      const { data, error } = await supabase
        .from('olimpiade_juri')
        .update({
          nama_juri: String(nama_juri).trim(),
          username: cleanUsername,
          password: String(password).trim(),
          cabang_lomba: cabangNorm
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    // 3. HAPUS AKUN JURI
    if (action === 'delete_juri') {
      const { id } = body;
      if (!id) {
        return NextResponse.json({ success: false, error: 'ID Juri diperlukan' }, { status: 400 });
      }

      await supabase.from('olimpiade_nilai').delete().eq('juri_id', id);
      const { error } = await supabase.from('olimpiade_juri').delete().eq('id', id);
      if (error) throw error;

      return NextResponse.json({ success: true });
    }

    // 4. SIMPAN KONFIGURASI TABEL PENILAIAN TIAP CABANG LOMBA SENI
    if (action === 'save_tabel_config') {
      const { cabang, config } = body;
      if (!cabang || !config || !Array.isArray(config.aspek)) {
        return NextResponse.json({ success: false, error: 'Konfigurasi tabel penilaian tidak valid' }, { status: 400 });
      }

      const cabangNorm = normalizeCabangSeni(cabang);

      const { data: existing } = await supabase
        .from('profil_lembaga')
        .select('id, metadata')
        .eq('jenis', 'CONFIG_OLIMPIADE')
        .limit(1)
        .maybeSingle();

      const currentMeta = existing?.metadata || {};
      const currentKriteria = currentMeta.kriteria_juri_seni || {};

      const updatedKriteria = {
        ...currentKriteria,
        [cabangNorm]: {
          cabang: cabangNorm,
          modeHitung: config.modeHitung || 'sum',
          tampilkanCatatan: config.tampilkanCatatan !== false,
          aspek: config.aspek.map((a: any, idx: number) => ({
            id: a.id || `aspek_${idx + 1}`,
            nama: String(a.nama || `Aspek ${idx + 1}`).trim(),
            bobotMaks: Number(a.bobotMaks) || 100,
            keterangan: String(a.keterangan || '').trim()
          }))
        }
      };

      const nextMeta = {
        ...currentMeta,
        kriteria_juri_seni: updatedKriteria
      };

      if (existing) {
        const { error } = await supabase
          .from('profil_lembaga')
          .update({ metadata: nextMeta })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('profil_lembaga')
          .insert([{ jenis: 'CONFIG_OLIMPIADE', isi: 'CONFIG', metadata: nextMeta }]);
        if (error) throw error;
      }

      return NextResponse.json({
        success: true,
        tabel_config: updatedKriteria[cabangNorm]
      });
    }

    // 5. INPUT / UPDATE NILAI OLEH ADMIN ATAU JURI (TERMASUK RINCIAN ASPEK)
    if (action === 'save_nilai') {
      const { juri_id, peserta_id, nilai, aspek, catatan } = body;
      if (!juri_id || !peserta_id || nilai === undefined) {
        return NextResponse.json({ success: false, error: 'Parameter penilaian tidak lengkap' }, { status: 400 });
      }

      const numericNilai = Number(Number(nilai).toFixed(2));
      const nowIso = new Date().toISOString();

      // Simpan ke olimpiade_nilai
      const { error: errUpsert } = await supabase
        .from('olimpiade_nilai')
        .upsert(
          {
            juri_id,
            peserta_id: Number(peserta_id),
            nilai: numericNilai,
            updated_at: nowIso
          },
          { onConflict: 'peserta_id, juri_id' }
        );

      if (errUpsert) throw errUpsert;

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

      return NextResponse.json({ success: true, nilai: numericNilai });
    }

    return NextResponse.json({ success: false, error: 'Action tidak dikenali' }, { status: 400 });
  } catch (error: any) {
    console.error('Error POST admin juri:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal server error' }, { status: 500 });
  }
}
