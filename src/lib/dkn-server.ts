import path from 'path';
import fs from 'fs';
import * as xlsx from 'xlsx';
import {
  DKN_MAPELS,
  calculateNR,
  calculateNM,
  normalizeName,
  DknMapelGrade
} from './dkn';

// In-memory cache for DKN.xlsx template
let cachedTemplateData: Map<string, any> | null = null;

export function getFallbackTemplateData(): Map<string, any> {
  if (cachedTemplateData) return cachedTemplateData;

  const dataMap = new Map<string, any>();
  try {
    const templatePath = path.join(process.cwd(), 'public', 'DKN.xlsx');
    if (!fs.existsSync(templatePath)) {
      cachedTemplateData = dataMap;
      return dataMap;
    }

    const wb = xlsx.readFile(templatePath);
    const sheetName = wb.SheetNames[0];
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json<any[]>(ws, { header: 1 });

    for (let i = 5; i < rows.length; i++) {
      const row = rows[i];
      if (!row || (!row[1] && !row[3])) continue;

      const nomor_peserta = String(row[0] || '').trim();
      const nisn = String(row[1] || '').trim();
      const nomor_induk = String(row[2] || '').trim();
      const nama = String(row[3] || '').trim();
      const tempat_lahir = String(row[4] || '').trim();
      const tanggal_lahir = String(row[5] || '').trim();
      const jenis_kelamin = String(row[6] || '').trim();
      const nama_ayah = String(row[7] || '').trim();

      const grades: Record<string, DknMapelGrade> = {};

      DKN_MAPELS.forEach((m, idx) => {
        const colStart = 8 + (idx * 8);
        const r1 = row[colStart] !== undefined && row[colStart] !== '' ? Number(row[colStart]) : null;
        const r2 = row[colStart + 1] !== undefined && row[colStart + 1] !== '' ? Number(row[colStart + 1]) : null;
        const r3 = row[colStart + 2] !== undefined && row[colStart + 2] !== '' ? Number(row[colStart + 2]) : null;
        const r4 = row[colStart + 3] !== undefined && row[colStart + 3] !== '' ? Number(row[colStart + 3]) : null;
        const r5 = row[colStart + 4] !== undefined && row[colStart + 4] !== '' ? Number(row[colStart + 4]) : null;
        const nr = row[colStart + 5] !== undefined && row[colStart + 5] !== '' ? Number(row[colStart + 5]) : calculateNR(r1, r2, r3, r4, r5);
        const num = row[colStart + 6] !== undefined && row[colStart + 6] !== '' ? Number(row[colStart + 6]) : null;
        const nm = row[colStart + 7] !== undefined && row[colStart + 7] !== '' ? Number(row[colStart + 7]) : calculateNM(nr, num);

        grades[m.name] = { r1, r2, r3, r4, r5, nr, num, nm };
      });

      const jumlah_nm = row[136] !== undefined && row[136] !== '' ? Number(row[136]) : 0;
      const rata_rata_nm = row[137] !== undefined && row[137] !== '' ? Number(row[137]) : 0;
      const status_lulus = String(row[138] || 'LULUS').trim();

      const item = {
        nomor_peserta,
        nisn,
        nomor_induk,
        nama,
        tempat_lahir,
        tanggal_lahir,
        jenis_kelamin,
        nama_ayah,
        grades,
        jumlah_nm,
        rata_rata_nm,
        status_lulus
      };

      if (nisn) dataMap.set(`nisn:${nisn}`, item);
      if (nama) dataMap.set(`name:${normalizeName(nama)}`, item);
    }

    cachedTemplateData = dataMap;
  } catch (err) {
    console.error('Error loading fallback DKN template data:', err);
    cachedTemplateData = dataMap;
  }

  return cachedTemplateData;
}
