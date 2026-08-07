import { NextResponse } from 'next/server';
import { getBontuDoc } from '@/lib/google-sheets';

export async function GET(request: Request) {
  try {
    const doc = await getBontuDoc();
    const sheet = doc.sheetsByTitle['BonData'];
    const buktiSheet = doc.sheetsByTitle['BelanjaBukti'];

    await sheet.loadCells('A1:L500'); // Load cells for faster access if needed, but getRows is easier to save
    const rows = await sheet.getRows();
    
    let buktiRows: any[] = [];
    if (buktiSheet) {
      buktiRows = await buktiSheet.getRows();
    }

    let modifiedCount = 0;
    const logs: string[] = [];

    for (const row of rows) {
      const obj = row.toObject();
      const noBon = obj['NoBon'] || obj['ID'];
      const jumlahDiminta = parseFloat(obj['JumlahDiminta'] || '0');
      const saldoTerpakai = parseFloat(obj['SaldoTerpakai'] || '0');

      if (noBon && noBon.startsWith('BON-') && jumlahDiminta <= saldoTerpakai && saldoTerpakai > 0) {
        const newId = noBon.replace(/^BON-/, 'SALDO-');
        
        row.set('NoBon', newId);
        row.set('ID', newId);
        await row.save();
        
        logs.push(`Changed ${noBon} to ${newId} in BonData`);
        modifiedCount++;

        // Update Bukti
        for (const bRow of buktiRows) {
          const bObj = bRow.toObject();
          if (bObj['NoBon'] === noBon || bObj['BonID'] === noBon) {
            if (bObj['NoBon'] === noBon) bRow.set('NoBon', newId);
            if (bObj['BonID'] === noBon) bRow.set('BonID', newId);
            await bRow.save();
            logs.push(`  -> Updated evidence for ${newId} in BelanjaBukti`);
          }
        }
      }
    }

    return NextResponse.json({ success: true, modifiedCount, logs });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
