import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getTodayWib() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (7 * 3600000));
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const dd = String(wib.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatWaLink(phone: string, text: string) {
  if (!phone) return null;
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('0')) {
    clean = '62' + clean.slice(1);
  } else if (clean.startsWith('8')) {
    clean = '62' + clean;
  }
  if (clean.length < 9) return null;
  return `https://wa.me/${clean}?text=${encodeURIComponent(text)}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kelas = searchParams.get('kelas');
    const tanggal = searchParams.get('tanggal') || getTodayWib();
    const namaWaliParam = searchParams.get('wali') || '';

    if (!kelas) {
      return NextResponse.json({ success: false, error: 'Parameter kelas diperlukan' }, { status: 400 });
    }

    const cleanKelas = kelas.trim().toUpperCase();

    // 1. Fetch presensi rows for this class on the target date
    const { data: rowsPresensi, error: presensiError } = await supabase
      .from('data_presensi_siswa')
      .select('*')
      .eq('tanggal', tanggal)
      .eq('kelas', cleanKelas);

    if (presensiError) throw presensiError;

    // 2. Filter Alpha records
    const alphaRows = (rowsPresensi || []).filter((r: any) => {
      const status = (r.metadata?.['KEHADIRAN'] || '').trim().toUpperCase();
      return status === 'A' || status === 'ALPHA';
    });

    if (alphaRows.length === 0) {
      return NextResponse.json({
        success: true,
        tanggal,
        kelas: cleanKelas,
        totalAlpha: 0,
        students: []
      }, {
        headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
      });
    }

    // 3. Group by student
    const studentMap: Record<string, any> = {};
    for (const row of alphaRows) {
      const nama = (row.metadata?.['NAMA SISWA'] || '').trim().toUpperCase();
      if (!nama) continue;
      
      const rawNisn = (row.metadata?.['NISN'] || '').trim();
      const jamKe = (row.metadata?.['JAM KE'] || '').trim();
      const mapel = (row.metadata?.['MAPEL'] || '').trim();
      const guru = (row.metadata?.['GURU PENGINPUT'] || '').trim();
      const timestamp = (row.metadata?.['TIMESTAMP'] || '').trim();

      if (!studentMap[nama]) {
        studentMap[nama] = {
          nama,
          nisn: rawNisn,
          mapelList: [],
          jamList: [],
          gurus: []
        };
      }

      studentMap[nama].mapelList.push({
        jamKe,
        mapel,
        guru,
        timestamp
      });
      if (jamKe && !studentMap[nama].jamList.includes(jamKe)) {
        studentMap[nama].jamList.push(jamKe);
      }
      if (guru && !studentMap[nama].gurus.includes(guru)) {
        studentMap[nama].gurus.push(guru);
      }
    }

    const studentNames = Object.keys(studentMap);

    // 4. Enrich with Parent Contact Info from data_induk
    const { data: indukRows } = await supabase
      .from('data_induk')
      .select('metadata')
      .in('metadata->>NAMA', studentNames);

    const parentMap: Record<string, any> = {};
    if (indukRows) {
      for (const row of indukRows) {
        const m = row.metadata || {};
        const nama = (m['NAMA'] || '').trim().toUpperCase();
        if (!nama) continue;
        
        if (!parentMap[nama] || m['STATUS SISWA'] === 'Aktif') {
          parentMap[nama] = {
            domisili: m['DOMISILI'] || 'RUMAH',
            ayah: m['NAMA AYAH KANDUNG'] || '',
            noHpAyah: m['NOMOR TELEPON AYAH KANDUNG'] || '',
            ibu: m['NAMA IBU KANDUNG'] || '',
            noHpIbu: m['NOMOR TELEPON IBU KANDUNG'] || '',
            wali: m['NAMA WALI'] || '',
            noHpWali: m['NOMOR TELEPON WALI'] || '',
            foto: m['LINK FOTO TERBARU'] || ''
          };
        }
      }
    }

    // Format human-readable date for WhatsApp greeting
    const d = new Date(tanggal + 'T00:00:00+07:00');
    const tanggalFormatted = !isNaN(d.getTime())
      ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(d)
      : tanggal;

    const signatureWali = namaWaliParam ? `Saya ${namaWaliParam} selaku Wali Kelas ${cleanKelas}` : `Saya Wali Kelas ${cleanKelas}`;

    // 5. Build final student list
    const students = studentNames.map(nama => {
      const s = studentMap[nama];
      const p = parentMap[nama] || {};

      const pesanIbu = `Assalamu'alaikum Wr. Wb. Ibu ${p.ibu || ''} (Wali Murid dari ananda ${nama}). ${signatureWali} di MTs Almaarif 01 Singosari. Kami ingin menanyakan kabar dan keadaan ananda, karena pada jam pelajaran hari ini (${tanggalFormatted}) ananda tercatat belum hadir di kelas tanpa keterangan. Semoga ananda dan keluarga senantiasa sehat wal afiat. Mohon konfirmasinya ya Bu. Terima kasih.`;
      
      const pesanAyah = `Assalamu'alaikum Wr. Wb. Bapak ${p.ayah || ''} (Wali Murid dari ananda ${nama}). ${signatureWali} di MTs Almaarif 01 Singosari. Kami ingin menanyakan kabar dan keadaan ananda, karena pada jam pelajaran hari ini (${tanggalFormatted}) ananda tercatat belum hadir di kelas tanpa keterangan. Semoga ananda dan keluarga senantiasa sehat wal afiat. Mohon konfirmasinya ya Pak. Terima kasih.`;

      const pesanWali = `Assalamu'alaikum Wr. Wb. Bapak/Ibu ${p.wali || ''} (Wali Murid dari ananda ${nama}). ${signatureWali} di MTs Almaarif 01 Singosari. Kami ingin menanyakan kabar dan keadaan ananda, karena pada jam pelajaran hari ini (${tanggalFormatted}) ananda tercatat belum hadir di kelas tanpa keterangan. Semoga ananda dan keluarga senantiasa sehat wal afiat. Mohon konfirmasinya. Terima kasih.`;

      const waLinkIbu = formatWaLink(p.noHpIbu, pesanIbu);
      const waLinkAyah = formatWaLink(p.noHpAyah, pesanAyah);
      const waLinkWali = formatWaLink(p.noHpWali, pesanWali);

      return {
        nama,
        nisn: s.nisn,
        jamKeRingkasan: s.jamList.join(', '),
        mapelList: s.mapelList,
        gurus: s.gurus,
        domisili: p.domisili || 'RUMAH',
        foto: p.foto || '',
        ortu: {
          ibu: p.ibu || '',
          noHpIbu: p.noHpIbu || '',
          waLinkIbu,
          ayah: p.ayah || '',
          noHpAyah: p.noHpAyah || '',
          waLinkAyah,
          wali: p.wali || '',
          noHpWali: p.noHpWali || '',
          waLinkWali
        }
      };
    });

    return NextResponse.json({
      success: true,
      tanggal,
      tanggalFormatted,
      kelas: cleanKelas,
      totalAlpha: students.length,
      students
    }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });

  } catch (error: any) {
    console.error('Error fetch wali-kelas-alpha:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat data alpha: ' + error.message }, { status: 500 });
  }
}
