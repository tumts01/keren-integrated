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

async function generateNoBon(sheet: any, namaDepan: string, tahunAjaran: string): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  // Tahun ajaran: mulai Juli (bulan 7). Jika bulan < 7 berarti tahun ajaran sebelumnya.
  // Contoh: Juli 2026 = TA 2026/2027. Januari 2027 = TA 2026/2027 juga.
  const taStart = (now.getMonth() + 1) >= 7 ? yyyy : yyyy - 1;
  const taEnd = taStart + 1;
  const currentTA = tahunAjaran || `${taStart}/${taEnd}`;

  // Scan semua NoBon yang TA-nya sama (dari kolom TahunAjaran, kolom index 2)
  // Ambil nomor urut terbesar di TA ini
  await sheet.loadCells('A1:C500');
  let maxNum = 0;
  for (let i = 1; i < 500; i++) {
    const cellNoBon = sheet.getCell(i, 0); // kolom NoBon
    const cellTA = sheet.getCell(i, 2);   // kolom TahunAjaran
    const valNoBon = cellNoBon.value as string;
    const valTA = cellTA.value as string;
    if (!valNoBon) continue;
    // Hitung nomor urut hanya jika tahun ajaran sama
    if (valTA === currentTA || valNoBon.startsWith('BON-')) {
      // Cari pola BON-YYYY/MM-NNN/Nama
      const match = valNoBon.match(/BON-\d{4}\/\d{2}-(\d{3})/);
      if (match) {
        const num = parseInt(match[1], 10);
        // Hanya hitung jika TA cocok (atau jika kolom TA kosong, asumsikan masih TA yang sama)
        if (!isNaN(num) && num > maxNum) {
          if (!valTA || valTA === currentTA) maxNum = num;
        }
      }
    }
  }

  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `BON-${yyyy}/${mm}-${nextNum}/${namaDepan}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, jabatan, tanggal, keperluan, jumlahDiminta, rincian, keterangan, tahunAjaran } = body;

    if (!nama || !keperluan || !rincian || !tanggal) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const namaDepan = nama.split(' ').find((w: string) => w.length > 2) || nama.split(' ')[0];
    const nominalDiminta = parseFloat(jumlahDiminta || '0');
    const terbilangText = terbilang(nominalDiminta) + ' rupiah';

    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['BonData'];

    const noBon = await generateNoBon(sheet, namaDepan, tahunAjaran || '');

    const now = new Date();
    const timestampStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    await sheet.addRow({
      NoBon: noBon,
      ID: noBon,
      TahunAjaran: tahunAjaran || '2026/2027',
      Tanggal: tanggal,
      Nama: nama,
      Jabatan: jabatan || 'Staf',
      Keperluan: keperluan,
      JumlahDiminta: String(nominalDiminta),
      Terbilang: terbilangText,
      RincianJSON: JSON.stringify(rincian),
      Keterangan: keterangan || '',
      Timestamp: timestampStr,
      Status: 'Draft'
    });

    return NextResponse.json({ success: true, noBon, terbilang: terbilangText });
  } catch (error: any) {
    console.error('Bon add error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
