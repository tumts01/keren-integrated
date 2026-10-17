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

    const matched = (rows || []).find((r: any) => {
      const rNisn = String(r.metadata?.['NISN'] || '').trim().replace(/^0+/, '');
      const rNis = String(r.metadata?.['NIS'] || r.metadata?.['ID SISWA'] || '').trim().replace(/^0+/, '');
      if (cleanInputNisn && rNisn === cleanInputNisn) return true;
      if (cleanInputNis && rNis === cleanInputNis) return true;
      return false;
    });

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
    const statusMasuk = meta['STATUS_MASUK'] || 'Tepat Waktu';
    const kehadiranRaw = (meta['KEHADIRAN'] || meta['STATUS'] || 'H').toUpperCase();

    let status = 'HADIR';
    let statusLabel = 'Hadir';

    if (kehadiranRaw.includes('S')) {
      status = 'SAKIT';
      statusLabel = 'Sakit';
    } else if (kehadiranRaw.includes('I')) {
      status = 'IZIN';
      statusLabel = 'Izin';
    } else if (kehadiranRaw.includes('A')) {
      status = 'ALPHA';
      statusLabel = 'Alpha';
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
        statusMasuk
      }
    });

  } catch (error: any) {
    console.error('GET Portal Presensi Today Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
