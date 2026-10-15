import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const alasanWaliMuridMaster = [
  'Dekat dengan tempat tinggal',
  'Memiliki banyak program unggulan',
  'Biaya pendidikan sangat terjangkau',
  'Maju/Unggul dan berkualitas',
  'Dikelilingi oleh banyak pondok pesantren',
  'Lingkungan mendukung, aman dan nyaman ramah anak',
  'Sarana Prasarana memadai dan sangat mendukung proses Pembelajaran',
  'Menyediakan banyak pilihan Kegiatan ekstra kurikuler',
  'Menyelenggarakan kegiatan pembelajaran di luar Madrasah/alam bebas',
  'Memiliki Banyak kegiatan pembiasaan untuk mendukung pembelajaran dan pembentukan karaktet',
  'Pendiri dan pembina banyak dari tokoh kharismatik/ulama',
  'Menerapkan model pembelajaran yang menyenangkan dan bermakna',
  'Menyelenggarakan kelas sesuai dengan minat anak',
  'Lulusannya unggul/berkualitas dan banyak mengabdi di berbagai bidang',
  'Gurunya memiliki kemampuan yang baik dalam mengajar',
  'Mengutamakan pendidikan karakter (Akhlak Mulia)',
  'Mengajarkan Wawasan Ahlussunnah waljamaah an Nahdhiyah',
  'Saya alumni MTs Almaarif 01 Singosari',
  'Atas saran dari pengasuh pondok pesantren'
];

const infoWaliMuridMaster = [
  'Dari tetangga/teman',
  'Dari alumni',
  'Dari pengasuh pesantren',
  'Dari guru MTs Almaarif',
  'Dari Web/IG/Tik tok MTs Almaarif',
  'Dari dikoran/majalah',
  'Dari brosur',
  'Dari kegiatan yang diadakan oleh MTs'
];

const alasanSiswaMaster = [
  'MTs Almaarif 01 dekat dengan rumah saya',
  'MTs Almaarif 01 memiliki banyak program unggulan',
  'MTs Almaarif 01 maju dan berkualitas',
  'MTs Almaarif 01 dikelilingi pondok pesantren',
  'MTs Almaarif 01 Lingkungannya mendukung, aman dan nyaman',
  'Di MTs Almaarif 01 sarana prasarana memadai dan sangat mendukung proses pembelajaran',
  'MTs Almaarif 01 memiliki banyak pilihan kegiatan ekstra kurikuler',
  'MTs Almaarif 01 memiliki program kegiatan pembelajaran di luar madrasah/alam bebas',
  'MTs Almaarif 01 memiliki banyak kegiatan pembiasaan untuk mendukung pembelajaran',
  'MTs Almaarif 01 menerapkan model pembelajaran yang menyenangkan dan bermakna',
  'Lulusan MTs Almaarif berkualitas, dan berakhlak',
  'Guru-guru di MTs Almaarif 01 memiliki kemampuan yang baik dalam mengajar, ramah dan sopan',
  'MTs Almaarif 01 mengutamakan pendidikan karakter (Akhlak Mulia)',
  'MTs Almaarif 01 mengajarkan wawasan Ahlussunnah waljamaah an Nahdhiyah'
];

const infoSiswaMaster = [
  'Dari tetangga/teman',
  'Dari alumni',
  'Dari pengasuh pesantren',
  'Dari guru MTs Almaarif',
  'Dari Web/IG MTs Almaarif',
  'Dari berita dikoran',
  'Dari brosur',
  'Dari kegiatan yang diadakan oleh MTs',
  'Dari Guru di Madrasah (MI)/ Sekolah (SD)'
];

const pertanyaanOrtuMaster = [
  { key: 'Q1: Administrasi Ramah', label: 'Pelayanan administrasi dilakukan dengan ramah dan sopan.' },
  { key: 'Q2: Pelayanan Cepat', label: 'Pegawai memberikan pelayanan yang cepat dan membantu.' },
  { key: 'Q3: Lingkungan Bersih', label: 'Lingkungan madrasah bersih dan nyaman.' },
  { key: 'Q4: Keamanan Baik', label: 'Keamanan lingkungan madrasah sudah baik.' },
  { key: 'Q5: Perhatian Guru', label: 'Guru memberikan perhatian terhadap perkembangan belajar siswa.' },
  { key: 'Q6: Guru Adil', label: 'Guru bersikap adil kepada seluruh siswa.' },
  { key: 'Q7: Info Jelas', label: 'Informasi tugas dan nilai disampaikan dengan jelas.' },
  { key: 'Q8: Wali Kelas Dihubungi', label: 'Wali kelas mudah dihubungi saat diperlukan.' },
  { key: 'Q9: Melibatkan Ortu', label: 'Madrasah melibatkan orang tua ketika diperlukan dalam penyelesaian masalah siswa.' },
  { key: 'Q10: Anak Aman Nyaman', label: 'Anak saya merasa aman dan nyaman selama berada di madrasah.' }
];

