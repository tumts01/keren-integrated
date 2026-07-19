import { NextResponse } from 'next/server';
import { getBontuDoc } from '@/lib/google-sheets';

function terbilang(angka: number): string {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
    'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas',
    'tujuh belas', 'delapan belas', 'sembilan belas'];
  if (angka === 0) return 'nol';
  if (angka < 20) return satuan[angka];
  if (angka < 100) return satuan[Math.floor(angka / 10)] + ' puluh' + (angka % 10 !== 0 ? ' ' + satuan[angka % 10] : '');
  if (angka < 200) return 'seratus' + (angka % 100 !== 0 ? ' ' + terbilang(angka % 100) : '');
  if (angka < 1000) return satuan[Math.floor(angka / 100)] + ' ratus' + (angka % 100 !== 0 ? ' ' + terbilang(angka % 100) : '');
  if (angka < 2000) return 'seribu' + (angka % 1000 !== 0 ? ' ' + terbilang(angka % 1000) : '');
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' ribu' + (angka % 1000 !== 0 ? ' ' + terbilang(angka % 1000) : '');
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' juta' + (angka % 1000000 !== 0 ? ' ' + terbilang(angka % 1000000) : '');
  return terbilang(Math.floor(angka / 1000000000)) + ' miliar' + (angka % 1000000000 !== 0 ? ' ' + terbilang(angka % 1000000000) : '');
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { noBon, nama, jabatan, tanggal, keperluan, jumlahDiminta, rincian, penerima, keterangan } = body;

    if (!noBon) {
      return NextResponse.json({ success: false, error: 'NoBon wajib diisi' }, { status: 400 });
    }

    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['BonData'];
    const rows = await sheet.getRows();

    // Cari baris berdasarkan NoBon atau ID
    const row = rows.find(r =>
      (r.get('NoBon') === noBon) || (r.get('ID') === noBon)
    );

    if (!row) {
      return NextResponse.json({ success: false, error: `BON dengan nomor ${noBon} tidak ditemukan` }, { status: 404 });
    }

    const nominal = parseFloat(String(jumlahDiminta || '0').replace(/[^0-9]/g, ''));
    const terbilangText = terbilang(nominal) + ' rupiah';

    // Update field-field yang boleh diedit
    if (nama)         row.set('Nama', nama);
    if (jabatan)      row.set('Jabatan', jabatan);
    if (tanggal)      row.set('Tanggal', tanggal);
    if (keperluan)    row.set('Keperluan', keperluan);
    row.set('JumlahDiminta', String(nominal));
    row.set('Terbilang', terbilangText);
    row.set('RincianJSON', JSON.stringify(rincian || []));
    row.set('PenerimaJSON', JSON.stringify(penerima || []));
    row.set('Keterangan', keterangan || '');

    // Tandai sebagai Draft (sudah direvisi, belum final)
    row.set('Status', 'Draft');

    await row.save();

    return NextResponse.json({ success: true, message: 'Pengajuan BON berhasil diperbarui', noBon });
  } catch (error: any) {
    console.error('Bon update error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
