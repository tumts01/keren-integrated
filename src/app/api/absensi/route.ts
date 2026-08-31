import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Paksa route ini selalu di-fetch langsung (tidak di-cache Vercel)
export const dynamic = 'force-dynamic';

function isSundayInJakarta() {
  const date = new Date();
  const jakartaDateStr = date.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' });
  const jakartaDate = new Date(jakartaDateStr);
  return jakartaDate.getDay() === 0;
}

function getCurrentDateString() {
  const date = new Date();
  return date.toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: '2-digit', year: 'numeric' });
}

function getCurrentTimeString() {
  const date = new Date();
  return date.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const nama = searchParams.get('nama');
    const bulan = searchParams.get('bulan');
    const tahun = searchParams.get('tahun');

    if (!nama) {
      return NextResponse.json({ success: false, error: 'Parameter nama harus diisi' }, { status: 400 });
    }

    const { data: rows, error: absenError } = await supabase.from('absen_gtk').select('*');
    if (absenError) throw absenError;

    const today = getCurrentDateString();

    const todayRecord = (rows || []).find((r: any) =>
      r.metadata?.['Nama']?.toLowerCase() === nama.toLowerCase() && r.metadata?.['tanggal'] === today
    );
    const todayStatus = {
      hasCheckedIn: !!todayRecord?.metadata?.['jam_masuk'],
      hasCheckedOut: !!todayRecord?.metadata?.['jam_pulang'],
      jamMasuk: todayRecord?.metadata?.['jam_masuk'] || null,
      jamPulang: todayRecord?.metadata?.['jam_pulang'] || null
    };

    let rekap: any[] = [];
    let holidays: any[] = [];

    const { data: liburRows, error: liburError } = await supabase.from('libur_gtk').select('*');
    if (liburError) throw liburError;

    const todayHoliday = (liburRows || []).find((r: any) => r.metadata?.['tanggal'] === today);
    const isSunday = isSundayInJakarta();

    const finalTodayStatus = {
      ...todayStatus,
      isHoliday: !!todayHoliday || isSunday,
      holidayName: todayHoliday ? todayHoliday.metadata?.['keterangan'] : (isSunday ? 'Libur Akhir Pekan (Minggu)' : null)
    };

    if (bulan && tahun) {
      rekap = (rows || []).filter((r: any) => {
        const isUser = r.metadata?.['Nama']?.toLowerCase() === nama.toLowerCase();
        const tgl = r.metadata?.['tanggal'] || '';
        const parts = tgl.split('/');
        return parts.length === 3 && isUser && parts[1] === bulan && parts[2] === tahun;
      }).map((r: any) => ({
        tanggal: r.metadata?.['tanggal'],
        jam_masuk: r.metadata?.['jam_masuk'] || '-',
        jam_pulang: r.metadata?.['jam_pulang'] || '-',
        status: r.metadata?.['status'] || '-'
      }));

      holidays = (liburRows || []).map((r: any) => ({
        tanggal: r.metadata?.['tanggal'],
        keterangan: r.metadata?.['keterangan']
      })).filter((h: any) => {
        const parts = h.tanggal?.split('/') || [];
        return parts[1] === bulan && parts[2] === tahun;
      });
    }

    return NextResponse.json({ success: true, todayStatus: finalTodayStatus, rekap, holidays }, {
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' }
    });

  } catch (error) {
    console.error('Absensi GET error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data absensi. Coba lagi.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, nama } = body;

    if (!nama || !action) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const { data: rows, error: absenError } = await supabase.from('absen_gtk').select('*');
    if (absenError) throw absenError;

    const today = getCurrentDateString();
    const currentTime = getCurrentTimeString();

    let userRow = (rows || []).find((r: any) =>
      r.metadata?.['Nama']?.toLowerCase() === nama.toLowerCase() && r.metadata?.['tanggal'] === today
    );

    // Cek apakah hari ini libur
    const { data: liburRows, error: liburError } = await supabase.from('libur_gtk').select('*');
    if (liburError) throw liburError;

    const isHoliday = (liburRows || []).find((r: any) => r.metadata?.['tanggal'] === today);
    const isSunday = isSundayInJakarta();

    if (action === 'checkin' && (isHoliday || isSunday)) {
      const reason = isHoliday ? isHoliday.metadata?.['keterangan'] : 'Libur Akhir Pekan (Minggu)';
      return NextResponse.json({ success: false, error: `Absensi dikunci! Hari ini libur: ${reason}` }, { status: 400 });
    }

    if (action === 'checkin') {
      if (userRow && userRow.metadata?.['jam_masuk']) {
        return NextResponse.json({ success: false, error: 'Anda sudah Check-in hari ini!' }, { status: 400 });
      }
      if (!userRow) {
        const { error: insertError } = await supabase.from('absen_gtk').insert([{
          metadata: {
            Nama: nama,
            tanggal: today,
            jam_masuk: currentTime,
            jam_pulang: '',
            status: 'Hadir'
          }
        }]);
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase.from('absen_gtk').update({
          metadata: { ...userRow.metadata, jam_masuk: currentTime, status: 'Hadir' }
        }).eq('id', userRow.id);
        if (updateError) throw updateError;
      }
      return NextResponse.json({ success: true, message: `Berhasil Check-in pukul ${currentTime}!`, time: currentTime });

    } else if (action === 'checkout') {
      if (!userRow || !userRow.metadata?.['jam_masuk']) {
        return NextResponse.json({ success: false, error: 'Anda belum Check-in, tidak bisa Check-out!' }, { status: 400 });
      }
      if (userRow.metadata?.['jam_pulang']) {
        return NextResponse.json({ success: false, error: 'Anda sudah Check-out hari ini!' }, { status: 400 });
      }
      
      const { error: updateError } = await supabase.from('absen_gtk').update({
        metadata: { ...userRow.metadata, jam_pulang: currentTime }
      }).eq('id', userRow.id);
      if (updateError) throw updateError;
      
      return NextResponse.json({ success: true, message: `Berhasil Check-out pukul ${currentTime}!`, time: currentTime });

    } else {
      return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
    }

  } catch (error) {
    console.error('Absensi POST error:', error);
    return NextResponse.json({ success: false, error: 'Koneksi ke server gagal, silakan coba lagi.' }, { status: 500 });
  }
}
