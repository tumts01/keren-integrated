import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const DAYS = ['SENIN', 'SELASA', 'RABU', 'KAMIS', 'JUMAT', 'SABTU'];

export async function GET() {
  try {
    const [{ data: jadwalMengajar }, { data: masterJadwal }] = await Promise.all([
      supabase.from('jadwal_mengajar').select('*'),
      supabase.from('data_master_jadwal').select('*').single()
    ]);
    
    // 1. Ambil Data Guru & Mapel dari Induk (JadwalMengajar) via Supabase
    const mapKodeGuru: Record<string, { namaGuru: string, mataPelajaran: string }> = {};
    if (jadwalMengajar) {
      jadwalMengajar.forEach((r: any) => {
        const kode = (r.metadata?.['kodeGuru'] || '').toString().trim();
        if (kode) {
          mapKodeGuru[kode] = {
            namaGuru: r.metadata?.['namaGuru'] || '',
            mataPelajaran: r.metadata?.['mataPelajaran'] || ''
          };
        }
      });
    }

    // 2. Ambil Jadwal Pelajaran (MASTER TEMPLATE JADWAL) dari Supabase JSON
    if (!masterJadwal || !masterJadwal.metadata || !masterJadwal.metadata.rows) {
      return NextResponse.json({ success: false, error: 'Data MASTER TEMPLATE JADWAL tidak ditemukan di Supabase' }, { status: 404 });
    }

    const rows = masterJadwal.metadata.rows;
    const rowCount = rows.length;
    
    const parsedData: any[] = [];
    const activeBlocks: Record<number, { day: string, classColMap: Record<number, string> }> = {};

    for (let r = 0; r < rowCount - 1; r++) {
      let isHeaderRow = false;
      const colCount = rows[r].length;
      for (let c = 0; c < colCount - 1; c++) {
        const valC = rows[r][c];
        const valC1 = rows[r][c + 1];

        if (String(valC).trim().toUpperCase() === 'JAM' && String(valC1).trim() === 'WAKTU') {
          isHeaderRow = true;
          // Temukan HARI (dari sel sebelum JAM, biasanya di baris r-1)
          let currentDay = '';
          if (r > 0) {
            let dayText = String(rows[r - 1][c] || '').toUpperCase().trim();
            for (const d of DAYS) {
              if (dayText.includes(d)) {
                currentDay = d; break;
              }
            }
          }
          if (!currentDay) currentDay = 'UNKNOWN';
          
          const classColMap: Record<number, string> = {};
          for (let k = c + 2; k < colCount; k++) {
            const classVal = String(rows[r][k] || '').trim();
            if (classVal) {
              classColMap[k] = classVal;
            } else if (Object.keys(classColMap).length > 0) {
              // Jika kosong tapi sudah ada kelas sebelumnya, bisa jadi spacer/akhir block
              break;
            }
          }
          
          activeBlocks[c] = { day: currentDay, classColMap };
        }
      }

      if (isHeaderRow) continue;

      for (const jamColStr in activeBlocks) {
        const jamCol = parseInt(jamColStr);
        const block = activeBlocks[jamCol];
        
        const jamKe = String(rows[r][jamCol] || '').trim();
        const waktu = String(rows[r][jamCol + 1] || '').trim();
        
        if (!jamKe || jamKe.toLowerCase().includes('istirahat') || isNaN(parseInt(jamKe))) {
          continue; 
        }

        for (const classColStr in block.classColMap) {
          const classCol = parseInt(classColStr);
          const className = block.classColMap[classCol];
          let kodeGuruRaw = String(rows[r][classCol] || '').trim();
          
          // Pisahkan guru per kelas jika ada yang digabung misal "60/70"
          const kodes = kodeGuruRaw.split('/').map(k => k.trim()).filter(Boolean);

          for (const kode of kodes) {
            const guruInfo = mapKodeGuru[kode];
            if (guruInfo) {
              parsedData.push({
                hari: block.day,
                kelas: className,
                jamKe,
                waktu,
                kodeGuru: kode,
                namaGuru: guruInfo.namaGuru,
                mataPelajaran: guruInfo.mataPelajaran
              });
            } else {
              // Simpan kode meskipun guru tidak ditemukan (misal kode ekskul / BK)
              parsedData.push({
                hari: block.day,
                kelas: className,
                jamKe,
                waktu,
                kodeGuru: kode,
                namaGuru: 'TIDAK DIKETAHUI / EKSKUL',
                mataPelajaran: 'TIDAK DIKETAHUI'
              });
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, data: parsedData }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('Jadwal Fetch Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal memuat jadwal' }, { status: 500 });
  }
}
