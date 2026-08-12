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
    const penerimaJSON = formData.get('penerimaJSON') as string || '[]';

    const doc = await getBontuDoc();

    // Upload multiple files
    const buktiNotaFiles = formData.getAll('buktiNota') as File[];
    const buktiFotoFiles = formData.getAll('buktiFoto') as File[];

    const uploadAll = async (files: File[]) => {
      const urls: string[] = [];
      for (const file of files) {
        if (file && file.size > 0) {
          const buf = Buffer.from(await file.arrayBuffer());
          const res = await uploadFileToDrive(buf, file.name, file.type, FOLDER_BUKTI_ID);
          // Gunakan webViewLink dari GAS (sudah public), konversi ke thumbnail URL agar bisa tampil di <img>
          const fileId = res.id;
          const embedUrl = fileId
            ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`
            : (res.webViewLink || '');
          if (embedUrl) urls.push(embedUrl);
        }
      }
      return urls.join(',');
    };

    const urlBuktiNota = await uploadAll(buktiNotaFiles);
    const urlBuktiFoto = await uploadAll(buktiFotoFiles);

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
      PenerimaJSON: penerimaJSON,
      URLBuktiNota: urlBuktiNota,
      URLBuktiFoto: urlBuktiFoto,
      Keterangan: keterangan || '',
      Timestamp: timestamp
    });

    // Update BonData status to Selesai
    const bonSheet = doc.sheetsByTitle['BonData'];
    const rows = await bonSheet.getRows();
    let bonRow = rows.find(r => r.get('NoBon') === noBon || r.get('ID') === bonId);

    // Fallback: If it's a virtual SISA ID, find the corresponding empty row
    if (!bonRow && bonId && bonId.startsWith('SISA-')) {
      const match = bonId.match(/^SISA-(.+)-(\d+)$/);
      if (match) {
        bonRow = rows.find((r) => {
          if (r.get('NoBon') || r.get('ID')) return false;
          const nm = (r.get('Nama') || '').trim().split(' ')[0].toUpperCase();
          return nm === match[1];
        });
      }
    }

    if (bonRow) {
      bonRow.set('Status', 'Selesai');
      bonRow.set('JumlahRealisasi', jumlahRealisasi);
      
      // Save the generated virtual ID so it becomes permanent
      if (!bonRow.get('NoBon')) bonRow.set('NoBon', noBon);
      if (!bonRow.get('ID')) bonRow.set('ID', bonId);
      
      await bonRow.save();
    }

    return NextResponse.json({ success: true, sisa });
  } catch (error: any) {
    console.error('Realisasi error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get('id') as string;
    if (!id) return NextResponse.json({ success: false, error: 'ID Bukti tidak ditemukan' }, { status: 400 });

    const tanggalBelanja = formData.get('tanggalBelanja') as string;
    const rincianJSON = formData.get('rincianJSON') as string;
    const jumlahDiminta = formData.get('jumlahDiminta') as string;
    const jumlahRealisasi = formData.get('jumlahRealisasi') as string;
    const keterangan = formData.get('keterangan') as string;
    const penerimaJSON = formData.get('penerimaJSON') as string || '[]';

    const doc = await getBontuDoc();
    const buktiSheet = doc.sheetsByTitle['BelanjaBukti'];
    const rows = await buktiSheet.getRows();
    const buktiRow = rows.find(r => r.get('ID') === id || r.get('BonID') === id || r.get('NoBon') === id);

    if (!buktiRow) {
      return NextResponse.json({ success: false, error: 'Data realisasi tidak ditemukan' }, { status: 404 });
    }

    const sisa = parseFloat(jumlahDiminta || '0') - parseFloat(jumlahRealisasi || '0');
    
    // Check if new files are uploaded
    const buktiNotaFiles = formData.getAll('buktiNota') as File[];
    const buktiFotoFiles = formData.getAll('buktiFoto') as File[];

    const uploadAll = async (files: File[]) => {
      const urls: string[] = [];
      for (const file of files) {
        if (file && file.size > 0) {
          const buf = Buffer.from(await file.arrayBuffer());
          const res = await uploadFileToDrive(buf, file.name, file.type, FOLDER_BUKTI_ID);
          const fileId = res.id;
          const embedUrl = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200` : (res.webViewLink || '');
          if (embedUrl) urls.push(embedUrl);
        }
      }
      return urls.length > 0 ? urls.join(',') : null;
    };

    const newUrlBuktiNota = await uploadAll(buktiNotaFiles);
    const newUrlBuktiFoto = await uploadAll(buktiFotoFiles);

    buktiRow.set('TanggalBelanja', tanggalBelanja);
    buktiRow.set('RincianJSON', rincianJSON);
    buktiRow.set('JumlahDiminta', jumlahDiminta);
    buktiRow.set('JumlahRealisasi', jumlahRealisasi);
    buktiRow.set('SisaUang', String(sisa));
    buktiRow.set('PenerimaJSON', penerimaJSON);
    buktiRow.set('Keterangan', keterangan || '');
    if (newUrlBuktiNota) buktiRow.set('URLBuktiNota', newUrlBuktiNota);
    if (newUrlBuktiFoto) buktiRow.set('URLBuktiFoto', newUrlBuktiFoto);

    await buktiRow.save();

    // Update BonData with new JumlahRealisasi
    const bonSheet = doc.sheetsByTitle['BonData'];
    const bonRows = await bonSheet.getRows();
    const bonId = buktiRow.get('BonID') || buktiRow.get('NoBon');
    let bonRow = bonRows.find(r => r.get('NoBon') === buktiRow.get('NoBon') || r.get('ID') === bonId);
    
    if (!bonRow && bonId && bonId.startsWith('SISA-')) {
      const match = bonId.match(/^SISA-(.+)-(\d+)$/);
      if (match) {
        bonRow = bonRows.find((r) => {
          if (r.get('NoBon') || r.get('ID')) return false;
          const nm = (r.get('Nama') || '').trim().split(' ')[0].toUpperCase();
          return nm === match[1];
        });
      }
    }

    if (bonRow) {
      bonRow.set('JumlahRealisasi', jumlahRealisasi);
      
      if (!bonRow.get('NoBon')) bonRow.set('NoBon', buktiRow.get('NoBon'));
      if (!bonRow.get('ID')) bonRow.set('ID', bonId);
      
      await bonRow.save();
    }

    return NextResponse.json({ success: true, sisa });
  } catch (error: any) {
    console.error('Edit realisasi error:', error);
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
    return NextResponse.json({ success: true, data }, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' }
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
