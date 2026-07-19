import { NextResponse } from 'next/server';
import { getBontuDoc } from '@/lib/google-sheets';

// Helper: angka ke terbilang
function terbilang(angka: number): string {
  const satuan = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam', 'tujuh', 'delapan', 'sembilan',
    'sepuluh', 'sebelas', 'dua belas', 'tiga belas', 'empat belas', 'lima belas', 'enam belas',
    'tujuh belas', 'delapan belas', 'sembilan belas'];
  
  if (angka < 20) return satuan[angka];
  if (angka < 100) return satuan[Math.floor(angka / 10)] + ' puluh' + (angka % 10 !== 0 ? ' ' + satuan[angka % 10] : '');
  if (angka < 200) return 'seratus' + (angka % 100 !== 0 ? ' ' + terbilang(angka % 100) : '');
  if (angka < 1000) return satuan[Math.floor(angka / 100)] + ' ratus' + (angka % 100 !== 0 ? ' ' + terbilang(angka % 100) : '');
  if (angka < 2000) return 'seribu' + (angka % 1000 !== 0 ? ' ' + terbilang(angka % 1000) : '');
  if (angka < 1000000) return terbilang(Math.floor(angka / 1000)) + ' ribu' + (angka % 1000 !== 0 ? ' ' + terbilang(angka % 1000) : '');
  if (angka < 1000000000) return terbilang(Math.floor(angka / 1000000)) + ' juta' + (angka % 1000000 !== 0 ? ' ' + terbilang(angka % 1000000) : '');
  return terbilang(Math.floor(angka / 1000000000)) + ' miliar' + (angka % 1000000000 !== 0 ? ' ' + terbilang(angka % 1000000000) : '');
}

// Generate NoBon: BON-YYYY/MM-XXX/NamaDepan, urutan direset per tahun ajaran
async function generateNoBon(doc: any, namaDepan: string, tahunAjaran?: string): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');

  // Tentukan tahun ajaran: Juli = awal TA baru
  const taStart = (now.getMonth() + 1) >= 7 ? yyyy : yyyy - 1;
  const taEnd = taStart + 1;
  const currentTA = tahunAjaran || `${taStart}/${taEnd}`;

  const sheet = doc.sheetsByTitle['BonData'];
  await sheet.loadCells('A1:C500');

  let maxNum = 0;
  for (let i = 1; i < 500; i++) {
    const cellNoBon = sheet.getCell(i, 0); // NoBon
    const cellTA   = sheet.getCell(i, 2); // TahunAjaran
    const valNoBon = cellNoBon.value as string;
    const valTA    = cellTA.value as string;
    if (!valNoBon) continue;
    // Hanya hitung nomor dalam TA yang sama
    if (!valTA || valTA === currentTA) {
      const match = valNoBon.match(/BON-\d{4}\/\d{2}-(\d{3})/);
      if (match) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    }
  }

  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `BON-${yyyy}/${mm}-${nextNum}/${namaDepan}`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').toLowerCase();
    const status = searchParams.get('status') || '';
    const tahun = searchParams.get('tahun') || '';
    const from = searchParams.get('from') || '';
    const to = searchParams.get('to') || '';

    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['BonData'];
    const rows = await sheet.getRows();

    let data = rows.map(row => row.toObject()).filter(r => r['NoBon'] || r['ID']);
    data = data.reverse();

    if (search) {
      data = data.filter(item =>
        (item['Nama'] || '').toLowerCase().includes(search) ||
        (item['NoBon'] || item['ID'] || '').toLowerCase().includes(search) ||
        (item['Keperluan'] || '').toLowerCase().includes(search) ||
        (item['Jabatan'] || '').toLowerCase().includes(search)
      );
    }
    if (status) data = data.filter(i => (i['Status'] || '').toLowerCase() === status.toLowerCase());
    if (tahun) data = data.filter(i => (i['TahunAjaran'] || '') === tahun);
    if (from) data = data.filter(i => (i['Tanggal'] || '') >= from);
    if (to) data = data.filter(i => (i['Tanggal'] || '') <= to);

    // Stats
    const total = data.length;
    const selesai = data.filter(i => (i['Status'] || '').toLowerCase() === 'selesai').length;
    const belumLapor = data.filter(i => (i['Status'] || '').toLowerCase() !== 'selesai').length;
    const totalNominal = data.reduce((s, i) => s + (parseFloat(i['JumlahDiminta'] || i['JumlahUang'] || '0')), 0);

    return NextResponse.json({ data, stats: { total, selesai, belumLapor, totalNominal } });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  // Generate NoBon preview (called to get next number)
  try {
    const body = await request.json();
    const doc = await getBontuDoc();
    const namaDepan = (body.namaDepan || 'User').split(' ')[0];
    const noBon = await generateNoBon(doc, namaDepan);
    return NextResponse.json({ noBon });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
