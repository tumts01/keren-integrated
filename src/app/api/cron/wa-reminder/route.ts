import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

function getCurrentDateString() {
  const date = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
  return date.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatPhone(rawHp: string) {
  let hp = rawHp.replace(/\D/g, ''); // Remove non-numeric
  if (hp.startsWith('0')) {
    hp = '62' + hp.substring(1);
  }
  return hp;
}

export async function GET(request: Request) {
  try {
    // 1. Validasi Auth via Header (optional for cron security)
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Cek hari Minggu libur (0 = Minggu di JS Date)
    const dateWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
    if (dateWIB.getDay() === 0) {
      return NextResponse.json({ message: 'Hari Minggu libur, tidak ada pengingat.' });
    }

    const todayStr = getCurrentDateString();

    const doc = await getIndukDoc();
    const sheetGtk = doc.sheetsByTitle['db_GTK'];
    const sheetAbsen = doc.sheetsByTitle['Absen_GTK'];

    if (!sheetGtk || !sheetAbsen) {
      return NextResponse.json({ error: 'Sheet tidak ditemukan' }, { status: 500 });
    }

    // 3. Dapatkan daftar GTK Aktif dan Nomor WA
    const rowsGtk = await sheetGtk.getRows();
    const activeGtk = rowsGtk
      .filter(r => (r.get('Status') || '').toLowerCase().trim() === 'aktif')
      .map(r => ({
        nama: r.get('Nama') || '',
        noHp: r.get('No WA') || ''
      }))
      .filter(g => g.nama && g.noHp); // Harus punya nama dan no HP

    // 4. Dapatkan daftar absensi hari ini
    const rowsAbsen = await sheetAbsen.getRows();
    const absenHariIni = rowsAbsen.filter(r => r.get('tanggal') === todayStr && r.get('jam_masuk'));
    
    // Set nama-nama yang sudah absen
    const sudahAbsenSet = new Set(absenHariIni.map(r => (r.get('Nama') || '').trim().toLowerCase()));

    // 5. Filter GTK yang belum absen
    const belumAbsen = activeGtk.filter(g => !sudahAbsenSet.has(g.nama.trim().toLowerCase()));

    if (belumAbsen.length === 0) {
      return NextResponse.json({ message: 'Semua GTK sudah absen hari ini!' });
    }

    // 6. Kirim pesan WA via Fonnte
    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'FONNTE_TOKEN tidak dikonfigurasi' }, { status: 500 });
    }

    let successCount = 0;
    let failCount = 0;

    // Untuk menghindari rate limit, kita bisa gabungkan ke satu target dengan custom message jika perlu
    // Namun Fonnte mendukung pengiriman batch. Agar bisa menyebut nama, kita kirim pesan array atau string target berformat.
    // Format pengiriman multi-target di Fonnte dengan pesan dinamis:
    // "target": "628xxx|628yyy",
    // "message": "Halo, ini pesan untuk Anda" (pesan sama untuk semua)
    
    // Kita buat pesan general agar bisa dikirim sekaligus:
    const targets = belumAbsen.map(g => formatPhone(g.noHp)).filter(hp => hp.length >= 10).join(',');
    
    if (!targets) {
       return NextResponse.json({ message: 'Tidak ada nomor HP valid untuk dikirimi' });
    }

    const message = `Halo Bapak/Ibu Guru & Staf yang KEREN,\n\nIni adalah pengingat otomatis dari Sistem Madrasah. Pantauan kami menunjukkan Anda *belum melakukan Absensi Masuk (Check In)* pada hari ini (${todayStr}) pukul ${dateWIB.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})} WIB.\n\nMohon segera melakukan absensi melalui Keren Apps pada menu Absensi GTK agar data kehadiran Anda tercatat. Terima kasih dan selamat beraktivitas! 🏫✨`;

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: targets,
        message: message,
        delay: '2' // Delay 2 detik antar pesan agar lebih aman dari anti-spam
      })
    });

    const result = await response.json();

    return NextResponse.json({
      success: true,
      message: `Berhasil mengirim pengingat ke ${belumAbsen.length} GTK`,
      fonnteResponse: result,
      targets: belumAbsen.map(g => g.nama)
    });

  } catch (error: any) {
    console.error('Cron WA Reminder Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
