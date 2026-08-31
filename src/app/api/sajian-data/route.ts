import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 1. Data Guru & Staf (menggunakan data_guru sebagai ganti db_GTK dan JadwalMengajar)
    const { data: profilLembaga, error: errorProfil } = await supabase.from('data_guru').select('*');
    if (errorProfil) throw errorProfil;
    
    const gtkRows = profilLembaga || [];

    const sertifikasiMap: Record<string, boolean> = {};
    gtkRows.forEach((r: any) => {
      const nama = (r.nama || '').trim().toLowerCase();
      
      const sertifikasiVal = (r.metadata?.['SERTIFIKASI'] || r.metadata?.['Sertifikasi'] || '').trim().toLowerCase();
      const isSertifikasi = sertifikasiVal === 'ya' || sertifikasiVal === 'sudah' || sertifikasiVal !== ''; 
      
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

    gtkRows.forEach((r: any) => {
      const getVal = (key1: string, key2?: string, key3?: string) => {
        return (r.metadata?.[key1] || (key2 ? r.metadata?.[key2] : '') || (key3 ? r.metadata?.[key3] : ''))?.toString() || '';
      };

      const statusAktif = getVal('Status', 'STATUS', 'Status Guru').toLowerCase();
      if (statusAktif === 'tidak aktif' || statusAktif === 'nonaktif') return;

      const nama = (r.nama || '').trim();
      if (!nama) return;

      const lpRaw = getVal('L/P', 'Jenis Kelamin', 'JENIS KELAMIN').trim().toUpperCase();
      const lp = lpRaw === 'L' || lpRaw === 'LAKI-LAKI' ? 'L' : (lpRaw === 'P' || lpRaw === 'PEREMPUAN' ? 'P' : 'Lainnya');
      
      if (lp === 'L' || lp === 'P') {
        gtkStats.total[lp]++;
        gtkStats.total.Total++;
      }

      const pend = getVal('Pendidikan', 'PENDIDIKAN').toUpperCase().trim();
      let pendKey = 'Lainnya';
      if (pend.includes('S3')) pendKey = 'S3';
      else if (pend.includes('S2')) pendKey = 'S2';
      else if (pend.includes('S1') || pend.includes('D4')) pendKey = 'S1';
      else if (pend.includes('SMA') || pend.includes('SMK') || pend.includes('SLTA')) pendKey = 'SMA/K';
      
      if ((lp === 'L' || lp === 'P') && gtkStats.pendidikan[pendKey as keyof typeof gtkStats.pendidikan]) {
        gtkStats.pendidikan[pendKey as keyof typeof gtkStats.pendidikan][lp]++;
      }

      const dom = getVal('Domisili', 'DOMISILI').trim().toLowerCase();
      let domKey = 'Belum terdata';
      if (dom === 'malang' || dom.includes('malang raya')) domKey = 'Malang Raya';
      else if (dom === 'luar malang' || dom.includes('luar')) domKey = 'Non Malang Raya';
      else if (dom !== '') domKey = 'Belum terdata';

      if ((lp === 'L' || lp === 'P') && gtkStats.domisili[domKey as keyof typeof gtkStats.domisili]) {
        gtkStats.domisili[domKey as keyof typeof gtkStats.domisili][lp]++;
      }

      const stat = getVal('Status Guru', 'STATUS GURU').toUpperCase().trim();
      let statKey = 'Lainnya';
      if (stat.includes('DPK')) statKey = 'DPK';
      else if (stat.includes('GTY')) statKey = 'GTY';
      else if (stat.includes('PTY')) statKey = 'PTY';
      else if (stat.includes('GTT')) statKey = 'GTT';
      else if (stat.includes('PTT')) statKey = 'PTT';
      
      if ((lp === 'L' || lp === 'P') && gtkStats.status[statKey as keyof typeof gtkStats.status]) {
        gtkStats.status[statKey as keyof typeof gtkStats.status][lp]++;
      }

      if ((lp === 'L' || lp === 'P') && sertifikasiMap[nama.toLowerCase()]) {
        gtkStats.sertifikasi[lp]++;
      }
    });

    // 2. Data Siswa
    const pageSize = 1000;
    const pages = [0, 1, 2, 3];
    const siswaResults = await Promise.all(
      pages.map(page => 
        supabase
          .from('data_induk')
          .select('*')
          .range(page * pageSize, (page + 1) * pageSize - 1)
      )
    );
    for (const res of siswaResults) {
      if (res.error) throw res.error;
    }
    const siswaRows = siswaResults.flatMap(r => r.data || []);

    const siswaStats = {
      total: { L: 0, P: 0, Total: 0 },
      asalSekolah: {
        SD: { L: 0, P: 0 },
        MI: { L: 0, P: 0 },
        'Tanpa Keterangan': { L: 0, P: 0 }
      },
      domisili: {
        Rumah: { L: 0, P: 0 },
        Pesantren: { L: 0, P: 0 },
        'Belum terdata': { L: 0, P: 0 }
      },
      rincianAsalSekolah7: {} as any
    };

    siswaRows.forEach((r: any) => {
      const getVal = (key1: string, key2?: string, key3?: string, key4?: string) => {
        return (r.metadata?.[key1] || (key2 ? r.metadata?.[key2] : '') || (key3 ? r.metadata?.[key3] : '') || (key4 ? r.metadata?.[key4] : ''))?.toString() || '';
      };

      const statusAktif = getVal('Status Siswa', 'STATUS SISWA', 'Ket', 'KETERANGAN').toLowerCase().trim();
      if (statusAktif !== 'aktif') return;

      const nama = r.nama;
      if (!nama) return; 

      const lpRaw = getVal('L/P', 'Jenis Kelamin', 'JENIS KELAMIN').trim().toUpperCase();
      const lp = lpRaw === 'L' || lpRaw === 'LAKI-LAKI' ? 'L' : (lpRaw === 'P' || lpRaw === 'PEREMPUAN' ? 'P' : 'Lainnya');
      
      siswaStats.total.Total++;
      if (lp === 'L' || lp === 'P') {
        siswaStats.total[lp]++;
      }

      const asal = getVal('SD/MI', 'ASAL SEKOLAH').toUpperCase().trim();
      let asalKey = 'Tanpa Keterangan';
      if (asal.includes('SD')) asalKey = 'SD';
      else if (asal.includes('MI')) asalKey = 'MI';
      
      if (siswaStats.asalSekolah[asalKey as keyof typeof siswaStats.asalSekolah]) {
        if (lp === 'L' || lp === 'P') {
          siswaStats.asalSekolah[asalKey as keyof typeof siswaStats.asalSekolah][lp]++;
        }
      }

      const ta7 = getVal('TA KELAS 7');
      const ta8 = getVal('TA KELAS 8');
      const ta9 = getVal('TA KELAS 9');
      
      if (ta7 && !ta8 && !ta9) {
        let key = asal;
        if (!key || key === '-') key = 'TIDAK DIKETAHUI';
        siswaStats.rincianAsalSekolah7[key] = (siswaStats.rincianAsalSekolah7[key] || 0) + 1;
      }

      const dom = getVal('DOMISILI', 'Domisili').toLowerCase().trim();
      let domKey = 'Belum terdata';
      if (!dom) {
        domKey = 'Belum terdata';
      } else if (dom === 'rumah' || dom.includes('rumah')) {
        domKey = 'Rumah';
      } else {
        domKey = 'Pesantren';
      }
      if (lp === 'L' || lp === 'P') {
        siswaStats.domisili[domKey as keyof typeof siswaStats.domisili][lp]++;
      }
    });

    siswaStats.rincianAsalSekolah7 = Object.entries(siswaStats.rincianAsalSekolah7)
      .map(([nama, jumlah]) => ({ nama, jumlah }))
      .sort((a: any, b: any) => b.jumlah - a.jumlah);

    return NextResponse.json({
      success: true,
      data: {
        guruStaf: gtkStats,
        siswa: siswaStats
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' }
    });

  } catch (error: any) {
    console.error('API Sajian Data Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
