import { NextResponse } from 'next/server';
import { getBontuDoc } from '@/lib/google-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

const FOLDER_BUKTI_ID = '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const bonId = formData.get('bonId') as string;
    const noBon = formData.get('noBon') as string;
    const tanggalBelanja = formData.get('tanggalBelanja') as string;
    const rincianJSON = formData.get('rincianJSON') as string;
    const jumlahDiminta = formData.get('jumlahDiminta') as string;
    const jumlahRealisasi = formData.get('jumlahRealisasi') as string;
    const keterangan = formData.get('keterangan') as string;
    const buktiNota = formData.get('buktiNota') as File | null;
    const buktiFoto = formData.get('buktiFoto') as File | null;

    const doc = await getBontuDoc();

    // Upload files if provided
    let urlBuktiNota = '';
    let urlBuktiFoto = '';
    if (buktiNota && buktiNota.size > 0) {
      const buf = Buffer.from(await buktiNota.arrayBuffer());
      const res = await uploadFileToDrive(buf, buktiNota.name, buktiNota.type, FOLDER_BUKTI_ID);
      urlBuktiNota = `https://drive.google.com/uc?export=view&id=${res.id}`;
    }
    if (buktiFoto && buktiFoto.size > 0) {
      const buf = Buffer.from(await buktiFoto.arrayBuffer());
      const res = await uploadFileToDrive(buf, buktiFoto.name, buktiFoto.type, FOLDER_BUKTI_ID);
      urlBuktiFoto = `https://drive.google.com/uc?export=view&id=${res.id}`;
    }

    const sisa = parseFloat(jumlahDiminta || '0') - parseFloat(jumlahRealisasi || '0');
    const now = new Date();
    const timestamp = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });

    // Save to BelanjaBukti
    const buktiSheet = doc.sheetsByTitle['BelanjaBukti'];
    await buktiSheet.addRow({
      ID: `BKT-${Date.now()}`,
      BonID: bonId,
      NoBon: noBon,
      TanggalBelanja: tanggalBelanja,
      RincianJSON: rincianJSON,
      JumlahDiminta: jumlahDiminta,
      JumlahRealisasi: jumlahRealisasi,
      SisaUang: String(sisa),
      URLBuktiNota: urlBuktiNota,
      URLBuktiFoto: urlBuktiFoto,
      Keterangan: keterangan || '',
      Timestamp: timestamp
    });

    // Update BonData status to Selesai
    const bonSheet = doc.sheetsByTitle['BonData'];
    const rows = await bonSheet.getRows();
    const bonRow = rows.find(r => r.get('NoBon') === noBon || r.get('ID') === bonId);
    if (bonRow) {
      bonRow.set('Status', 'Selesai');
      await bonRow.save();
    }

    return NextResponse.json({ success: true, sisa });
  } catch (error: any) {
    console.error('Realisasi error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // Get realisasi by BonID
  try {
    const { searchParams } = new URL(request.url);
    const bonId = searchParams.get('bonId');
    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['BelanjaBukti'];
    const rows = await sheet.getRows();
    let data = rows.map(r => r.toObject());
    if (bonId) data = data.filter(r => r['BonID'] === bonId || r['NoBon'] === bonId);
    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
