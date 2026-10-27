'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import LoadingScreen from '@/components/LoadingScreen';

interface StudentItem {
  id: string;
  nis: string;
  nism: string;
  nisn: string;
  nama: string;
  jenisKelamin: string;
  rombel: string;
}

interface AbsenceItem {
  status: 'S' | 'I' | 'A';
  jamCount: number;
}

function cleanNisn(nisn: string): string {
  if (!nisn) return '';
  return String(nisn).trim().replace(/^0+/, '');
}

function normalizeName(name: string): string {
  if (!name) return '';
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function CetakRekapContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialKelas = (searchParams.get('kelas') || '7A').trim().toUpperCase();
  const initialBulan = searchParams.get('bulan') || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [selectedKelas, setSelectedKelas] = useState(initialKelas);
  const [selectedBulan, setSelectedBulan] = useState(initialBulan);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [presensiRecords, setPresensiRecords] = useState<any[]>([]);
  const [waliKelas, setWaliKelas] = useState<{ nama: string; nip: string }>({ nama: '', nip: '' });
  const [loading, setLoading] = useState(true);

  // Parse Year and Month
  const { year, month, daysInMonth, monthName, tahunPelajaran } = useMemo(() => {
    const parts = selectedBulan.split('-');
    const y = parseInt(parts[0], 10) || new Date().getFullYear();
    const m = parseInt(parts[1], 10) || (new Date().getMonth() + 1);
    const dCount = new Date(y, m, 0).getDate();

    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const mName = monthNames[m - 1] || '';
    const ta = m >= 7 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

    return {
      year: y,
      month: m,
      daysInMonth: dCount,
      monthName: mName,
      tahunPelajaran: ta
    };
  }, [selectedBulan]);

  // Load classes for switcher dropdown
  useEffect(() => {
    fetch('/api/kelas')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const kNames = res.data.map((k: any) => k.rombel || k.metadata?.['ROMBEL'] || '').filter(Boolean);
          const uniq = Array.from(new Set(kNames)).sort() as string[];
          if (uniq.length > 0) setKelasList(uniq);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Wali Kelas
  useEffect(() => {
    if (!selectedKelas) return;
    fetch(`/api/portal/wali-kelas?kelas=${encodeURIComponent(selectedKelas)}`)
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setWaliKelas({
            nama: res.data.nama || '',
            nip: res.data.nip || ''
          });
        }
      })
      .catch(() => {});
  }, [selectedKelas]);

  // Fetch Students & Presensi
  useEffect(() => {
    if (!selectedKelas || !selectedBulan) return;
    setLoading(true);

    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    Promise.all([
      fetch('/api/siswa').then(r => r.json()),
      fetch(`/api/presensi?from=${startDate}&to=${endDate}`).then(r => r.json())
    ])
      .then(([siswaRes, presensiRes]) => {
        // 1. Process Students
        if (siswaRes.success && Array.isArray(siswaRes.data)) {
          const rawStudents = siswaRes.data;
          const filtered = rawStudents
            .filter((s: any) => {
              const r = (s.rombel || '').trim().toUpperCase();
              const isMatchKelas = r === selectedKelas || r.replace(/[^A-Z0-9]/g, '') === selectedKelas.replace(/[^A-Z0-9]/g, '');
              const isAktif = (s.status || '').toLowerCase().trim() === 'aktif';
              return isMatchKelas && isAktif && s.isLatest !== false;
            })
            .map((s: any) => ({
              id: s.id || s.supabaseId || '',
              nis: s.nis || s.id_siswa || '',
              nism: s.nism || '',
              nisn: s.nisn || '',
              nama: s.nama || '',
              jenisKelamin: (s.jenisKelamin || '').toUpperCase().startsWith('P') ? 'P' : 'L',
              rombel: s.rombel || selectedKelas
            }))
            .sort((a: any, b: any) => a.nama.localeCompare(b.nama));

          setStudents(filtered);
        }

        // 2. Process Presensi Records
        if (presensiRes.success && Array.isArray(presensiRes.data)) {
          const filteredPresensi = presensiRes.data.filter((r: any) => {
            const rk = (r.kelas || '').trim().toUpperCase();
            return rk === selectedKelas || rk.replace(/[^A-Z0-9]/g, '') === selectedKelas.replace(/[^A-Z0-9]/g, '');
          });
          setPresensiRecords(filteredPresensi);
        }
      })
      .catch((err) => {
        console.error('Error loading cetak rekap data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedKelas, selectedBulan, year, month, daysInMonth]);

  // Days list (1..daysInMonth)
  const daysArray = useMemo(() => {
    const list = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const dateObj = new Date(year, month - 1, d);
      const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
      list.push({
        day: d,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        dayOfWeek,
        isSunday: dayOfWeek === 0,
        isSaturday: dayOfWeek === 6
      });
    }
    return list;
  }, [year, month, daysInMonth]);

  // Count L & P
  const { countL, countP } = useMemo(() => {
    let l = 0, p = 0;
    students.forEach(s => {
      if (s.jenisKelamin === 'P') p++;
      else l++;
    });
    return { countL: l, countP: p };
  }, [students]);

  // Build Map: studentKey_dateStr -> AbsenceItem
  const absenceMap = useMemo(() => {
    const map = new Map<string, AbsenceItem>();

    presensiRecords.forEach((r: any) => {
      const tgl = (r.tanggal || '').trim();
      const statusRaw = (r.kehadiran || '').trim().toUpperCase();
      if (!['S', 'I', 'A'].includes(statusRaw)) return;
      const status = statusRaw as 'S' | 'I' | 'A';

      // Parse hours count
      let jamCount = 10; // Default full day hours in school
      if (r.jamKe) {
        const jStr = String(r.jamKe);
        if (jStr.includes(',')) {
          const parts = jStr.split(',').map(x => x.trim()).filter(Boolean);
          jamCount = parts.length > 0 ? parts.length : 10;
        } else if (!isNaN(parseInt(jStr, 10)) && parseInt(jStr, 10) > 0) {
          jamCount = parseInt(jStr, 10);
        }
      }

      // Keys for matching: NISN clean and normalized name
      const safeNisn = cleanNisn(r.nisn);
      const normName = normalizeName(r.namaSiswa);

      if (safeNisn) {
        const key = `${safeNisn}__${tgl}`;
        map.set(key, { status, jamCount });
      }
      if (normName) {
        const key = `${normName}__${tgl}`;
        map.set(key, { status, jamCount });
      }
    });

    return map;
  }, [presensiRecords]);

  // Aggregate rows per student
  const matrixData = useMemo(() => {
    return students.map((st, idx) => {
      const safeNisn = cleanNisn(st.nisn);
      const normName = normalizeName(st.nama);

      let totJamS = 0;
      let totJamI = 0;
      let totJamA = 0;

      let jmlHariS = 0;
      let jmlHariI = 0;
      let jmlHariA = 0;

      const daysData = daysArray.map(d => {
        let abs: AbsenceItem | undefined;
        if (safeNisn) abs = absenceMap.get(`${safeNisn}__${d.dateStr}`);
        if (!abs && normName) abs = absenceMap.get(`${normName}__${d.dateStr}`);

        let cellText = '';
        if (abs && !d.isSunday && !d.isSaturday) {
          cellText = `${abs.status}/${abs.jamCount}`;
          if (abs.status === 'S') {
            totJamS += abs.jamCount;
            jmlHariS += 1;
          } else if (abs.status === 'I') {
            totJamI += abs.jamCount;
            jmlHariI += 1;
          } else if (abs.status === 'A') {
            totJamA += abs.jamCount;
            jmlHariA += 1;
          }
        }

        return {
          day: d.day,
          isSunday: d.isSunday,
          isSaturday: d.isSaturday,
          cellText,
          status: abs?.status
        };
      });

      return {
        no: idx + 1,
        noInduk: st.nis || st.nism || '-',
        nisn: st.nisn || '-',
        nama: st.nama.toUpperCase(),
        lp: st.jenisKelamin,
        days: daysData,
        totJamS,
        totJamI,
        totJamA,
        jmlHariS,
        jmlHariI,
        jmlHariA
      };
    });
  }, [students, daysArray, absenceMap]);

  // Calculate bottom total row
  const bottomTotals = useMemo(() => {
    const daysTotals = daysArray.map(d => {
      let count = 0;
      matrixData.forEach(row => {
        const cell = row.days.find(x => x.day === d.day);
        if (cell && cell.cellText) count++;
      });
      return count;
    });

    let sumTotJamS = 0, sumTotJamI = 0, sumTotJamA = 0;
    let sumJmlHariS = 0, sumJmlHariI = 0, sumJmlHariA = 0;

    matrixData.forEach(r => {
      sumTotJamS += r.totJamS;
      sumTotJamI += r.totJamI;
      sumTotJamA += r.totJamA;
      sumJmlHariS += r.jmlHariS;
      sumJmlHariI += r.jmlHariI;
      sumJmlHariA += r.jmlHariA;
    });

    return {
      daysTotals,
      sumTotJamS,
      sumTotJamI,
      sumTotJamA,
      sumJmlHariS,
      sumJmlHariI,
      sumJmlHariA
    };
  }, [daysArray, matrixData]);

  // Tanggal Tanda Tangan
  const tanggalTtd = `${daysInMonth} ${monthName} ${year}`;

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#000000' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 6mm 5mm;
          }
          html, body {
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .print-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
      `}} />

      {/* Floating Toolbar (No Print) */}
      <div className="no-print" style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        background: '#ffffff',
        borderBottom: '1px solid #cbd5e1',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: '0 2px 10px rgba(0,0,0,0.08)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Kelas:</label>
            <select
              value={selectedKelas}
              onChange={(e) => setSelectedKelas(e.target.value)}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1.5px solid #0284c7',
                fontWeight: 700,
                fontSize: '13px',
                background: '#f0f9ff',
                color: '#0369a1',
                cursor: 'pointer'
              }}
            >
              {kelasList.length > 0 ? (
                kelasList.map(k => <option key={k} value={k}>Kelas {k}</option>)
              ) : (
                <option value={selectedKelas}>Kelas {selectedKelas}</option>
              )}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Bulan:</label>
            <input
              type="month"
              value={selectedBulan}
              onChange={(e) => setSelectedBulan(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1.5px solid #0284c7',
                fontWeight: 600,
                fontSize: '13px',
                background: '#f0f9ff',
                color: '#0369a1',
                cursor: 'pointer'
              }}
            />
          </div>

          <span style={{ fontSize: '12px', color: '#64748b' }}>
            Murid: <strong>{students.length}</strong> (L: {countL}, P: {countP})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              fontWeight: 700,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 2px 6px rgba(2,132,199,0.3)'
            }}
          >
            <i className="fas fa-print"></i> Cetak / Simpan PDF
          </button>

          <button
            onClick={() => {
              if (window.opener) {
                window.close();
              } else {
                router.push('/presensi');
              }
            }}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#e2e8f0',
              color: '#475569',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer'
            }}
          >
            Kembali
          </button>
        </div>
      </div>

      {/* Sheet Container */}
      <div style={{ padding: '16px', display: 'flex', justifyContent: 'center' }}>
        <div className="print-sheet" style={{
          background: '#ffffff',
          width: '100%',
          maxWidth: '287mm',
          padding: '12mm 10mm',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          boxSizing: 'border-box'
        }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '12px' }}></i>
              <div>Memuat dan menyusun rekap kehadiran kelas {selectedKelas}...</div>
            </div>
          ) : (
            <>
              {/* Kop Surat Madrasah */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <img
                  src="/kop_surat_mts.png"
                  alt="Kop Surat MTs Almaarif 01 Singosari"
                  style={{
                    width: '100%',
                    maxHeight: '92px',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              </div>

              {/* Title Block */}
              <div style={{ textAlign: 'center', marginBottom: '14px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '13pt',
                  fontWeight: 900,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  color: '#000000'
                }}>
                  REKAP KETIDAKHADIRAN MURID PER HARI
                </h2>
                <div style={{
                  fontSize: '10pt',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginTop: '2px',
                  color: '#000000'
                }}>
                  MTs ALMAARIF 01 SINGOSARI
                </div>
                <div style={{
                  fontSize: '9.5pt',
                  fontWeight: 700,
                  marginTop: '1px',
                  color: '#000000'
                }}>
                  Tahun Pelajaran {tahunPelajaran}
                </div>
              </div>

              {/* Meta Grid 2 Kolom */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '8.5pt',
                fontWeight: 700,
                marginBottom: '8px',
                color: '#000000'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '85px' }}>Kelas</span>
                    <span>: <strong>{selectedKelas}</strong></span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '85px' }}>Wali Kelas</span>
                    <span>: <strong>{waliKelas.nama || '-'}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: '105px', textAlign: 'left' }}>Bulan</span>
                    <span style={{ textAlign: 'left' }}>: <strong>{monthName} {year}</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: '105px', textAlign: 'left' }}>Jumlah Murid</span>
                    <span style={{ textAlign: 'left' }}>
                      : <strong>{students.length}</strong> &nbsp;|&nbsp; L = <strong>{countL}</strong> &nbsp; P = <strong>{countP}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Attendance Table */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '7pt',
                  fontFamily: 'Arial, sans-serif',
                  tableLayout: 'fixed',
                  border: '1.5px solid #000000',
                  color: '#000000'
                }}>
                  <thead>
                    <tr style={{ background: '#86efac', textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                      <th rowSpan={2} style={{ width: '22px', border: '1px solid #000000', padding: '3px 1px' }}>NO</th>
                      <th rowSpan={2} style={{ width: '68px', border: '1px solid #000000', padding: '3px 2px' }}>No. Induk</th>
                      <th rowSpan={2} style={{ width: '74px', border: '1px solid #000000', padding: '3px 2px' }}>NISN</th>
                      <th rowSpan={2} style={{ width: '160px', border: '1px solid #000000', padding: '3px 4px', textAlign: 'left' }}>Nama Murid</th>
                      <th rowSpan={2} style={{ width: '22px', border: '1px solid #000000', padding: '3px 1px' }}>L/P</th>
                      <th colSpan={daysInMonth} style={{ border: '1px solid #000000', padding: '3px 2px', textTransform: 'uppercase' }}>
                        {monthName} {year}
                      </th>
                      <th colSpan={3} style={{ width: '51px', border: '1px solid #000000', padding: '3px 1px' }}>TOT. JAM</th>
                      <th colSpan={3} style={{ width: '51px', border: '1px solid #000000', padding: '3px 1px' }}>JML. HARI</th>
                    </tr>
                    <tr style={{ background: '#86efac', textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                      {daysArray.map(d => {
                        const bg = d.isSunday ? '#ef4444' : d.isSaturday ? '#facc15' : 'inherit';
                        const col = d.isSunday ? '#ffffff' : '#000000';
                        return (
                          <th
                            key={d.day}
                            style={{
                              border: '1px solid #000000',
                              padding: '2px 0',
                              background: bg,
                              color: col,
                              fontSize: '6.5pt'
                            }}
                          >
                            {d.day}
                          </th>
                        );
                      })}
                      <th style={{ width: '17px', border: '1px solid #000000', padding: '2px 0' }}>S</th>
                      <th style={{ width: '17px', border: '1px solid #000000', padding: '2px 0' }}>I</th>
                      <th style={{ width: '17px', border: '1px solid #000000', padding: '2px 0' }}>A</th>
                      <th style={{ width: '17px', border: '1px solid #000000', padding: '2px 0' }}>S</th>
                      <th style={{ width: '17px', border: '1px solid #000000', padding: '2px 0' }}>I</th>
                      <th style={{ width: '17px', border: '1px solid #000000', padding: '2px 0' }}>A</th>
                    </tr>
                  </thead>

                  <tbody>
                    {matrixData.length === 0 ? (
                      <tr>
                        <td colSpan={5 + daysInMonth + 6} style={{ textAlign: 'center', padding: '24px', border: '1px solid #000000', color: '#64748b' }}>
                          Tidak ada siswa aktif terdaftar di kelas {selectedKelas}.
                        </td>
                      </tr>
                    ) : (
                      matrixData.map((row) => (
                        <tr key={row.no} style={{ background: '#ffffff', textAlign: 'center' }}>
                          <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{row.no}</td>
                          <td style={{ border: '1px solid #000000', padding: '2px 2px', whiteSpace: 'nowrap' }}>{row.noInduk}</td>
                          <td style={{ border: '1px solid #000000', padding: '2px 2px', whiteSpace: 'nowrap' }}>{row.nisn}</td>
                          <td style={{
                            border: '1px solid #000000',
                            padding: '2px 4px',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 600
                          }}>
                            {row.nama}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{row.lp}</td>

                          {/* Days Cells */}
                          {row.days.map(d => {
                            let cellBg = '#ffffff';
                            let textColor = '#000000';

                            if (d.isSunday) {
                              cellBg = '#ef4444';
                            } else if (d.isSaturday) {
                              cellBg = '#facc15';
                            } else if (d.cellText) {
                              if (d.status === 'S') {
                                cellBg = '#fef08a';
                                textColor = '#854d0e';
                              } else if (d.status === 'I') {
                                cellBg = '#fed7aa';
                                textColor = '#9a3412';
                              } else if (d.status === 'A') {
                                cellBg = '#fee2e2';
                                textColor = '#991b1b';
                              }
                            }

                            return (
                              <td
                                key={d.day}
                                style={{
                                  border: '1px solid #000000',
                                  padding: '1px 0',
                                  background: cellBg,
                                  color: textColor,
                                  fontSize: '6.5pt',
                                  fontWeight: d.cellText ? 800 : 400
                                }}
                              >
                                {d.cellText}
                              </td>
                            );
                          })}

                          {/* Totals Jam */}
                          <td style={{ border: '1px solid #000000', padding: '2px 1px', fontWeight: row.totJamS > 0 ? 800 : 400 }}>
                            {row.totJamS}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '2px 1px', fontWeight: row.totJamI > 0 ? 800 : 400 }}>
                            {row.totJamI}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '2px 1px', fontWeight: row.totJamA > 0 ? 800 : 400, color: row.totJamA > 0 ? '#dc2626' : undefined }}>
                            {row.totJamA}
                          </td>

                          {/* Totals Hari */}
                          <td style={{ border: '1px solid #000000', padding: '2px 1px', fontWeight: row.jmlHariS > 0 ? 800 : 400 }}>
                            {row.jmlHariS}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '2px 1px', fontWeight: row.jmlHariI > 0 ? 800 : 400 }}>
                            {row.jmlHariI}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '2px 1px', fontWeight: row.jmlHariA > 0 ? 800 : 400, color: row.jmlHariA > 0 ? '#dc2626' : undefined }}>
                            {row.jmlHariA}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* Summary / Total Footer Row */}
                  <tfoot>
                    <tr style={{ background: '#fef9c3', fontWeight: 800, textAlign: 'center' }}>
                      <td colSpan={5} style={{ border: '1px solid #000000', padding: '3px 4px', textAlign: 'center' }}>
                        JUMLAH
                      </td>

                      {/* Day Absence Counts */}
                      {daysArray.map((d, dIdx) => {
                        const cnt = bottomTotals.daysTotals[dIdx] || 0;
                        const bg = d.isSunday ? '#ef4444' : d.isSaturday ? '#facc15' : '#fef9c3';
                        const col = d.isSunday ? '#ffffff' : '#000000';
                        return (
                          <td
                            key={d.day}
                            style={{
                              border: '1px solid #000000',
                              padding: '2px 0',
                              background: bg,
                              color: col,
                              fontSize: '6.5pt'
                            }}
                          >
                            {d.isSunday || d.isSaturday ? '' : cnt}
                          </td>
                        );
                      })}

                      {/* Total Jam S, I, A */}
                      <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{bottomTotals.sumTotJamS}</td>
                      <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{bottomTotals.sumTotJamI}</td>
                      <td style={{ border: '1px solid #000000', padding: '2px 1px', color: bottomTotals.sumTotJamA > 0 ? '#dc2626' : undefined }}>
                        {bottomTotals.sumTotJamA}
                      </td>

                      {/* Total Hari S, I, A */}
                      <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{bottomTotals.sumJmlHariS}</td>
                      <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{bottomTotals.sumJmlHariI}</td>
                      <td style={{ border: '1px solid #000000', padding: '2px 1px', color: bottomTotals.sumJmlHariA > 0 ? '#dc2626' : undefined }}>
                        {bottomTotals.sumJmlHariA}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signature Section */}
              <div style={{
                marginTop: '18px',
                display: 'flex',
                justifyContent: 'flex-end',
                pageBreakInside: 'avoid'
              }}>
                <div style={{ textAlign: 'center', minWidth: '220px', fontSize: '9pt' }}>
                  <div>Singosari, {tanggalTtd}</div>
                  <div style={{ fontWeight: 700, marginTop: '3px' }}>Wali Kelas</div>
                  <div style={{ height: '55px' }}></div>
                  <div style={{
                    fontWeight: 900,
                    textDecoration: 'underline',
                    fontSize: '9.5pt'
                  }}>
                    {waliKelas.nama || '...........................................'}
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '8.5pt' }}>
                    {waliKelas.nip ? `NIP. ${waliKelas.nip}` : 'NIP. -'}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CetakRekapPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <CetakRekapContent />
    </Suspense>
  );
}
