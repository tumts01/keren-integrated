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
  const prefix = 'BON';

  const taStart = (now.getMonth() + 1) >= 7 ? yyyy : yyyy - 1;
  const taEnd = taStart + 1;
  const currentTA = tahunAjaran || `${taStart}/${taEnd}`;

  await sheet.loadCells('A1:C500');
  let maxNum = 0;
  for (let i = 1; i < 500; i++) {
    const cellNoBon = sheet.getCell(i, 0); 
    const cellTA = sheet.getCell(i, 2);   
    const valNoBon = cellNoBon.value as string;
    const valTA = cellTA.value as string;
    if (!valNoBon) continue;
    if (valTA === currentTA || valNoBon.startsWith(`${prefix}-`)) {
      const regex = new RegExp(`${prefix}-\\d{4}\\/\\d{2}-(\\d{3})`);
      const match = valNoBon.match(regex);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) {
          if (!valTA || valTA === currentTA) maxNum = num;
        }
      }
    }
  }

  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `${prefix}-${yyyy}/${mm}-${nextNum}/${namaDepan}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { nama, jabatan, tanggal, keperluan, jumlahDiminta, rincian, penerima, keterangan, tahunAjaran, saldoTerpakai } = body;

    if (!nama || !keperluan || !rincian || !tanggal) {
      return NextResponse.json({ success: false, error: 'Data tidak lengkap' }, { status: 400 });
    }

    const namaDepan = nama.split(' ').find((w: string) => w.length > 2) || nama.split(' ')[0];
    const nominalDiminta = parseFloat(jumlahDiminta || '0');
    const nominalSaldoTerpakai = parseFloat(saldoTerpakai || '0');
    const terbilangText = terbilang(nominalDiminta) + ' rupiah';

    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['BonData'];

    const isSaldoOnly = nominalDiminta <= nominalSaldoTerpakai && nominalSaldoTerpakai > 0;
    const noBon = isSaldoOnly ? '' : await generateNoBon(sheet, namaDepan, tahunAjaran || '');

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
      SaldoTerpakai: String(nominalSaldoTerpakai),
      Terbilang: terbilangText,
      RincianJSON: JSON.stringify(rincian),
      PenerimaJSON: JSON.stringify(penerima || []),
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
