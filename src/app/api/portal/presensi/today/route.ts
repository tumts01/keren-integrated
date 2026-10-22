import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function getWibDate() {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const wib = new Date(utc + (7 * 3600000));
  
  const yyyy = wib.getFullYear();
  const mm = String(wib.getMonth() + 1).padStart(2, '0');
  const dd = String(wib.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nisn = searchParams.get('nisn') || '';
    const nis = searchParams.get('nis') || '';

    if (!nisn && !nis) {
      return NextResponse.json({ success: false, error: 'NISN atau NIS diperlukan' }, { status: 400 });
    }

    const cleanInputNisn = nisn ? String(nisn).trim().replace(/^0+/, '') : '';
    const cleanInputNis = nis ? String(nis).trim().replace(/^0+/, '') : '';
    const today = getWibDate();

    // Query data_presensi_siswa hari ini
    const { data: rows, error } = await supabase
      .from('data_presensi_siswa')
      .select('*')
      .eq('tanggal', today);

    if (error) throw error;

    // Prioritaskan baris GATE (memiliki JAM_MASUK atau SUMBER === 'GATE')
    const studentRows = (rows || []).filter((r: any) => {
      const rNisn = String(r.metadata?.['NISN'] || '').replace(/^'/, '').trim().replace(/^0+/, '');
      const rNis = String(r.metadata?.['NIS'] || r.metadata?.['ID SISWA'] || '').replace(/^'/, '').trim().replace(/^0+/, '');
      if (cleanInputNisn && rNisn === cleanInputNisn) return true;
      if (cleanInputNis && rNis === cleanInputNis) return true;
      return false;
    });

    const matchedGate = studentRows.find((r: any) => {
      const m = r.metadata || {};
      return Boolean(m['JAM_MASUK'] || m['JAM MASUK'] || m['SUMBER'] === 'GATE');
    });

    const matchedClassJam1Alpha = studentRows.find((r: any) => {
      const m = r.metadata || {};
      if (m['JAM_MASUK'] || m['JAM MASUK'] || m['SUMBER'] === 'GATE') return false;
      const keh = String(m['KEHADIRAN'] || '').trim().toUpperCase();
      const mapel = String(m['MAPEL'] || '').trim().toUpperCase();
      const jams = String(m['JAM KE'] || '').replace(/^'/, '').split(',').map((s: string) => s.trim());
      return keh === 'A' && (jams.includes('1') || mapel === 'PIKET');
    });

    const matched = matchedGate || studentRows[0] || null;

    if (!matched) {
      return NextResponse.json({
        success: true,
        tanggal: today,
        data: {
          hasRecord: false,
          status: 'BELUM_TERCATAT',
          statusLabel: 'Belum Ada Catatan Kehadiran',
          jamMasuk: null,
          jamPulang: null,
          statusMasuk: null
        }
      });
    }

    const meta = matched.metadata || {};
    const jamMasuk = meta['JAM_MASUK'] || meta['JAM MASUK'] || null;
    const jamPulang = meta['JAM_PULANG'] || meta['JAM PULANG'] || null;
    let statusMasuk = meta['STATUS_MASUK'] || 'Tepat Waktu';
    const kehadiranRaw = String(meta['KEHADIRAN'] || meta['STATUS'] || 'H').toUpperCase();

    // Cek apakah terkena Audit Pembatalan RFID (baik sudah tercatat di metadata maupun konflik langsung dengan Alpha Jam-1)
    const isAuditCancelled =
      meta['AUDIT_STATUS'] === 'DIBATALKAN' ||
      statusMasuk === 'DIBATALKAN' ||
      kehadiranRaw === 'BATAL_RFID' ||
      (Boolean(matchedGate) && Boolean(matchedClassJam1Alpha) && meta['AUDIT_STATUS'] !== 'DIPULIHKAN');

    let status = 'HADIR';
    let statusLabel = 'Hadir';
    let auditInfo: any = null;

    if (isAuditCancelled) {
      status = 'DIBATALKAN_RFID';
      statusLabel = 'Presensi RFID Dibatalkan (Kena Sanksi)';
      statusMasuk = 'DIBATALKAN';
      const cm = matchedClassJam1Alpha?.metadata || {};
      auditInfo = {
        sanksi: meta['AUDIT_SANKSI'] || 'Presensi RFID Dibatalkan & Terkena Sanksi (Indikasi Titip Kartu / Alpha Jam Ke-1)',
        catatan: meta['AUDIT_CATATAN'] || '',
        guru: meta['AUDIT_GURU'] || cm['GURU PENGINPUT'] || '-',
        mapel: meta['AUDIT_MAPEL'] || cm['MAPEL'] || '-',
        jamKe: meta['AUDIT_JAM_KE'] || String(cm['JAM KE'] || '1').replace(/^'/, ''),
        statusKelas: meta['AUDIT_STATUS_KELAS'] || 'A'
      };
    } else if (kehadiranRaw === 'S' || kehadiranRaw.includes('SAKIT')) {
      status = 'SAKIT';
      statusLabel = 'Sakit';
    } else if (kehadiranRaw === 'I' || kehadiranRaw.includes('IZIN')) {
      status = 'IZIN';
      statusLabel = 'Izin';
    } else if (kehadiranRaw === 'A' || kehadiranRaw.includes('ALPHA')) {
      status = 'ALPHA';
      statusLabel = 'Alpha (Tanpa Keterangan)';
    } else {
      status = 'HADIR';
      statusLabel = jamPulang ? 'Sudah Pulang' : 'Hadir di Madrasah';
    }

    return NextResponse.json({
      success: true,
      tanggal: today,
      data: {
        hasRecord: true,
        status,
        statusLabel,
        jamMasuk,
        jamPulang,
        statusMasuk,
        auditInfo
      }
    });

  } catch (error: any) {
    console.error('GET Portal Presensi Today Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
