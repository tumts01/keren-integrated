const fs = require('fs');
let c = fs.readFileSync('D:/keren-integrated/src/app/api/siswa/route.ts', 'utf8');

if (!c.includes('import { supabase }')) {
  c = c.replace(
    "import { getIndukDoc } from '@/lib/google-sheets';",
    "import { getIndukDoc } from '@/lib/google-sheets';\nimport { supabase } from '@/lib/supabase';"
  );
}

const getBlockOld = \    const doc = await getIndukDoc();
    const sheet = doc.sheetsByTitle['DATABASE'];
    
    if (!sheet) {
      return NextResponse.json({ success: false, error: 'Tab DATABASE tidak ditemukan' }, { status: 404 });
    }

    const rows = await sheet.getRows();\;

const getBlockNew = \    const { data: sbRows, error } = await supabase.from('data_induk').select('*');
    if (error) throw error;
    
    // Mock Google Sheet row interface
    const rows = sbRows.map((sbRow: any) => ({
      get: (key: string) => sbRow.metadata[key] || ''
    }));\;

c = c.replace(getBlockOld, getBlockNew);

const postBlockOld = \    // Simpan
    await sheet.saveUpdatedCells();

    return NextResponse.json({ success: true, message: 'Siswa mutasi masuk berhasil ditambahkan.' });\;

const postBlockNew = \    // Simpan
    await sheet.saveUpdatedCells();

    // DUAL-WRITE KE SUPABASE
    try {
      const payload = {
        id_siswa: fields.nis || '',
        nama: (fields.nama || '').trim(),
        metadata: rowData
      };
      await supabase.from('data_induk').insert(payload);
    } catch (sbError) {
      console.error('Error insert mutasi ke Supabase:', sbError);
    }

    return NextResponse.json({ success: true, message: 'Siswa mutasi masuk berhasil ditambahkan.' });\;

c = c.replace(postBlockOld, postBlockNew);
fs.writeFileSync('D:/keren-integrated/src/app/api/siswa/route.ts', c);
console.log('Update Data Induk API');
