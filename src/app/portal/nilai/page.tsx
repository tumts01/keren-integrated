'use client';
import PortalFooter from '@/components/PortalFooter';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

interface GradeItem {
  mapel: string;
  nilai: number;
  predikat: string;
  keterangan: string;
  sts?: number;
  sas?: number;
  source: 'legger' | 'sts' | 'manual';
}

interface SemesterData {
  id: string;
  label: string;
  tingkat: string;
  semester: string;
  tahunAjaran: string;
  type: 'legger' | 'sts';
  typeLabel: string;
  totalNilai: number;
  rataRata: number;
  nilaiTertinggi: number;
  nilaiTerendah: number;
  jumlahMapel: number;
  predikatUmum: string;
  grades: GradeItem[];
}

export default function PortalNilai() {
  const router = useRouter();
  const [studentInfo, setStudentInfo] = useState<any>(null);
  const [semesters, setSemesters] = useState<SemesterData[]>([]);
  const [activeSemesterId, setActiveSemesterId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchMapel, setSearchMapel] = useState('');

  useEffect(() => {
    const sessionStr = localStorage.getItem('portal_session');
    if (!sessionStr) {
      router.replace('/portal/login');
      return;
    }
    try {
      const student = JSON.parse(sessionStr);
      setStudentInfo(student);

      fetch(`/api/portal/nilai?nisn=${encodeURIComponent(student.nisn || '')}&nis=${encodeURIComponent(student.nis || '')}`)
        .then(res => res.json())
        .then(resData => {
          if (resData.success && resData.semesters) {
            setSemesters(resData.semesters);
            if (resData.semesters.length > 0) {
              setActiveSemesterId(resData.defaultSemesterId || resData.semesters[0].id);
            }
          }
        })
        .catch(err => {
          console.error('Fetch nilai error:', err);
        })
        .finally(() => setLoading(false));
    } catch {
      router.replace('/portal/login');
    }
  }, [router]);

  // Current active semester data
  const currentSemester = useMemo(() => {
    return semesters.find(s => s.id === activeSemesterId) || semesters[0] || null;
  }, [semesters, activeSemesterId]);

  // Filtered grades within active semester
  const filteredGrades = useMemo(() => {
    if (!currentSemester) return [];
    if (!searchMapel.trim()) return currentSemester.grades;
    const q = searchMapel.toLowerCase();
    return currentSemester.grades.filter(g => g.mapel.toLowerCase().includes(q));
  }, [currentSemester, searchMapel]);

  // Helper colors based on grade score
  const getScoreBadgeStyle = (score: number) => {
    if (score >= 88) {
      return { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' };
    }
    if (score >= 75) {
      return { bg: '#f0f9ff', text: '#0284c7', border: '#bae6fd' };
    }
    if (score >= 60) {
      return { bg: '#fffbeb', text: '#d97706', border: '#fde68a' };
    }
    return { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' };
  };

  // Helper mapel icon
  const getMapelIcon = (mapelName: string) => {
    const lower = mapelName.toLowerCase();
    if (lower.includes('alquran') || lower.includes('hadis') || lower.includes('fikih') || lower.includes('akidah') || lower.includes('islam') || lower.includes('nu')) {
      return 'fa-quran';
    }
    if (lower.includes('arab') || lower.includes('inggris') || lower.includes('indonesia') || lower.includes('daerah')) {
      return 'fa-language';
    }
    if (lower.includes('matematika')) return 'fa-calculator';
    if (lower.includes('alam') || lower.includes('ipa')) return 'fa-atom';
    if (lower.includes('sosial') || lower.includes('ips') || lower.includes('pancasila')) return 'fa-globe-asia';
    if (lower.includes('jasmani') || lower.includes('pjok') || lower.includes('olahraga')) return 'fa-running';
    if (lower.includes('informatika')) return 'fa-laptop-code';
    if (lower.includes('seni') || lower.includes('budaya')) return 'fa-palette';
    return 'fa-book-reader';
  };

  return (
    <div className="portal-container" style={{ paddingBottom: '40px' }}>
      
      {/* Header */}
      <div className="portal-header" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button 
          onClick={() => router.back()} 
          style={{ background: 'none', border: 'none', color: 'white', fontSize: '20px', cursor: 'pointer' }}
          title="Kembali"
        >
          <i className="fas fa-arrow-left"></i>
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>Nilai & Rapor Siswa</h2>
          {studentInfo && (
            <div style={{ fontSize: '12px', opacity: 0.9, marginTop: '2px' }}>
              {studentInfo.nama} {studentInfo.kelas ? `• Kelas ${studentInfo.kelas}` : ''}
            </div>
          )}
        </div>
      </div>

      <div className="portal-content" style={{ marginTop: '16px' }}>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '32px', marginBottom: '14px', color: '#0284c7' }}></i>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>Memuat data legger & rapor...</p>
            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>Sinkronisasi dengan Legger Nilai Madrasah</span>
          </div>
        ) : semesters.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: '#94a3b8', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <i className="fas fa-clipboard-list" style={{ fontSize: '40px', marginBottom: '14px', color: '#cbd5e1' }}></i>
            <h4 style={{ margin: '0 0 6px 0', color: '#475569', fontSize: '16px' }}>Belum Ada Data Nilai</h4>
            <p style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.5 }}>
              Data Legger Nilai belum diunggah untuk siswa ini. Nilai resmi akan tampil setelah diunggah oleh bagian Kurikulum Madrasah.
            </p>
          </div>
        ) : (
          <>
            {/* Semester Selector Horizontal Scroll */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <i className="fas fa-layer-group" style={{ color: '#0284c7' }}></i> Pilih Semester:
              </div>

              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                overflowX: 'auto', 
                paddingBottom: '6px',
                scrollbarWidth: 'none'
              }}>
                {semesters.map(sem => {
                  const isActive = sem.id === activeSemesterId;
                  const isLegger = sem.type === 'legger';
                  return (
                    <button
                      key={sem.id}
                      type="button"
                      onClick={() => {
                        setActiveSemesterId(sem.id);
                        setSearchMapel('');
                      }}
                      style={{
                        flex: '0 0 auto',
                        padding: '8px 14px',
                        borderRadius: '20px',
                        border: isActive ? '2px solid #0284c7' : '1px solid #e2e8f0',
                        background: isActive ? '#0284c7' : '#ffffff',
                        color: isActive ? '#ffffff' : '#334155',
                        fontSize: '12px',
                        fontWeight: isActive ? 700 : 500,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        boxShadow: isActive ? '0 2px 8px rgba(2, 132, 199, 0.25)' : 'none',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <i className={isLegger ? 'fas fa-award' : 'fas fa-chart-line'} style={{ fontSize: '11px', opacity: isActive ? 1 : 0.7 }}></i>
                      <span>{sem.tingkat} {sem.semester}</span>
                      <span style={{ 
                        fontSize: '9.5px', 
                        padding: '1px 6px', 
                        borderRadius: '10px',
                        background: isActive ? 'rgba(255,255,255,0.25)' : (isLegger ? '#ecfdf5' : '#eff6ff'),
                        color: isActive ? '#ffffff' : (isLegger ? '#059669' : '#0284c7'),
                        fontWeight: 700
                      }}>
                        {sem.type === 'legger' ? 'Legger' : 'STS'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Current Semester Summary Card */}
            {currentSemester && (
              <div 
                className="portal-card" 
                style={{ 
                  padding: '18px', 
                  marginBottom: '16px',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.03)'
                }}
              >
                {/* Semester Header Info */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '14px' }}>
                  <div>
                    <h3 style={{ margin: '0 0 2px 0', fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>
                      {currentSemester.tingkat} - Semester {currentSemester.semester}
                    </h3>
                    <span style={{ fontSize: '11.5px', color: '#64748b' }}>
                      Tahun Ajaran {currentSemester.tahunAjaran}
                    </span>
                  </div>

                  {/* Authority Badge */}
                  <div>
                    {currentSemester.type === 'legger' ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: '#ecfdf5',
                        color: '#059669',
                        border: '1px solid #a7f3d0',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        <i className="fas fa-check-circle"></i> Legger Rapor Resmi
                      </span>
                    ) : (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '4px 10px',
                        borderRadius: '12px',
                        background: '#eff6ff',
                        color: '#0284c7',
                        border: '1px solid #bae6fd',
                        fontSize: '11px',
                        fontWeight: 700
                      }}>
                        <i className="fas fa-clock"></i> STS Tengah Semester
                      </span>
                    )}
                  </div>
                </div>

                {/* Stat Grid 4 Columns */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                  {/* Rata-Rata */}
                  <div style={{ background: '#f0f9ff', padding: '10px 6px', borderRadius: '10px', border: '1px solid #e0f2fe' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#0284c7', textTransform: 'uppercase', marginBottom: '2px' }}>Rata-Rata</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#0369a1' }}>{currentSemester.rataRata.toFixed(1)}</div>
                  </div>

                  {/* Total Nilai */}
                  <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Total</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>{currentSemester.totalNilai}</div>
                  </div>

                  {/* Predikat */}
                  <div style={{ background: '#ecfdf5', padding: '10px 6px', borderRadius: '10px', border: '1px solid #d1fae5' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#059669', textTransform: 'uppercase', marginBottom: '2px' }}>Predikat</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#047857' }}>{currentSemester.predikatUmum}</div>
                  </div>

                  {/* Jumlah Mapel */}
                  <div style={{ background: '#f8fafc', padding: '10px 6px', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: '2px' }}>Mapel</div>
                    <div style={{ fontSize: '17px', fontWeight: 800, color: '#1e293b' }}>{currentSemester.jumlahMapel}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Subject Search / Filter Input */}
            <div style={{ marginBottom: '12px', position: 'relative' }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: '12px' }}></i>
              <input
                type="text"
                placeholder="Cari mata pelajaran..."
                value={searchMapel}
                onChange={(e) => setSearchMapel(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  boxSizing: 'border-box',
                  border: '1px solid #cbd5e1',
                  borderRadius: '10px',
                  fontSize: '12px',
                  background: '#ffffff',
                  outline: 'none'
                }}
              />
              {searchMapel && (
                <button
                  type="button"
                  onClick={() => setSearchMapel('')}
                  style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '14px' }}
                >
                  &times;
                </button>
              )}
            </div>

            {/* List of Mata Pelajaran */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filteredGrades.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8', background: '#fff', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <p style={{ margin: 0, fontSize: '13px' }}>Tidak ada mata pelajaran yang cocok dengan pencarian.</p>
                </div>
              ) : (
                filteredGrades.map((item, idx) => {
                  const badge = getScoreBadgeStyle(item.nilai);
                  const icon = getMapelIcon(item.mapel);
                  return (
                    <div 
                      key={idx} 
                      className="portal-card" 
                      style={{ 
                        padding: '14px 16px', 
                        marginBottom: 0, 
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {/* Mapel Title & Details */}
                        <div style={{ flex: 1, paddingRight: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                            <div style={{ 
                              width: '28px', height: '28px', borderRadius: '6px', 
                              background: '#f1f5f9', color: '#0284c7', 
                              display: 'flex', alignItems: 'center', justifyContent: 'center', 
                              fontSize: '13px', flexShrink: 0 
                            }}>
                              <i className={`fas ${icon}`}></i>
                            </div>
                            <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b', lineHeight: 1.3 }}>
                              {item.mapel}
                            </h4>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: '36px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                              Predikat: <b style={{ color: '#0f172a' }}>{item.predikat}</b> ({item.keterangan})
                            </span>
                            
                            {/* Breakdown STS / SAS if available */}
                            {(item.sts !== undefined || item.sas !== undefined) && (
                              <div style={{ display: 'flex', gap: '4px', fontSize: '10px' }}>
                                {item.sts !== undefined && (
                                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    STS: {item.sts}
                                  </span>
                                )}
                                {item.sas !== undefined && (
                                  <span style={{ background: '#f1f5f9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                    SAS: {item.sas}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Nilai Score Pill */}
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ 
                            minWidth: '50px',
                            padding: '6px 12px',
                            borderRadius: '10px',
                            background: badge.bg,
                            color: badge.text,
                            border: `1.5px solid ${badge.border}`,
                            fontSize: '18px',
                            fontWeight: 900,
                            textAlign: 'center',
                            display: 'inline-block',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}>
                            {item.nilai}
                          </div>
                          <div style={{ fontSize: '10px', color: badge.text, fontWeight: 700, marginTop: '2px', textAlign: 'center' }}>
                            {item.source === 'legger' ? 'Nilai Rapor' : 'Nilai STS'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Official Source Callout */}
            <div style={{ 
              marginTop: '20px', 
              padding: '12px 16px', 
              borderRadius: '12px', 
              background: '#f8fafc', 
              border: '1px dashed #cbd5e1',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <i className="fas fa-shield-alt" style={{ fontSize: '20px', color: '#0284c7' }}></i>
              <div style={{ fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                <b>Legger Nilai Resmi Madrasah:</b> Data nilai bersumber langsung dari Legger Nilai Buku Induk Siswa MTsN yang telah disahkan oleh tim kurikulum madrasah.
              </div>
            </div>
          </>
        )}

      </div>
        <PortalFooter />
    </div>
  );
}
