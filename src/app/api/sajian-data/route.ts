import { NextResponse } from 'next/server';
import { getIndukDoc } from '@/lib/google-sheets';

export async function GET() {
  try {
    const doc = await getIndukDoc();
    
    // 1. Data Guru & Staf
    const sheetGtk = doc.sheetsByTitle['db_GTK'];
    const sheetJadwal = doc.sheetsByTitle['JadwalMengajar'];
    
    let gtkRows: any[] = [];
    if (sheetGtk) {
      await sheetGtk.loadHeaderRow();
      gtkRows = await sheetGtk.getRows();
    }
    
    let jadwalRows: any[] = [];
    let headerSertifikasi = '';
    let headerNamaJadwal = '';
    if (sheetJadwal) {
      await sheetJadwal.loadHeaderRow();
      jadwalRows = await sheetJadwal.getRows();
      headerNamaJadwal = sheetJadwal.headerValues[2] || 'NAMA'; // Kolom C
      headerSertifikasi = sheetJadwal.headerValues[33] || 'SERTIFIKASI'; // Kolom AH
    }

    // Map sertifikasi dari JadwalMengajar by nama guru
    const sertifikasiMap: Record<string, boolean> = {};
    jadwalRows.forEach(r => {
      const nama = (r.get(headerNamaJadwal) || '').trim().toLowerCase();
      const isSertifikasi = (r.get(headerSertifikasi) || '').trim().toLowerCase() === 'ya' || 
                            (r.get(headerSertifikasi) || '').trim().toLowerCase() === 'sudah' || 
                            (r.get(headerSertifikasi) || '').trim() !== ''; 
      // Asumsi jika diisi berarti sertifikasi, atau cari teks spesifik
      if (nama) {
        sertifikasiMap[nama] = isSertifikasi;
      }
    });

    const gtkStats = {
      total: { L: 0, P: 0, Total: 0 },
      pendidikan: {
        S3: { L: 0, P: 0 },
        S2: { L: 0, P: 0 },
        S1: { L: 0, P: 0 },
        'SMA/K': { L: 0, P: 0 },
        Lainnya: { L: 0, P: 0 }
      },
      domisili: {
        'Malang Raya': { L: 0, P: 0 },
        'Non Malang Raya': { L: 0, P: 0 },
        'Belum terdata': { L: 0, P: 0 }
      },
      sertifikasi: { L: 0, P: 0 },
      status: {
        DPK: { L: 0, P: 0 },
        GTY: { L: 0, P: 0 },
        PTY: { L: 0, P: 0 },
        GTT: { L: 0, P: 0 },
        PTT: { L: 0, P: 0 },
        Lainnya: { L: 0, P: 0 }
      }
    };

    gtkRows.forEach(r => {
      // Pastikan guru aktif (jika ada kolom status aktif)
      const statusAktif = (r.get('Status') || r.get('STATUS') || '').toString().toLowerCase();
      if (statusAktif === 'tidak aktif' || statusAktif === 'nonaktif') return;

      const nama = (r.get('Nama') || r.get('NAMA') || '').toString().trim();
      if (!nama) return;

      const lpRaw = (r.get('L/P') || r.get('Jenis Kelamin') || r.get('JENIS KELAMIN') || '').toString().trim().toUpperCase();
      const lp = lpRaw === 'L' || lpRaw === 'LAKI-LAKI' ? 'L' : (lpRaw === 'P' || lpRaw === 'PEREMPUAN' ? 'P' : 'Lainnya');
      
      if (lp === 'L' || lp === 'P') {
        gtkStats.total[lp]++;
        gtkStats.total.Total++;
      }

      // Pendidikan
      const pend = (r.get('Pendidikan') || r.get('PENDIDIKAN') || '').toString().toUpperCase().trim();
      let pendKey = 'Lainnya';
      if (pend.includes('S3')) pendKey = 'S3';
      else if (pend.includes('S2')) pendKey = 'S2';
      else if (pend.includes('S1') || pend.includes('D4')) pendKey = 'S1';
      else if (pend.includes('SMA') || pend.includes('SMK') || pend.includes('SLTA')) pendKey = 'SMA/K';
      
      if ((lp === 'L' || lp === 'P') && gtkStats.pendidikan[pendKey as keyof typeof gtkStats.pendidikan]) {
        gtkStats.pendidikan[pendKey as keyof typeof gtkStats.pendidikan][lp]++;
      }

      // Domisili (kolom S) -> ambil dari get('Domisili') atau fallback ke get() manual?
      // User said "barusan saya tambahkan di kolom S dengan nama Domisili"
      const dom = (r.get('Domisili') || r.get('DOMISILI') || '').toString().trim().toLowerCase();
      let domKey = 'Belum terdata';
      if (dom === 'malang' || dom.includes('malang raya')) domKey = 'Malang Raya';
      else if (dom === 'luar malang' || dom.includes('luar')) domKey = 'Non Malang Raya';
      else if (dom !== '') domKey = 'Belum terdata'; // fallback

      if ((lp === 'L' || lp === 'P') && gtkStats.domisili[domKey as keyof typeof gtkStats.domisili]) {
        gtkStats.domisili[domKey as keyof typeof gtkStats.domisili][lp]++;
      }

      // Status Guru
      const stat = (r.get('Status Guru') || r.get('STATUS GURU') || '').toString().toUpperCase().trim();
      let statKey = 'Lainnya';
      if (stat.includes('DPK')) statKey = 'DPK';
      else if (stat.includes('GTY')) statKey = 'GTY';
      else if (stat.includes('PTY')) statKey = 'PTY';
      else if (stat.includes('GTT')) statKey = 'GTT';
      else if (stat.includes('PTT')) statKey = 'PTT';
      
      if ((lp === 'L' || lp === 'P') && gtkStats.status[statKey as keyof typeof gtkStats.status]) {
        gtkStats.status[statKey as keyof typeof gtkStats.status][lp]++;
      }

      // Sertifikasi
      if ((lp === 'L' || lp === 'P') && sertifikasiMap[nama.toLowerCase()]) {
        gtkStats.sertifikasi[lp]++;
      }
    });

    // 2. Data Siswa
    const sheetSiswa = doc.sheetsByTitle['DATABASE'];
    let siswaRows: any[] = [];
    let headerDomisili = '';
    let headerAsal = '';
    if (sheetSiswa) {
      await sheetSiswa.loadHeaderRow();
      siswaRows = await sheetSiswa.getRows();
      headerDomisili = sheetSiswa.headerValues[10] || 'DOMISILI'; // Kolom K
      headerAsal = sheetSiswa.headerValues[52] || 'ASAL SEKOLAH'; // Kolom BA
    }

    const siswaStats = {
      total: { L: 0, P: 0, Total: 0 },
      asalSekolah: {
        SD: { L: 0, P: 0 },
        MI: { L: 0, P: 0 },
        'Tanpa Keterangan': { L: 0, P: 0 }
      },
      domisili: {
        Rumah: 0,
        Pesantren: 0,
        'Belum terdata': 0
      }
    };

    siswaRows.forEach(r => {
      // Pastikan siswa aktif
      const statusAktif = (r.get('Ket') || r.get('KETERANGAN') || '').toString().toLowerCase();
      if (statusAktif === 'keluar' || statusAktif === 'lulus' || statusAktif === 'pindah') return;

      const nama = (r.get('Nama Siswa') || r.get('NAMA SISWA') || '').toString().trim();
      if (!nama) return; // Skip row kosong

      const lpRaw = (r.get('L/P') || r.get('Jenis Kelamin') || r.get('JENIS KELAMIN') || '').toString().trim().toUpperCase();
      const lp = lpRaw === 'L' || lpRaw === 'LAKI-LAKI' ? 'L' : (lpRaw === 'P' || lpRaw === 'PEREMPUAN' ? 'P' : 'Lainnya');
      
      if (lp === 'L' || lp === 'P') {
        siswaStats.total[lp]++;
        siswaStats.total.Total++;
      } else {
        return; // Jika jenis kelamin tidak valid, skip hitungan L/P rinciannya
      }

      // Asal Sekolah (Kolom BA)
      const asal = (r.get(headerAsal) || '').toString().toUpperCase().trim();
      let asalKey = 'Tanpa Keterangan';
      if (asal.includes('SD')) asalKey = 'SD';
      else if (asal.includes('MI')) asalKey = 'MI';
      
      if (siswaStats.asalSekolah[asalKey as keyof typeof siswaStats.asalSekolah]) {
        siswaStats.asalSekolah[asalKey as keyof typeof siswaStats.asalSekolah][lp]++;
      }

      // Domisili (Kolom K)
      const dom = (r.get(headerDomisili) || '').toString().toLowerCase().trim();
      if (!dom) {
        siswaStats.domisili['Belum terdata']++;
      } else if (dom === 'rumah') {
        siswaStats.domisili['Rumah']++;
      } else {
        // Jika selain rumah, maka pesantren
        siswaStats.domisili['Pesantren']++;
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        guruStaf: gtkStats,
        siswa: siswaStats
      }
    });

  } catch (error: any) {
    console.error('API Sajian Data Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
