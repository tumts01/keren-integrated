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

    const today = getCurrentDateString();

    // Query filtered langsung per nama - efisien & tidak kena batas 1000 baris
    const { data: userRows, error: absenError } = await supabase
      .from('absen_gtk')
      .select('*')
      .eq('nama', nama);
    if (absenError) throw absenError;

    const todayRecord = (userRows || []).find((r: any) =>
      (r.metadata?.['tanggal'] || r.tanggal) === today
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
      rekap = (userRows || []).filter((r: any) => {
        const tgl = r.metadata?.['tanggal'] || r.tanggal || '';
        const parts = tgl.split('/');
        return parts.length === 3 && parts[1] === bulan && parts[2] === tahun;
      }).map((r: any) => ({
        tanggal: r.metadata?.['tanggal'] || r.tanggal,
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
    const { action, nama, tanggal: inputTanggal, jam_masuk, jam_pulang } = body;

    if (!nama || !action) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const today = getCurrentDateString();
    const currentTime = getCurrentTimeString();
    const targetDate = inputTanggal || today;

    // Query filtered langsung per nama & tanggal - hindari batas 1000 baris
    const { data: userRows, error: absenError } = await supabase
      .from('absen_gtk')
      .select('*')
      .eq('nama', nama)
      .eq('tanggal', targetDate);
    if (absenError) throw absenError;

    let userRow = (userRows || [])[0] || null;

    if (action === 'bulk_edit') {
      const { bulkData } = body;
      
      const { data: allUserRows, error: fetchErr } = await supabase
        .from('absen_gtk')
        .select('*')
        .eq('nama', nama);
      
      if (fetchErr) throw fetchErr;

      const promises = Object.entries(bulkData).map(async ([tgl, data]) => {
        const { jam_masuk, jam_pulang } = data as any;
        const existingRow = allUserRows?.find(r => r.tanggal === tgl);
        
        if (!existingRow && !jam_masuk && !jam_pulang) return Promise.resolve();

        if (!existingRow) {
          return supabase.from('absen_gtk').insert([{
            nama, 
            tanggal: tgl,
            metadata: {
              Nama: nama,
              tanggal: tgl,
              jam_masuk: jam_masuk || '',
              jam_pulang: jam_pulang || '',
              status: 'Hadir'
            }
          }]);
        } else {
          return supabase.from('absen_gtk').update({
            metadata: { ...existingRow.metadata, jam_masuk: jam_masuk || '', jam_pulang: jam_pulang || '' }
          }).eq('id', existingRow.id);
        }
      });

      await Promise.all(promises);
      return NextResponse.json({ success: true, message: 'Semua data absensi berhasil diperbarui!' });
    }

    if (action === 'edit') {
      if (!userRow) {
        // If row doesn't exist for that day, insert it
        const { error: insertError } = await supabase.from('absen_gtk').insert([{
          nama, 
          tanggal: targetDate,
          metadata: {
            Nama: nama,
            tanggal: targetDate,
            jam_masuk: jam_masuk || '',
            jam_pulang: jam_pulang || '',
            status: 'Hadir'
          }
        }]);
        if (insertError) throw insertError;
      } else {
        // Update existing row
        const { error: updateError } = await supabase.from('absen_gtk').update({
          metadata: { ...userRow.metadata, jam_masuk: jam_masuk || '', jam_pulang: jam_pulang || '' }
        }).eq('id', userRow.id);
        if (updateError) throw updateError;
      }
      return NextResponse.json({ success: true, message: 'Data absensi berhasil diperbarui!' });
    }

    // Cek apakah hari ini libur
    const { data: liburRows, error: liburError } = await supabase.from('libur_gtk').select('*');
    if (liburError) throw liburError;

    const isHoliday = (liburRows || []).find((r: any) => r.metadata?.['tanggal'] === targetDate);
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
        const { error: insertError } = await supabase.from('absen_gtk').insert([{ nama, tanggal: targetDate,
          metadata: {
            Nama: nama,
            tanggal: targetDate,
            jam_masuk: currentTime,
            jam_pulang: '',
            status: 'Hadir'
          }
        }]);
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase.from('absen_gtk').update({ nama, tanggal: targetDate,
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
      
      const { error: updateError } = await supabase.from('absen_gtk').update({ nama, tanggal: targetDate,
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
