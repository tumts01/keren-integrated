import { NextResponse } from 'next/server';
import { getBontuDoc } from '@/lib/google-sheets';
import { uploadFileToDrive } from '@/lib/google-drive';

// Ganti dengan folder ID Anda
const FOLDER_NOTA_ID = '1XMpQqdTzx0i_WaD79AHdgzhRUUmgQX6z';
const FOLDER_FOTO_ID = '17VLruiXLMYLr9cBIYQ6pvj13yDaZ868I';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    
    // Parse Text Fields
    const nama = formData.get('nama') as string;
    const keperluan = formData.get('keperluan') as string;
    const jumlahUang = formData.get('jumlahUang') as string;
    const rincianJSON = formData.get('rincianJSON') as string;
    
    // Parse Files
    const fileNota = formData.get('fileNota') as File | null;
    const fileFoto = formData.get('fileFoto') as File | null;

    let urlNota = '';
    let urlFoto = '';

    // Process Uploads
    if (fileNota && fileNota.size > 0) {
      const buffer = Buffer.from(await fileNota.arrayBuffer());
      const res = await uploadFileToDrive(buffer, fileNota.name, fileNota.type, FOLDER_NOTA_ID);
      urlNota = `https://drive.google.com/uc?export=view&id=${res.id}`;
    }

    if (fileFoto && fileFoto.size > 0) {
      const buffer = Buffer.from(await fileFoto.arrayBuffer());
      const res = await uploadFileToDrive(buffer, fileFoto.name, fileFoto.type, FOLDER_FOTO_ID);
      urlFoto = `https://drive.google.com/uc?export=view&id=${res.id}`;
    }

    // Generate ID & Timestamps
    const now = new Date();
    const idBon = `BON-${now.getTime()}`;
    const timestampStr = now.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const tanggalStr = now.toISOString().split('T')[0];
    
    // Save to Google Sheets
    const doc = await getBontuDoc();
    
    const sheetBon = doc.sheetsByTitle['BonData'] || doc.sheetsByIndex[0];
    await sheetBon.addRow({
      'ID': idBon,
      'TahunAjaran': '2026/2027', // Bisa dibikin dinamis
      'Tanggal': tanggalStr,
      'Nama': nama,
      'Jabatan': 'Staf', // Bisa diisi dinamis dari session
      'Keperluan': keperluan,
      'JumlahUang': jumlahUang,
      'Terbilang': '-', // Opsional bisa pakai library angkaterbilang
      'RincianJSON': rincianJSON,
      'Timestamp': timestampStr,
      'Status': 'Draft'
    });

    const sheetBukti = doc.sheetsByTitle['BelanjaBukti'];
    if (sheetBukti) {
      await sheetBukti.addRow({
        'ID': `BKT-${now.getTime()}`,
        'BonID': idBon,
        'TanggalBelanja': tanggalStr,
        'RincianJSON': rincianJSON,
        'SisaAnggaran': '0',
        'URLNota': urlNota,
        'URLFoto': urlFoto,
        'Keterangan': 'Diinput via Vercel',
        'Timestamp': timestampStr
      });
    }

    return NextResponse.json({ success: true, message: 'Nota Bon berhasil disimpan!' });

  } catch (error: any) {
    console.error('Error in Add Bon API:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