export async function GET() {
  try {
    const { data: allRows, error } = await supabase
      .from('data_survey')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    const rows = allRows || [];

    // 1. Basic Summary (Backward compatibility)
    const rekap = [
      { id: 'wali_murid', nama: 'Angket Persepsi Wali Murid', total: 0, latest: [] as any[] },
      { id: 'siswa', nama: 'Angket Persepsi Siswa', total: 0, latest: [] as any[] },
      { id: 'kepuasan_ortu', nama: 'Angket Kepuasan Orang Tua', total: 0, latest: [] as any[] },
    ];

    const mappedRows = rows.map((r: any) => ({
      id: r.id,
      tipe: r.tipe_survey,
      timestamp: r.metadata?.['Timestamp'] || '-',
      nama: r.metadata?.['Nama Wali Murid'] || r.metadata?.['Nama Siswa'] || r.metadata?.['Nama Anak / Siswa'] || '-',
      namaSiswa: r.metadata?.['Nama Siswa'] || r.metadata?.['Nama Anak / Siswa'] || r.metadata?.['Nama Wali Murid'] || '-',
      namaWali: r.metadata?.['Nama Orang Tua'] || r.metadata?.['Nama Wali Murid'] || '-',
      kelas: (r.metadata?.['Kelas'] || r.metadata?.['Kelas Siswa'] || '-').trim(),
      metadata: r.metadata || {}
    }));

    for (let i = 0; i < rekap.length; i++) {
      const tipeId = rekap[i].id;
      const filtered = mappedRows.filter(r => r.tipe === tipeId);
      rekap[i].total = filtered.length;
      rekap[i].latest = filtered.slice(-10).reverse();
    }

    // 2. Compute Detailed Analytics for Evaluasi Madrasah
    const rowsWali = rows.filter(r => r.tipe_survey === 'wali_murid');
    const rowsSiswa = rows.filter(r => r.tipe_survey === 'siswa');
    const rowsOrtu = rows.filter(r => r.tipe_survey === 'kepuasan_ortu');

    // --- A. ANALISIS WALI MURID ---
    const totalWali = rowsWali.length;
    const alasanWaliCounts: Record<string, number> = {};
    alasanWaliMuridMaster.forEach(a => { alasanWaliCounts[a] = 0; });
    let alasanWaliLainCount = 0;

    const sumberWaliCounts: Record<string, number> = {};
    infoWaliMuridMaster.forEach(s => { sumberWaliCounts[s] = 0; });
    let sumberWaliLainCount = 0;

    const saranWaliList: any[] = [];

    rowsWali.forEach(r => {
      const meta = r.metadata || {};
      const rawAlasan = String(meta['Alasan Memilih MTs'] || '');
      const rawSumber = String(meta['Sumber Informasi'] || '');
      const saran = String(meta['Saran & Masukan'] || '').trim();

      // Match predefined alasan
      alasanWaliMuridMaster.forEach(a => {
        if (rawAlasan.includes(a)) {
          alasanWaliCounts[a] = (alasanWaliCounts[a] || 0) + 1;
        }
      });
      if (rawAlasan.includes('Lainnya:') || rawAlasan.includes('Lain-lain:')) {
        alasanWaliLainCount++;
      }

      // Match predefined sumber
      infoWaliMuridMaster.forEach(s => {
        if (rawSumber.includes(s)) {
          sumberWaliCounts[s] = (sumberWaliCounts[s] || 0) + 1;
        }
      });
      if (rawSumber.includes('Lainnya:') || rawSumber.includes('Lain-lain:')) {
        sumberWaliLainCount++;
      }

      if (saran) {
        saranWaliList.push({
          nama: meta['Nama Siswa'] || meta['Nama Wali Murid'] || 'Wali Murid',
          kelas: meta['Kelas'] || meta['Kelas Siswa'] || '-',
          saran,
          timestamp: meta['Timestamp'] || '-'
        });
      }
    });

    const breakdownAlasanWali = Object.entries(alasanWaliCounts)
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalWali > 0 ? Math.round((count / totalWali) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    if (alasanWaliLainCount > 0) {
      breakdownAlasanWali.push({
        label: 'Alasan Lainnya',
        count: alasanWaliLainCount,
        percentage: totalWali > 0 ? Math.round((alasanWaliLainCount / totalWali) * 1000) / 10 : 0
      });
    }

    const breakdownSumberWali = Object.entries(sumberWaliCounts)
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalWali > 0 ? Math.round((count / totalWali) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    if (sumberWaliLainCount > 0) {
      breakdownSumberWali.push({
        label: 'Sumber Informasi Lainnya',
        count: sumberWaliLainCount,
        percentage: totalWali > 0 ? Math.round((sumberWaliLainCount / totalWali) * 1000) / 10 : 0
      });
    }

    // --- B. ANALISIS SISWA ---
    const totalSiswa = rowsSiswa.length;
    const alasanSiswaCounts: Record<string, number> = {};
    alasanSiswaMaster.forEach(a => { alasanSiswaCounts[a] = 0; });
    let alasanSiswaLainCount = 0;

    const sumberSiswaCounts: Record<string, number> = {};
    infoSiswaMaster.forEach(s => { sumberSiswaCounts[s] = 0; });

    const harapanSiswaList: any[] = [];

    rowsSiswa.forEach(r => {
      const meta = r.metadata || {};
      const rawAlasan = String(meta['Alasan Memilih MTs'] || '');
      const rawSumber = String(meta['Sumber Informasi'] || '');
      const harapan = String(meta['Harapan Ke Depan'] || '').trim();

      alasanSiswaMaster.forEach(a => {
        if (rawAlasan.includes(a)) {
          alasanSiswaCounts[a] = (alasanSiswaCounts[a] || 0) + 1;
        }
      });
      if (rawAlasan.includes('Lainnya:')) {
        alasanSiswaLainCount++;
      }

      infoSiswaMaster.forEach(s => {
        if (rawSumber.includes(s)) {
          sumberSiswaCounts[s] = (sumberSiswaCounts[s] || 0) + 1;
        }
      });

      if (harapan) {
        harapanSiswaList.push({
          nama: meta['Nama Siswa'] || 'Siswa',
          kelas: meta['Kelas'] || '-',
          harapan,
          timestamp: meta['Timestamp'] || '-'
        });
      }
    });

    const breakdownAlasanSiswa = Object.entries(alasanSiswaCounts)
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalSiswa > 0 ? Math.round((count / totalSiswa) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    if (alasanSiswaLainCount > 0) {
      breakdownAlasanSiswa.push({
        label: 'Alasan Lainnya',
        count: alasanSiswaLainCount,
        percentage: totalSiswa > 0 ? Math.round((alasanSiswaLainCount / totalSiswa) * 1000) / 10 : 0
      });
    }

    const breakdownSumberSiswa = Object.entries(sumberSiswaCounts)
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalSiswa > 0 ? Math.round((count / totalSiswa) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count);

    // --- C. ANALISIS KEPUASAN ORANG TUA (SKALA LIKERT) ---
    const totalOrtu = rowsOrtu.length;
    let sumAllPuasPct = 0;
    let sumAllAvgScore = 0;

    const questionsBreakdown = pertanyaanOrtuMaster.map((q, idx) => {
      let sangatSetuju = 0;
      let setuju = 0;
      let kurangSetuju = 0;
      let sangatTidakSetuju = 0;

      rowsOrtu.forEach(r => {
        const meta = r.metadata || {};
        const val = String(meta[q.key] || '').trim();

        if (val === 'Sangat Setuju') sangatSetuju++;
        else if (val === 'Setuju') setuju++;
        else if (val === 'Kurang Setuju') kurangSetuju++;
        else if (val === 'Sangat Tidak Setuju') sangatTidakSetuju++;
      });

      const qTotal = sangatSetuju + setuju + kurangSetuju + sangatTidakSetuju;
      const puasCount = sangatSetuju + setuju;
      const puasPct = qTotal > 0 ? Math.round((puasCount / qTotal) * 1000) / 10 : 0;

      // Score: Sangat Setuju = 4, Setuju = 3, Kurang Setuju = 2, Sangat Tidak Setuju = 1
      const totalScore = (sangatSetuju * 4) + (setuju * 3) + (kurangSetuju * 2) + (sangatTidakSetuju * 1);
      const avgScore = qTotal > 0 ? Math.round((totalScore / qTotal) * 100) / 100 : 0;

      sumAllPuasPct += puasPct;
      sumAllAvgScore += avgScore;

      return {
        no: idx + 1,
        key: q.key,
        label: q.label,
        total: qTotal,
        sangatSetuju: {
          count: sangatSetuju,
          pct: qTotal > 0 ? Math.round((sangatSetuju / qTotal) * 1000) / 10 : 0
        },
        setuju: {
          count: setuju,
          pct: qTotal > 0 ? Math.round((setuju / qTotal) * 1000) / 10 : 0
        },
        kurangSetuju: {
          count: kurangSetuju,
          pct: qTotal > 0 ? Math.round((kurangSetuju / qTotal) * 1000) / 10 : 0
        },
        sangatTidakSetuju: {
          count: sangatTidakSetuju,
          pct: qTotal > 0 ? Math.round((sangatTidakSetuju / qTotal) * 1000) / 10 : 0
        },
        puasCount,
        puasPct,
        avgScore
      };
    });

    const overallIndex = questionsBreakdown.length > 0 ? Math.round((sumAllPuasPct / questionsBreakdown.length) * 10) / 10 : 0;
    const overallScore = questionsBreakdown.length > 0 ? Math.round((sumAllAvgScore / questionsBreakdown.length) * 100) / 100 : 0;

    // Strengths (highest scores) & Areas for Improvement (lowest scores)
    const sortedByPuas = [...questionsBreakdown].sort((a, b) => b.puasPct - a.puasPct || b.avgScore - a.avgScore);
    const topStrengths = sortedByPuas.slice(0, 3);
    const areasToImprove = [...sortedByPuas].reverse().slice(0, 3);

    // --- D. DISTRIBUSI KELAS ---
    const classSet = new Set<string>();
    rows.forEach(r => {
      const k = (r.metadata?.['Kelas'] || r.metadata?.['Kelas Siswa'] || '').trim().toUpperCase();
      if (k && k !== '-' && k !== 'UNDEFINED') classSet.add(k);
    });

    const sortedClasses = Array.from(classSet).sort();
    const kelasDistribution = sortedClasses.map(cls => {
      const waliCount = rowsWali.filter(r => (r.metadata?.['Kelas'] || r.metadata?.['Kelas Siswa'] || '').trim().toUpperCase() === cls).length;
      const siswaCount = rowsSiswa.filter(r => (r.metadata?.['Kelas'] || r.metadata?.['Kelas Siswa'] || '').trim().toUpperCase() === cls).length;
      const ortuCount = rowsOrtu.filter(r => (r.metadata?.['Kelas'] || r.metadata?.['Kelas Siswa'] || '').trim().toUpperCase() === cls).length;
      return {
        kelas: cls,
        waliMurid: waliCount,
        siswa: siswaCount,
        kepuasanOrtu: ortuCount,
        total: waliCount + siswaCount + ortuCount
      };
    });

    return NextResponse.json({
      success: true,
      data: rekap,
      allSubmissions: mappedRows,
      analytics: {
        totalAll: rows.length,
        waliMurid: {
          total: totalWali,
          alasanBreakdown: breakdownAlasanWali,
          sumberBreakdown: breakdownSumberWali,
          saranList: saranWaliList.reverse()
        },
        siswa: {
          total: totalSiswa,
          alasanBreakdown: breakdownAlasanSiswa,
          sumberBreakdown: breakdownSumberSiswa,
          harapanList: harapanSiswaList.reverse()
        },
        kepuasanOrtu: {
          total: totalOrtu,
          overallIndex,
          overallScore,
          questions: questionsBreakdown,
          topStrengths,
          areasToImprove
        },
        kelasDistribution
      }
    }, {
      headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' }
    });

  } catch (error: any) {
    console.error('API Survey Rekap Error:', error);
    return NextResponse.json({ success: false, error: 'Gagal mengambil data rekap: ' + error.message }, { status: 500 });
  }
}
