import { NextResponse } from 'next/server';
import { getIndukDoc, getPresensiDoc } from '@/lib/google-sheets';

function formatPhone(rawHp: string) {
  let hp = rawHp.replace(/\D/g, ''); // Remove non-numeric
  if (hp.startsWith('0')) {
    hp = '62' + hp.substring(1);
  }
  return hp;
}

export async function POST(request: Request) {
  try {
    const { pesan, pengirim } = await request.json();

    if (!pesan) {
      return NextResponse.json({ success: false, error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      return NextResponse.json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi' }, { status: 500 });
    }

    // 1. Dapatkan daftar GTK dari db_GTK
    const indukDoc = await getIndukDoc();
    const sheetGtk = indukDoc.sheetsByTitle['db_GTK'];
    if (!sheetGtk) {
      return NextResponse.json({ success: false, error: 'Tab db_GTK tidak ditemukan' }, { status: 500 });
    }

    const rowsGtk = await sheetGtk.getRows();
    const activeGtk = rowsGtk
      .filter(r => (r.get('Status') || '').toLowerCase().trim() === 'aktif')
      .map(r => r.get('No WA') || '')
      .filter(hp => hp.length >= 10);

    if (activeGtk.length === 0) {
      return NextResponse.json({ success: false, error: 'Tidak ada nomor WA GTK aktif yang ditemukan' }, { status: 404 });
    }

    // Gabungkan nomor WA menjadi format Fonnte (koma separated)
    const targets = activeGtk.map(hp => formatPhone(hp)).join(',');

    // 2. Simpan Riwayat ke Spreadsheet Presensi Siswa (Rekap)
    try {
      const presensiDoc = await getPresensiDoc();
      const expectedHeaders = ['Tanggal', 'Jam', 'Pengirim', 'Pesan'];
      let sheetPengumuman = presensiDoc.sheetsByTitle['PENGUMUMAN'];
      
      if (!sheetPengumuman) {
        sheetPengumuman = await presensiDoc.addSheet({ headerValues: expectedHeaders, title: 'PENGUMUMAN' });
      } else {
        try { await sheetPengumuman.loadHeaderRow(); } catch(e) {}
        await sheetPengumuman.setHeaderRow(expectedHeaders);
      }

      const dateWIB = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const tanggal = dateWIB.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const jam = dateWIB.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

      await sheetPengumuman.addRow({
        Tanggal: tanggal,
        Jam: jam,
        Pengirim: pengirim || 'Admin',
        Pesan: pesan
      });
    } catch (sheetError) {
      console.error('Gagal menyimpan log ke Spreadsheet:', sheetError);
      // Kita lanjutkan pengiriman WA meskipun gagal simpan log agar fitur utama tetap jalan
    }

    // 3. Kirim via Fonnte API
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        target: targets,
        message: pesan,
        delay: '2'
      })
    });

    const result = await response.json();

    if (result.status) {
      return NextResponse.json({ 
        success: true, 
        message: `Pesan berhasil dikirim ke ${activeGtk.length} kontak.`,
        data: result
      });
    } else {
      return NextResponse.json({ 
        success: false, 
        error: result.reason || 'Gagal mengirim pesan dari Fonnte' 
      }, { status: 400 });
    }

  } catch (error: any) {
    console.error('API Pengumuman Error:', error);
    return NextResponse.json({ success: false, error: 'Terjadi kesalahan sistem internal.' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const presensiDoc = await getPresensiDoc();
    const sheetPengumuman = presensiDoc.sheetsByTitle['PENGUMUMAN'];
    if (!sheetPengumuman) return NextResponse.json({ success: true, data: [], total: 0 });
    
    const rows = await sheetPengumuman.getRows();
    const data = rows.map(r => ({
      tanggal: r.get('Tanggal'),
      jam: r.get('Jam'),
      pengirim: r.get('Pengirim'),
      pesan: r.get('Pesan')
    })).reverse(); // Terbaru di atas
    
    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error) {
    return NextResponse.json({ success: false, data: [], total: 0 });
  }
}
