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
    const { pesan, pengirim, target } = await request.json();

    if (!pesan) {
      return NextResponse.json({ success: false, error: 'Pesan tidak boleh kosong' }, { status: 400 });
    }

    const token = process.env.FONNTE_TOKEN;
    if (!token) {
      return NextResponse.json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi' }, { status: 500 });
    }

    // 1. Dapatkan daftar GTK dari db_GTK (build nama -> noWA map)
    const indukDoc = await getIndukDoc();
    const sheetGtk = indukDoc.sheetsByTitle['db_GTK'];
    if (!sheetGtk) {
      return NextResponse.json({ success: false, error: 'Tab db_GTK tidak ditemukan' }, { status: 500 });
    }

    const rowsGtk = await sheetGtk.getRows();

    // Build map nama -> noWA (hanya GTK aktif)
    const gtkMap: Record<string, string> = {};
    rowsGtk
      .filter(r => (r.get('Status') || '').toLowerCase().trim() === 'aktif')
      .forEach(r => {
        const nama = (r.get('Nama') || '').toLowerCase().trim();
        const hp = (r.get('No WA') || '').trim();
        if (nama && hp.length >= 8) gtkMap[nama] = hp;
      });

    let targets = '';
    let count = 0;

    if (target === 'pimpinan') {
      // 2a. Ambil daftar user dengan role Pimpinan
      const usersSheet = indukDoc.sheetsByTitle['Users'];
      if (!usersSheet) {
        return NextResponse.json({ success: false, error: 'Sheet Users tidak ditemukan' }, { status: 500 });
      }
      const userRows = await usersSheet.getRows();
      const pimpinanNames = userRows
        .filter(r => (r.get('Rule') || '').toLowerCase().trim() === 'pimpinan')
        .map(r => (r.get('Nama') || '').toLowerCase().trim())
        .filter(Boolean);

      if (pimpinanNames.length === 0) {
        return NextResponse.json({ success: false, error: 'Tidak ada user dengan role Pimpinan ditemukan' }, { status: 404 });
      }

      // Match nama pimpinan ke db_GTK
      const phones: string[] = [];
      pimpinanNames.forEach(pn => {
        // Exact match
        if (gtkMap[pn]) { phones.push(formatPhone(gtkMap[pn])); return; }
        // Partial match (nama pimpinan terkandung di GTK atau sebaliknya)
        const key = Object.keys(gtkMap).find(k => k.includes(pn) || pn.includes(k));
        if (key) phones.push(formatPhone(gtkMap[key]));
      });

      // Jika tidak ditemukan di GTK, coba ambil langsung dari kolom HP di Users (jika ada)
      if (phones.length === 0) {
        userRows
          .filter(r => (r.get('Rule') || '').toLowerCase().trim() === 'pimpinan')
          .forEach(r => {
            const hp = (r.get('No WA') || r.get('HP') || r.get('NoHP') || '').trim();
            if (hp.length >= 8) phones.push(formatPhone(hp));
          });
      }

      if (phones.length === 0) {
        return NextResponse.json({ success: false, error: 'Nomor WA pimpinan tidak ditemukan. Pastikan nama di Users sesuai dengan db_GTK.' }, { status: 404 });
      }

      targets = [...new Set(phones)].join(',');
      count = phones.length;
    } else {
      // 2b. Kirim ke semua GTK aktif
      const allPhones = Object.values(gtkMap).map(hp => formatPhone(hp));
      if (allPhones.length === 0) {
        return NextResponse.json({ success: false, error: 'Tidak ada nomor WA GTK aktif yang ditemukan' }, { status: 404 });
      }
      targets = allPhones.join(',');
      count = allPhones.length;
    }

    // 3. Simpan Riwayat ke Spreadsheet
    try {
      const presensiDoc = await getPresensiDoc();
      const expectedHeaders = ['Tanggal', 'Jam', 'Pengirim', 'Pesan', 'Target'];
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
        Pesan: pesan,
        Target: target === 'pimpinan' ? 'Pimpinan' : 'Semua GTK'
      });
    } catch (sheetError) {
      console.error('Gagal menyimpan log ke Spreadsheet:', sheetError);
    }

    // 4. Kirim via Fonnte API
    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ target: targets, message: pesan, delay: '2' })
    });

    const result = await response.json();

    if (result.status) {
      return NextResponse.json({
        success: true,
        message: `Pesan berhasil dikirim ke ${count} kontak${target === 'pimpinan' ? ' Pimpinan' : ' GTK'}.`,
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
      pesan: r.get('Pesan'),
      target: r.get('Target') || 'Semua GTK'
    })).reverse();

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error) {
    return NextResponse.json({ success: false, data: [], total: 0 });
  }
}
