import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

function getCurrentDateString() {
  const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPhone(rawHp: string) {
  let hp = rawHp.replace(/\D/g, '');
  if (hp.startsWith('0')) hp = '62' + hp.substring(1);
  return hp;
}

export async function GET(request: Request) {
  try {
    // 1. Validasi Auth (Vercel Cron otomatis kirim header ini)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Cek hari WIB
    const dateWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    const dayOfWeek = dateWIB.getDay(); // 0=Minggu, 1=Senin, ... 6=Sabtu

    // Skip hari Minggu
    if (dayOfWeek === 0) {
      return NextResponse.json({ skipped: true, reason: 'Hari Minggu libur.' });
    }

    const todayStr = getCurrentDateString();

    const doc = await getIndukDoc();

    // 3. Cek hari libur manual dari sheet Libur_GTK
    const liburSheet = doc.sheetsByTitle['Libur_GTK'];
    if (liburSheet) {
      const liburRows = await liburSheet.getRows();
      const isLibur = liburRows.some(r => {
        const tgl = (r.get('tanggal') || '').trim();
        return tgl === todayStr;
      });
      if (isLibur) {
        const info = liburRows.find(r => (r.get('tanggal') || '').trim() === todayStr);
        return NextResponse.json({
          skipped: true,
          reason: `Hari ini libur: ${info?.get('keterangan') || 'Hari Libur'}`
        });
      }
    }

    // 4. Dapatkan daftar GTK aktif + No WA
    const sheetGtk = doc.sheetsByTitle['db_GTK'];
    const sheetAbsen = doc.sheetsByTitle['Absen_GTK'];

    if (!sheetGtk || !sheetAbsen) {
      return NextResponse.json({ error: 'Sheet db_GTK atau Absen_GTK tidak ditemukan' }, { status: 500 });
    }

    const rowsGtk = await sheetGtk.getRows();
    const activeGtk = rowsGtk
      .filter(r => (r.get('Status') || '').toLowerCase().trim() === 'aktif')
      .map(r => ({
        nama: (r.get('Nama') || '').trim(),
        noHp: (r.get('No WA') || '').trim()
      }))
      .filter(g => g.nama && g.noHp);

    // 5. Cek siapa yang sudah absen hari ini
    const rowsAbsen = await sheetAbsen.getRows();
    const sudahAbsenSet = new Set(
      rowsAbsen
        .filter(r => r.get('tanggal') === todayStr && r.get('jam_masuk'))
        .map(r => (r.get('Nama') || '').trim().toLowerCase())
    );

    // 6. Filter yang belum absen
    const belumAbsen = activeGtk.filter(g => !sudahAbsenSet.has(g.nama.toLowerCase()));

    if (belumAbsen.length === 0) {
      return NextResponse.json({ success: true, message: 'Semua GTK sudah absen hari ini!' });
    }

    // 7. Kirim WA via Fonnte
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'FONNTE_TOKEN belum dikonfigurasi' }, { status: 500 });
    }

    const targets = belumAbsen
      .map(g => formatPhone(g.noHp))
      .filter(hp => hp.length >= 10)
      .join(',');

    if (!targets) {
      return NextResponse.json({ message: 'Tidak ada nomor HP valid' });
    }

    const jamSekarang = dateWIB.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    const message = `Halo Bapak/Ibu Guru & Staf KEREN 🏫\n\nPengingat otomatis: Anda *belum melakukan Absensi Masuk (Check In)* pada hari ini (${todayStr}) pukul ${jamSekarang} WIB.\n\nMohon segera absen melalui aplikasi KEREN → menu *Absensi GTK*.\n\nTerima kasih! ✨`;

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: targets,
        message,
        delay: '15-30'
      })
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      tanggal: todayStr,
      message: `Pengingat terkirim ke ${belumAbsen.length} GTK`,
      penerima: belumAbsen.map(g => g.nama),
      fonnteResponse: result
    });

  } catch (error: any) {
    console.error('Cron WA Reminder Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
