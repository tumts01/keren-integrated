import { NextResponse } from 'next/server';
import { getIndukDoc, getPresensiDoc } from '@/lib/google-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

function formatPhone(rawHp: string) {
  let hp = rawHp.replace(/\D/g, ''); // Remove non-numeric
  if (hp.startsWith('0')) {
    hp = '62' + hp.substring(1);
  }
  return hp;
}

export async function POST(request: Request) {
  try {
    const fd = await request.formData();
    const pesan = (fd.get('pesan') as string) || '';
    const pengirim = fd.get('pengirim') as string;
    const target = fd.get('target') as string;
    const phonesStr = fd.get('phones') as string;
    const phones = phonesStr ? JSON.parse(phonesStr) : [];
    const viaAppOnly = (fd.get('viaAppOnly') as string) === 'true';
    const file = fd.get('file') as File | null;

    if (!pesan && !file) {
      return NextResponse.json({ success: false, error: 'Pesan atau lampiran tidak boleh kosong' }, { status: 400 });
    }

    const token = process.env.FONNTE_TOKEN;
    if (!token && !viaAppOnly) {
      return NextResponse.json({ success: false, error: 'FONNTE_TOKEN belum dikonfigurasi' }, { status: 500 });
    }
    
    let lampiranUrl = '';
    if (file && file.size > 0) {
      const folderId = process.env.GOOGLE_DRIVE_PERSURATAN_FOLDER_ID || '';
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      try {
        const driveRes = await uploadFileToDrive(buffer, file.name, file.type, folderId);
        lampiranUrl = driveRes.webViewLink || '';
      } catch (e) {
        console.error('Upload to Drive failed', e);
      }
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

      if (pimpinanNames.length === 0 && !viaAppOnly) {
        return NextResponse.json({ success: false, error: 'Tidak ada user dengan role Pimpinan ditemukan' }, { status: 404 });
      }

      // Match nama pimpinan ke db_GTK
      const phonesArr: string[] = [];
      pimpinanNames.forEach(pn => {
        if (gtkMap[pn]) { phonesArr.push(formatPhone(gtkMap[pn])); return; }
        const key = Object.keys(gtkMap).find(k => k.includes(pn) || pn.includes(k));
        if (key) phonesArr.push(formatPhone(gtkMap[key]));
      });

      if (phonesArr.length === 0) {
        userRows
          .filter(r => (r.get('Rule') || '').toLowerCase().trim() === 'pimpinan')
          .forEach(r => {
            const hp = (r.get('No WA') || r.get('HP') || r.get('NoHP') || '').trim();
            if (hp.length >= 8) phonesArr.push(formatPhone(hp));
          });
      }

      if (phonesArr.length === 0 && !viaAppOnly) {
        return NextResponse.json({ success: false, error: 'Nomor WA pimpinan tidak ditemukan.' }, { status: 404 });
      }

      targets = [...new Set(phonesArr)].join(',');
      count = phonesArr.length;
    } else if (target === 'custom' && Array.isArray(phones) && phones.length > 0) {
      // 2b. Custom — kirim ke nomor-nomor yang dipilih
      const formatted = phones.map((hp: string) => formatPhone(hp)).filter(hp => hp.length >= 8);
      if (formatted.length === 0 && !viaAppOnly) {
        return NextResponse.json({ success: false, error: 'Tidak ada nomor WA yang valid' }, { status: 400 });
      }
      targets = [...new Set(formatted)].join(',');
      count = formatted.length;
    } else {
      // 2b. Kirim ke semua GTK aktif
      const allPhones = Object.values(gtkMap).map(hp => formatPhone(hp));
      if (allPhones.length === 0 && !viaAppOnly) {
        return NextResponse.json({ success: false, error: 'Tidak ada nomor WA GTK aktif yang ditemukan' }, { status: 404 });
      }
      targets = allPhones.join(',');
      count = allPhones.length;
    }

    // 3. Simpan Riwayat ke Spreadsheet
    try {
      const presensiDoc = await getPresensiDoc();
      const expectedHeaders = ['Tanggal', 'Jam', 'Pengirim', 'Pesan', 'Target', 'Lampiran'];
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

      const targetLabel = viaAppOnly ? (target === 'pimpinan' ? 'Aplikasi: Pimpinan' : 'Aplikasi: Semua GTK') : (target === 'pimpinan' ? 'Pimpinan' : target === 'custom' ? `${count} Guru Pilihan` : 'Semua GTK');
      await sheetPengumuman.addRow({
        Tanggal: tanggal,
        Jam: jam,
        Pengirim: pengirim || 'Admin',
        Pesan: pesan,
        Target: targetLabel,
        Lampiran: lampiranUrl
      });
    } catch (sheetError) {
      console.error('Gagal menyimpan log ke Spreadsheet:', sheetError);
    }

    // 4. Kirim via Fonnte API (Jika viaAppOnly false)
    if (viaAppOnly) {
      return NextResponse.json({
        success: true,
        message: `Pengumuman berhasil diposting di aplikasi (tanpa pesan WA).`,
        data: { status: true }
      });
    }

    // Use Fonnte API with FormData to support file attachments
    const fonnteFd = new FormData();
    fonnteFd.append('target', targets);
    if (pesan) fonnteFd.append('message', pesan);
    fonnteFd.append('delay', '15-30');
    if (file) fonnteFd.append('file', file);

    const response = await fetch('https://api.fonnte.com/send', {
      method: 'POST',
      headers: {
        'Authorization': token || ''
      },
      body: fonnteFd
    });

    const result = await response.json();

    if (result.status) {
      return NextResponse.json({
        success: true,
        message: `Pesan berhasil dikirim ke ${count} kontak${target === 'pimpinan' ? ' Pimpinan' : target === 'custom' ? ' Guru Pilihan' : ' GTK'}.`,
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const listType = searchParams.get('list');

    // Kembalikan daftar GTK aktif beserta nomor WA untuk custom send
    if (listType === 'gtk') {
      const indukDoc = await getIndukDoc();
      const sheetGtk = indukDoc.sheetsByTitle['db_GTK'];
      if (!sheetGtk) return NextResponse.json({ success: false, data: [] });
      const rows = await sheetGtk.getRows();
      const data = rows
        .filter(r => (r.get('Status') || '').toLowerCase().trim() === 'aktif')
        .map(r => ({
          nama: r.get('Nama') || '',
          noWA: r.get('No WA') || '',
          jabatan: r.get('Jabatan') || r.get('Pangkat') || ''
        }))
        .filter(r => r.nama && r.noWA.length >= 8)
        .sort((a, b) => a.nama.localeCompare(b.nama));
      return NextResponse.json({ success: true, data });
    }

    // Default: kembalikan riwayat pengumuman
    const presensiDoc = await getPresensiDoc();
    const sheetPengumuman = presensiDoc.sheetsByTitle['PENGUMUMAN'];
    if (!sheetPengumuman) return NextResponse.json({ success: true, data: [], total: 0 });

    const rows = await sheetPengumuman.getRows();
    const data = rows.map(r => ({
      tanggal: r.get('Tanggal'),
      jam: r.get('Jam'),
      pengirim: r.get('Pengirim'),
      pesan: r.get('Pesan'),
      target: r.get('Target') || 'Semua GTK',
      lampiran: r.get('Lampiran') || ''
    })).reverse();

    return NextResponse.json({ success: true, data, total: data.length });
  } catch (error) {
    return NextResponse.json({ success: false, data: [], total: 0 });
  }
}
