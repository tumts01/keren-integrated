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

async function getAbsenSheet(doc: any) {
  const expectedHeaders = ['Nama', 'tanggal', 'jam_masuk', 'jam_pulang', 'status'];
  let sheet = doc.sheetsByTitle['Absen_GTK'];
  if (!sheet) {
    sheet = await doc.addSheet({ headerValues: expectedHeaders, title: 'Absen_GTK' });
  }
  return sheet;
}

async function getLiburSheet(doc: any) {
  const liburExpectedHeaders = ['tanggal', 'keterangan'];
  let sheet = doc.sheetsByTitle['Libur_GTK'];
  if (!sheet) {
    sheet = await doc.addSheet({ headerValues: liburExpectedHeaders, title: 'Libur_GTK' });
  }
  return sheet;
}

async function withRetry(fn: () => Promise<any>, maxRetries = 3, delayMs = 800): Promise<any> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      if (i < maxRetries - 1) {
        await new Promise(r => setTimeout(r, delayMs * (i + 1)));
      }
    }
  }
  throw lastError;
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

    const doc = await withRetry(() => getIndukDoc());
    const sheet = await getAbsenSheet(doc);
    const rows: any[] = await withRetry(() => sheet.getRows());
    const today = getCurrentDateString();

    const todayRecord = rows.find((r: any) =>
      r.get('Nama')?.toLowerCase() === nama.toLowerCase() && r.get('tanggal') === today
    );
    const todayStatus = {
      hasCheckedIn: !!todayRecord?.get('jam_masuk'),
      hasCheckedOut: !!todayRecord?.get('jam_pulang'),
      jamMasuk: todayRecord?.get('jam_masuk') || null,
      jamPulang: todayRecord?.get('jam_pulang') || null
    };

    let rekap: any[] = [];
    let holidays: any[] = [];

    if (bulan && tahun) {
      rekap = rows.filter((r: any) => {
        const isUser = r.get('Nama')?.toLowerCase() === nama.toLowerCase();
        const tgl = r.get('tanggal') || '';
        const parts = tgl.split('/');
        return parts.length === 3 && isUser && parts[1] === bulan && parts[2] === tahun;
      }).map((r: any) => ({
        tanggal: r.get('tanggal'),
        jam_masuk: r.get('jam_masuk') || '-',
        jam_pulang: r.get('jam_pulang') || '-',
        status: r.get('status') || '-'
      }));

      const liburSheet = await getLiburSheet(doc);
      const liburRows: any[] = await withRetry(() => liburSheet.getRows());
      holidays = liburRows.map((r: any) => ({
        tanggal: r.get('tanggal'),
        keterangan: r.get('keterangan')
      })).filter((h: any) => {
        const parts = h.tanggal?.split('/') || [];
        return parts[1] === bulan && parts[2] === tahun;
      });
    }

    return NextResponse.json({ success: true, todayStatus, rekap, holidays });

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

    const doc = await withRetry(() => getIndukDoc());
    const sheet = await getAbsenSheet(doc);
    const rows: any[] = await withRetry(() => sheet.getRows());
    const today = getCurrentDateString();
    const currentTime = getCurrentTimeString();

    let userRow = rows.find((r: any) =>
      r.get('Nama')?.toLowerCase() === nama.toLowerCase() && r.get('tanggal') === today
    );

    if (action === 'checkin') {
      if (userRow && userRow.get('jam_masuk')) {
        return NextResponse.json({ success: false, error: 'Anda sudah Check-in hari ini!' }, { status: 400 });
      }
      if (!userRow) {
        await withRetry(() => sheet.addRow({
          Nama: nama,
          tanggal: today,
          jam_masuk: currentTime,
          jam_pulang: '',
          status: 'Hadir'
        }));
      } else {
        userRow.set('jam_masuk', currentTime);
        userRow.set('status', 'Hadir');
        await withRetry(() => userRow.save());
      }
      return NextResponse.json({ success: true, message: `Berhasil Check-in pukul ${currentTime}!`, time: currentTime });

    } else if (action === 'checkout') {
      if (!userRow || !userRow.get('jam_masuk')) {
        return NextResponse.json({ success: false, error: 'Anda belum Check-in, tidak bisa Check-out!' }, { status: 400 });
      }
      if (userRow.get('jam_pulang')) {
        return NextResponse.json({ success: false, error: 'Anda sudah Check-out hari ini!' }, { status: 400 });
      }
      userRow.set('jam_pulang', currentTime);
      await withRetry(() => userRow.save());
      return NextResponse.json({ success: true, message: `Berhasil Check-out pukul ${currentTime}!`, time: currentTime });

    } else {
      return NextResponse.json({ success: false, error: 'Aksi tidak dikenali' }, { status: 400 });
    }

  } catch (error) {
    console.error('Absensi POST error:', error);
    return NextResponse.json({ success: false, error: 'Koneksi ke server gagal, silakan coba lagi.' }, { status: 500 });
  }
}
