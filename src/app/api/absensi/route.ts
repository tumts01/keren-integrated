import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

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
    const bulan = searchParams.get('bulan'); // e.g. "07"
    const tahun = searchParams.get('tahun'); // e.g. "2026"

    if (!nama) {
      return NextResponse.json({ success: false, error: 'Parameter nama harus diisi' }, { status: 400 });
    }

    const doc = await getIndukDoc();
    
    // Ensure sheet exists or create it
    let sheet = doc.sheetsByTitle['Absen_GTK'];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: ['Nama', 'tanggal', 'jam_masuk', 'jam_pulang', 'status'], title: 'Absen_GTK' });
    }

    const rows = await sheet.getRows();
    const today = getCurrentDateString();
    
    // Find today's record for status
    const todayRecord = rows.find(r => r.get('Nama')?.toLowerCase() === nama.toLowerCase() && r.get('tanggal') === today);
    const todayStatus = {
      hasCheckedIn: !!todayRecord?.get('jam_masuk'),
      hasCheckedOut: !!todayRecord?.get('jam_pulang'),
      jamMasuk: todayRecord?.get('jam_masuk') || null,
      jamPulang: todayRecord?.get('jam_pulang') || null
    };

    // Filter recap if month and year provided
    let rekap: any[] = [];
    if (bulan && tahun) {
      rekap = rows.filter(r => {
        const isUser = r.get('Nama')?.toLowerCase() === nama.toLowerCase();
        const tgl = r.get('tanggal') || ''; // DD/MM/YYYY
        const parts = tgl.split('/');
        if (parts.length === 3) {
          return isUser && parts[1] === bulan && parts[2] === tahun;
        }
        return false;
      }).map(r => ({
        tanggal: r.get('tanggal'),
        jam_masuk: r.get('jam_masuk') || '-',
        jam_pulang: r.get('jam_pulang') || '-',
        status: r.get('status') || '-'
      }));
    }

    // Also get holidays if requested
    let holidays: any[] = [];
    if (bulan && tahun) {
      let liburSheet = doc.sheetsByTitle['Libur_GTK'];
      if (!liburSheet) {
        liburSheet = await doc.addSheet({ headerValues: ['tanggal', 'keterangan'], title: 'Libur_GTK' });
      }
      const liburRows = await liburSheet.getRows();
      holidays = liburRows.map(r => ({
        tanggal: r.get('tanggal'),
        keterangan: r.get('keterangan')
      })).filter(h => {
        const parts = h.tanggal?.split('/') || [];
        return parts[1] === bulan && parts[2] === tahun;
      });
    }

    return NextResponse.json({
      success: true,
      todayStatus,
      rekap,
      holidays
    });

  } catch (error) {
    console.error('Absensi GET error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data absensi' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, nama } = body; // action: 'checkin' | 'checkout'

    if (!nama || !action) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const doc = await getIndukDoc();
    let sheet = doc.sheetsByTitle['Absen_GTK'];
    if (!sheet) {
      sheet = await doc.addSheet({ headerValues: ['Nama', 'tanggal', 'jam_masuk', 'jam_pulang', 'status'], title: 'Absen_GTK' });
    }

    const rows = await sheet.getRows();
    const today = getCurrentDateString();
    const currentTime = getCurrentTimeString();
    
    let userRow = rows.find(r => r.get('Nama')?.toLowerCase() === nama.toLowerCase() && r.get('tanggal') === today);

    if (action === 'checkin') {
      if (userRow && userRow.get('jam_masuk')) {
        return NextResponse.json({ success: false, error: 'Anda sudah Check-in hari ini!' }, { status: 400 });
      }
      if (!userRow) {
        await sheet.addRow({
          Nama: nama,
          tanggal: today,
          jam_masuk: currentTime,
          jam_pulang: '',
          status: 'Hadir'
        });
      } else {
        userRow.set('jam_masuk', currentTime);
        userRow.set('status', 'Hadir');
        await userRow.save();
      }
      return NextResponse.json({ success: true, message: 'Berhasil Check-in!', time: currentTime });
      
    } else if (action === 'checkout') {
      if (!userRow || !userRow.get('jam_masuk')) {
        return NextResponse.json({ success: false, error: 'Anda belum Check-in, tidak bisa Check-out!' }, { status: 400 });
      }
      if (userRow.get('jam_pulang')) {
        return NextResponse.json({ success: false, error: 'Anda sudah Check-out hari ini!' }, { status: 400 });
      }
      
      userRow.set('jam_pulang', currentTime);
      await userRow.save();
      
      return NextResponse.json({ success: true, message: 'Berhasil Check-out!', time: currentTime });
    } else {
      return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
    }

  } catch (error) {
    console.error('Absensi POST error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memproses absensi' }, { status: 500 });
  }
}
