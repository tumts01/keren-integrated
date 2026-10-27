'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
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

interface WaliInfo {
  rombel: string;
  nama: string;
  nip: string;
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

  const rawKelasParam = searchParams.get('kelas') || '7A';
  const initialBulan = searchParams.get('bulan') || (() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  })();

  const [selectedBulan, setSelectedBulan] = useState(initialBulan);
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [selectedClasses, setSelectedClasses] = useState<string[]>(() => {
    if (rawKelasParam.toUpperCase() === 'ALL') return [];
    return rawKelasParam
      .split(',')
      .map(k => k.trim().toUpperCase())
      .filter(Boolean);
  });

  const [allStudents, setAllStudents] = useState<StudentItem[]>([]);
  const [presensiRecords, setPresensiRecords] = useState<any[]>([]);
  const [waliMap, setWaliMap] = useState<Record<string, WaliInfo>>({});
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

  // Load all classes from API
  useEffect(() => {
    fetch('/api/kelas')
      .then(r => r.json())
      .then(res => {
        if (res.success && Array.isArray(res.data)) {
          const kNames = res.data
            .map((k: any) => k.rombel || k.metadata?.['ROMBEL'] || '')
            .filter(Boolean);
          const uniq = Array.from(new Set(kNames)).sort() as string[];
          if (uniq.length > 0) {
            setKelasList(uniq);
            if (rawKelasParam.toUpperCase() === 'ALL') {
              setSelectedClasses(uniq);
            }
          }
        }
      })
      .catch(() => {});
  }, [rawKelasParam]);

  // Load Wali Kelas for all classes
  useEffect(() => {
    fetch('/api/portal/wali-kelas?kelas=ALL')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data) {
          setWaliMap(res.data);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Students & Presensi for selected Month
  useEffect(() => {
    if (!selectedBulan) return;
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
          const processed = rawStudents
            .filter((s: any) => {
              const isAktif = (s.status || '').toLowerCase().trim() === 'aktif';
              return isAktif && s.isLatest !== false;
            })
            .map((s: any) => ({
              id: s.id || s.supabaseId || '',
              nis: s.nis || s.id_siswa || '',
              nism: s.nism || '',
              nisn: s.nisn || '',
              nama: s.nama || '',
              jenisKelamin: (s.jenisKelamin || '').toUpperCase().startsWith('P') ? 'P' : 'L',
              rombel: (s.rombel || '').trim().toUpperCase()
            }));

          setAllStudents(processed);
        }

        // 2. Process Presensi Records
        if (presensiRes.success && Array.isArray(presensiRes.data)) {
          setPresensiRecords(presensiRes.data);
        }
      })
      .catch((err) => {
        console.error('Error loading cetak rekap data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedBulan, year, month, daysInMonth]);

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

  // Build Absence Map (studentKey_dateStr -> AbsenceItem)
  const absenceMap = useMemo(() => {
    const map = new Map<string, AbsenceItem>();

    presensiRecords.forEach((r: any) => {
      const tgl = (r.tanggal || '').trim();
      const statusRaw = (r.kehadiran || '').trim().toUpperCase();
      if (!['S', 'I', 'A'].includes(statusRaw)) return;
      const status = statusRaw as 'S' | 'I' | 'A';

      // Parse hours count (default 10 jam)
      let jamCount = 10;
      if (r.jamKe) {
        const jStr = String(r.jamKe);
        if (jStr.includes(',')) {
          const parts = jStr.split(',').map(x => x.trim()).filter(Boolean);
          jamCount = parts.length > 0 ? parts.length : 10;
        } else if (!isNaN(parseInt(jStr, 10)) && parseInt(jStr, 10) > 0) {
          jamCount = parseInt(jStr, 10);
        }
      }

      const safeNisn = cleanNisn(r.nisn);
      const normName = normalizeName(r.namaSiswa);

      if (safeNisn) {
        map.set(`${safeNisn}__${tgl}`, { status, jamCount });
      }
      if (normName) {
        map.set(`${normName}__${tgl}`, { status, jamCount });
      }
    });

    return map;
  }, [presensiRecords]);

  // Effective classes to render
  const effectiveClasses = useMemo(() => {
    if (selectedClasses.length > 0) return selectedClasses;
    if (kelasList.length > 0) return [kelasList[0]];
    return ['7A'];
  }, [selectedClasses, kelasList]);

  // Aggregate Data for Each Class
  const classReports = useMemo(() => {
    return effectiveClasses.map(cls => {
      const clsClean = cls.trim().toUpperCase();
      const clsStudents = allStudents
        .filter(s => {
          const r = s.rombel;
          return r === clsClean || r.replace(/[^A-Z0-9]/g, '') === clsClean.replace(/[^A-Z0-9]/g, '');
        })
        .sort((a, b) => a.nama.localeCompare(b.nama));

      let countL = 0, countP = 0;
      clsStudents.forEach(s => {
        if (s.jenisKelamin === 'P') countP++;
        else countL++;
      });

      const matrixData = clsStudents.map((st, idx) => {
        const safeNisn = cleanNisn(st.nisn);
        const normName = normalizeName(st.nama);

        let totJamS = 0, totJamI = 0, totJamA = 0;
        let jmlHariS = 0, jmlHariI = 0, jmlHariA = 0;

        const days = daysArray.map(d => {
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
          days,
          totJamS,
          totJamI,
          totJamA,
          jmlHariS,
          jmlHariI,
          jmlHariA
        };
      });

      // Bottom Totals
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

      const wali = waliMap[clsClean] || waliMap[clsClean.replace(/[^A-Z0-9]/g, '')] || {
        rombel: clsClean,
        nama: '',
        nip: ''
      };

      return {
        kelas: clsClean,
        studentsCount: clsStudents.length,
        countL,
        countP,
        wali,
        matrixData,
        bottomTotals: {
          daysTotals,
          sumTotJamS,
          sumTotJamI,
          sumTotJamA,
          sumJmlHariS,
          sumJmlHariI,
          sumJmlHariA
        }
      };
    });
  }, [effectiveClasses, allStudents, daysArray, absenceMap, waliMap]);

  // Tanggal Tanda Tangan
  const tanggalTtd = `${daysInMonth} ${monthName} ${year}`;

  // Open modal to change classes directly
  const handleOpenClassPicker = async () => {
    const classSource = kelasList.length > 0 ? kelasList : ['7A', '7B', '7C', '7D', '7E', '7F', '7G', '7H', '7I', '8A', '8B', '8C', '8D', '8E', '8F', '8G', '8H', '8I', '9A', '9B', '9C', '9D', '9E', '9F', '9G', '9H'];

    const checkboxesHtml = classSource.map((k: string) => {
      const isChecked = effectiveClasses.includes(k);
      return `
        <label style="display: flex; align-items: center; gap: 6px; padding: 6px 8px; background: #ffffff; border: 1.5px solid #e2e8f0; border-radius: 6px; cursor: pointer; font-size: 0.82rem; font-weight: 700; color: #1e293b; user-select: none;">
          <input type="checkbox" class="modal-kelas-cb" value="${k}" ${isChecked ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px; accent-color: #0284c7;" />
          <span>${k}</span>
        </label>
      `;
    }).join('');

    const { value: selected } = await Swal.fire({
      title: 'Pilih Kelas untuk Dicetak',
      width: 580,
      html: `
        <div style="text-align: left; font-size: 0.88rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
            <label style="font-weight: 700; color: #334155;">Pilih satu atau beberapa kelas:</label>
            <div style="display: flex; gap: 4px; flex-wrap: wrap;">
              <button type="button" id="m-btn-all" style="background: #0284c7; color: white; border: none; padding: 2px 7px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Semua</button>
              <button type="button" id="m-btn-7" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Kls 7</button>
              <button type="button" id="m-btn-8" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Kls 8</button>
              <button type="button" id="m-btn-9" style="background: #e0f2fe; color: #0369a1; border: 1px solid #bae6fd; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Kls 9</button>
              <button type="button" id="m-btn-clear" style="background: #fee2e2; color: #dc2626; border: 1px solid #fecaca; padding: 2px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 700; cursor: pointer;">Reset</button>
            </div>
          </div>
          <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; max-height: 220px; overflow-y: auto; padding: 8px; border: 1.5px solid #cbd5e1; border-radius: 8px; background: #f8fafc;">
            ${checkboxesHtml}
          </div>
        </div>
      `,
      didOpen: () => {
        document.getElementById('m-btn-all')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-kelas-cb').forEach(cb => ((cb as HTMLInputElement).checked = true));
        });
        document.getElementById('m-btn-clear')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-kelas-cb').forEach(cb => ((cb as HTMLInputElement).checked = false));
        });
        document.getElementById('m-btn-7')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-kelas-cb').forEach(cb => {
            const input = cb as HTMLInputElement;
            if (input.value.startsWith('7')) input.checked = true;
          });
        });
        document.getElementById('m-btn-8')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-kelas-cb').forEach(cb => {
            const input = cb as HTMLInputElement;
            if (input.value.startsWith('8')) input.checked = true;
          });
        });
        document.getElementById('m-btn-9')?.addEventListener('click', () => {
          document.querySelectorAll('.modal-kelas-cb').forEach(cb => {
            const input = cb as HTMLInputElement;
            if (input.value.startsWith('9')) input.checked = true;
          });
        });
      },
      showCancelButton: true,
      confirmButtonColor: '#0284c7',
      confirmButtonText: 'Terapkan Pilihan',
      cancelButtonText: 'Batal',
      preConfirm: () => {
        const checked = Array.from(document.querySelectorAll('.modal-kelas-cb:checked')) as HTMLInputElement[];
        if (checked.length === 0) {
          Swal.showValidationMessage('Mohon pilih minimal 1 kelas!');
          return false;
        }
        return checked.map(c => c.value);
      }
    });

    if (selected && Array.isArray(selected) && selected.length > 0) {
      setSelectedClasses(selected);
      router.replace(`/presensi/cetak-rekap?kelas=${encodeURIComponent(selected.join(','))}&bulan=${encodeURIComponent(selectedBulan)}`);
    }
  };

  return (
    <div style={{ background: '#f1f5f9', minHeight: '100vh', fontFamily: 'Arial, sans-serif', color: '#000000' }}>
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page {
            size: A4 landscape;
            margin: 5mm 5mm;
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
          .print-container {
            padding: 0 !important;
            margin: 0 !important;
            background: #ffffff !important;
          }
          .class-sheet {
            box-shadow: none !important;
            border: none !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            box-sizing: border-box !important;
            page-break-after: always !important;
            break-after: page !important;
          }
          .class-sheet:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
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
          {/* Class Picker Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Kelas:</span>
            <button
              onClick={handleOpenClassPicker}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: '1.5px solid #0284c7',
                fontWeight: 700,
                fontSize: '12px',
                background: '#f0f9ff',
                color: '#0369a1',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
              title="Klik untuk memilih atau mengubah kelas yang akan dicetak"
            >
              <i className="fas fa-layer-group"></i>
              {effectiveClasses.length === 1
                ? `Kelas ${effectiveClasses[0]}`
                : `${effectiveClasses.length} Kelas Dipilih (${effectiveClasses.slice(0, 3).join(', ')}${effectiveClasses.length > 3 ? '...' : ''})`}
              <i className="fas fa-caret-down" style={{ marginLeft: 2 }}></i>
            </button>
          </div>

          {/* Month Picker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <label style={{ fontSize: '12px', fontWeight: 700, color: '#334155' }}>Bulan:</label>
            <input
              type="month"
              value={selectedBulan}
              onChange={(e) => {
                setSelectedBulan(e.target.value);
                router.replace(`/presensi/cetak-rekap?kelas=${encodeURIComponent(effectiveClasses.join(','))}&bulan=${encodeURIComponent(e.target.value)}`);
              }}
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

          {/* Quick jump between classes if multiple */}
          {effectiveClasses.length > 1 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Lompat ke:</label>
              <select
                onChange={(e) => {
                  const target = document.getElementById(`sheet-kelas-${e.target.value}`);
                  if (target) target.scrollIntoView({ behavior: 'smooth' });
                }}
                style={{
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '12px',
                  background: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                {effectiveClasses.map(k => (
                  <option key={k} value={k}>Kelas {k}</option>
                ))}
              </select>
            </div>
          )}
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
            <i className="fas fa-print"></i> Cetak / Simpan PDF ({effectiveClasses.length} Dokumen)
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

      {/* Printable Sheets Container */}
      <div className="print-container" style={{ padding: '20px 16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '28px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#0284c7', marginBottom: '12px' }}></i>
            <div style={{ fontWeight: 600, fontSize: '14px' }}>Memuat dan menyusun rekap kehadiran {effectiveClasses.length} kelas...</div>
          </div>
        ) : (
          classReports.map((report) => (
            <div
              key={report.kelas}
              id={`sheet-kelas-${report.kelas}`}
              className="class-sheet"
              style={{
                background: '#ffffff',
                width: '100%',
                maxWidth: '287mm',
                padding: '8mm 8mm',
                boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                boxSizing: 'border-box',
                borderRadius: '6px'
              }}
            >
              {/* Kop Surat Madrasah */}
              <div style={{ textAlign: 'center', marginBottom: '6px' }}>
                <img
                  src="/kop_surat_mts.png"
                  alt="Kop Surat MTs Almaarif 01 Singosari"
                  style={{
                    width: '100%',
                    maxHeight: '74px',
                    objectFit: 'contain',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              </div>

              {/* Title Block */}
              <div style={{ textAlign: 'center', marginBottom: '8px' }}>
                <h2 style={{
                  margin: 0,
                  fontSize: '12pt',
                  fontWeight: 900,
                  letterSpacing: '0.4px',
                  textTransform: 'uppercase',
                  color: '#000000',
                  lineHeight: 1.2
                }}>
                  REKAP KETIDAKHADIRAN MURID PER HARI
                </h2>
                <div style={{
                  fontSize: '9.5pt',
                  fontWeight: 800,
                  textTransform: 'uppercase',
                  marginTop: '1px',
                  color: '#000000'
                }}>
                  MTs ALMAARIF 01 SINGOSARI
                </div>
                <div style={{
                  fontSize: '8.5pt',
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
                fontSize: '8pt',
                fontWeight: 700,
                marginBottom: '6px',
                color: '#000000',
                lineHeight: 1.3
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '80px' }}>Kelas</span>
                    <span>: <strong>{report.kelas}</strong></span>
                  </div>
                  <div style={{ display: 'flex' }}>
                    <span style={{ width: '80px' }}>Wali Kelas</span>
                    <span>: <strong>{report.wali.nama || '-'}</strong></span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: '100px', textAlign: 'left' }}>Bulan</span>
                    <span style={{ textAlign: 'left' }}>: <strong>{monthName} {year}</strong></span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <span style={{ width: '100px', textAlign: 'left' }}>Jumlah Murid</span>
                    <span style={{ textAlign: 'left' }}>
                      : <strong>{report.studentsCount}</strong> &nbsp;|&nbsp; L = <strong>{report.countL}</strong> &nbsp; P = <strong>{report.countP}</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* Main Attendance Table */}
              <div style={{ width: '100%', overflowX: 'auto' }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '6.5pt',
                  fontFamily: 'Arial, sans-serif',
                  tableLayout: 'fixed',
                  border: '1.5px solid #000000',
                  color: '#000000'
                }}>
                  <thead>
                    <tr style={{ background: '#86efac', textAlign: 'center', fontWeight: 800, color: '#000000' }}>
                      <th rowSpan={2} style={{ width: '20px', border: '1px solid #000000', padding: '3px 1px' }}>NO</th>
                      <th rowSpan={2} style={{ width: '64px', border: '1px solid #000000', padding: '3px 2px' }}>No. Induk</th>
                      <th rowSpan={2} style={{ width: '70px', border: '1px solid #000000', padding: '3px 2px' }}>NISN</th>
                      <th rowSpan={2} style={{ width: '155px', border: '1px solid #000000', padding: '3px 4px', textAlign: 'left' }}>Nama Murid</th>
                      <th rowSpan={2} style={{ width: '20px', border: '1px solid #000000', padding: '3px 1px' }}>L/P</th>
                      <th colSpan={daysInMonth} style={{ border: '1px solid #000000', padding: '3px 2px', textTransform: 'uppercase' }}>
                        {monthName} {year}
                      </th>
                      <th colSpan={3} style={{ width: '48px', border: '1px solid #000000', padding: '3px 1px' }}>TOT. JAM</th>
                      <th colSpan={3} style={{ width: '48px', border: '1px solid #000000', padding: '3px 1px' }}>JML. HARI</th>
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
                              fontSize: '6.2pt'
                            }}
                          >
                            {d.day}
                          </th>
                        );
                      })}
                      <th style={{ width: '16px', border: '1px solid #000000', padding: '2px 0' }}>S</th>
                      <th style={{ width: '16px', border: '1px solid #000000', padding: '2px 0' }}>I</th>
                      <th style={{ width: '16px', border: '1px solid #000000', padding: '2px 0' }}>A</th>
                      <th style={{ width: '16px', border: '1px solid #000000', padding: '2px 0' }}>S</th>
                      <th style={{ width: '16px', border: '1px solid #000000', padding: '2px 0' }}>I</th>
                      <th style={{ width: '16px', border: '1px solid #000000', padding: '2px 0' }}>A</th>
                    </tr>
                  </thead>

                  <tbody>
                    {report.matrixData.length === 0 ? (
                      <tr>
                        <td colSpan={5 + daysInMonth + 6} style={{ textAlign: 'center', padding: '20px', border: '1px solid #000000', color: '#64748b' }}>
                          Tidak ada siswa aktif terdaftar di kelas {report.kelas}.
                        </td>
                      </tr>
                    ) : (
                      report.matrixData.map((row) => (
                        <tr key={row.no} style={{ background: '#ffffff', textAlign: 'center' }}>
                          <td style={{ border: '1px solid #000000', padding: '1.5px 1px' }}>{row.no}</td>
                          <td style={{ border: '1px solid #000000', padding: '1.5px 2px', whiteSpace: 'nowrap' }}>{row.noInduk}</td>
                          <td style={{ border: '1px solid #000000', padding: '1.5px 2px', whiteSpace: 'nowrap' }}>{row.nisn}</td>
                          <td style={{
                            border: '1px solid #000000',
                            padding: '1.5px 4px',
                            textAlign: 'left',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            fontWeight: 600
                          }}>
                            {row.nama}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '1.5px 1px' }}>{row.lp}</td>

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
                                  fontSize: '6.2pt',
                                  fontWeight: d.cellText ? 800 : 400
                                }}
                              >
                                {d.cellText}
                              </td>
                            );
                          })}

                          {/* Totals Jam */}
                          <td style={{ border: '1px solid #000000', padding: '1.5px 1px', fontWeight: row.totJamS > 0 ? 800 : 400 }}>
                            {row.totJamS}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '1.5px 1px', fontWeight: row.totJamI > 0 ? 800 : 400 }}>
                            {row.totJamI}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '1.5px 1px', fontWeight: row.totJamA > 0 ? 800 : 400, color: row.totJamA > 0 ? '#dc2626' : undefined }}>
                            {row.totJamA}
                          </td>

                          {/* Totals Hari */}
                          <td style={{ border: '1px solid #000000', padding: '1.5px 1px', fontWeight: row.jmlHariS > 0 ? 800 : 400 }}>
                            {row.jmlHariS}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '1.5px 1px', fontWeight: row.jmlHariI > 0 ? 800 : 400 }}>
                            {row.jmlHariI}
                          </td>
                          <td style={{ border: '1px solid #000000', padding: '1.5px 1px', fontWeight: row.jmlHariA > 0 ? 800 : 400, color: row.jmlHariA > 0 ? '#dc2626' : undefined }}>
                            {row.jmlHariA}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>

                  {/* Summary / Total Footer Row */}
                  <tfoot>
                    <tr style={{ background: '#fef9c3', fontWeight: 800, textAlign: 'center' }}>
                      <td colSpan={5} style={{ border: '1px solid #000000', padding: '2px 4px', textAlign: 'center' }}>
                        JUMLAH
                      </td>

                      {/* Day Absence Counts */}
                      {daysArray.map((d, dIdx) => {
                        const cnt = report.bottomTotals.daysTotals[dIdx] || 0;
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
                              fontSize: '6.2pt'
                            }}
                          >
                            {d.isSunday || d.isSaturday ? '' : cnt}
                          </td>
                        );
                      })}

                      {/* Total Jam S, I, A */}
                      <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{report.bottomTotals.sumTotJamS}</td>
                      <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{report.bottomTotals.sumTotJamI}</td>
                      <td style={{ border: '1px solid #000000', padding: '2px 1px', color: report.bottomTotals.sumTotJamA > 0 ? '#dc2626' : undefined }}>
                        {report.bottomTotals.sumTotJamA}
                      </td>

                      {/* Total Hari S, I, A */}
                      <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{report.bottomTotals.sumJmlHariS}</td>
                      <td style={{ border: '1px solid #000000', padding: '2px 1px' }}>{report.bottomTotals.sumJmlHariI}</td>
                      <td style={{ border: '1px solid #000000', padding: '2px 1px', color: report.bottomTotals.sumJmlHariA > 0 ? '#dc2626' : undefined }}>
                        {report.bottomTotals.sumJmlHariA}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Signature Section */}
              <div style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'flex-end',
                pageBreakInside: 'avoid'
              }}>
                <div style={{ textAlign: 'center', minWidth: '220px', fontSize: '8.5pt' }}>
                  <div>Singosari, {tanggalTtd}</div>
                  <div style={{ fontWeight: 700, marginTop: '2px' }}>Wali Kelas</div>
                  <div style={{ height: '48px' }}></div>
                  <div style={{
                    fontWeight: 900,
                    textDecoration: 'underline',
                    fontSize: '9pt'
                  }}>
                    {report.wali.nama || '...........................................'}
                  </div>
                  <div style={{ marginTop: '2px', fontSize: '8pt' }}>
                    {report.wali.nip ? `NIP. ${report.wali.nip}` : 'NIP. -'}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
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
