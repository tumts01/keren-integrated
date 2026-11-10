'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import InlineLoading from '@/components/InlineLoading';
import { TabelPenilaianCabangConfig } from '@/lib/olimpiade-config';

export default function PenilaianJuriPage() {
  const router = useRouter();
  const [juriData, setJuriData] = useState<any>(null);
  const [peserta, setPeserta] = useState<any[]>([]);
  const [tabelConfig, setTabelConfig] = useState<TabelPenilaianCabangConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'semua' | 'belum' | 'sudah'>('semua');

  // Local editable state per peserta: { [pesertaId]: { aspek: Record<string, string>, catatan: string, total: number | null } }
  const [drafts, setDrafts] = useState<Record<number, { aspek: Record<string, string>; catatan: string; total: number | null }>>({});

  useEffect(() => {
    const data = localStorage.getItem('keren_juri_data');
    if (!data) {
      router.push('/olimpiade-seni/juri');
      return;
    }
    const parsed = JSON.parse(data);
    setJuriData(parsed);
    fetchData(parsed.id, parsed.cabang_lomba);
  }, []);

  const fetchData = async (juriId: string, cabangLomba: string) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/olimpiade-seni/juri/penilaian?juriId=${encodeURIComponent(juriId)}&cabangLomba=${encodeURIComponent(cabangLomba)}`
      );
      const json = await res.json();
      if (json.success) {
        setPeserta(json.data || []);
        setTabelConfig(json.tabel_config || null);

        const initialDrafts: Record<number, { aspek: Record<string, string>; catatan: string; total: number | null }> = {};
        (json.data || []).forEach((p: any) => {
          const aspekStrMap: Record<string, string> = {};
          if (p.aspek && typeof p.aspek === 'object') {
            Object.entries(p.aspek).forEach(([k, v]) => {
              if (v !== null && v !== undefined && v !== '') {
                aspekStrMap[k] = String(v);
              }
            });
          }
          initialDrafts[p.id] = {
            aspek: aspekStrMap,
            catatan: p.catatan || '',
            total: p.nilai !== null && p.nilai !== undefined ? Number(p.nilai) : null
          };
        });
        setDrafts(initialDrafts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('keren_juri_data');
    router.push('/olimpiade-seni/juri');
  };

  const computeTotalFromAspek = (aspekMap: Record<string, string>, cfg: TabelPenilaianCabangConfig | null): number | null => {
    if (!cfg || !Array.isArray(cfg.aspek) || cfg.aspek.length === 0) return null;
    const filledValues: number[] = [];
    cfg.aspek.forEach(a => {
      const raw = aspekMap[a.id];
      if (raw !== undefined && raw !== '') {
        const num = parseFloat(raw);
        if (!isNaN(num)) filledValues.push(num);
      }
    });
    if (filledValues.length === 0) return null;
    const sum = filledValues.reduce((acc, v) => acc + v, 0);
    if (cfg.modeHitung === 'avg') {
      return Number((sum / cfg.aspek.length).toFixed(2));
    }
    return Number(sum.toFixed(2));
  };

  const handleAspekChange = (pesertaId: number, aspekId: string, valStr: string, maxVal: number) => {
    if (valStr !== '') {
      const num = parseFloat(valStr);
      if (!isNaN(num) && (num < 0 || num > maxVal)) {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'warning',
          title: `Nilai maksimal aspek ini adalah ${maxVal}`,
          showConfirmButton: false,
          timer: 2000
        });
        return;
      }
    }

    setDrafts(prev => {
      const cur = prev[pesertaId] || { aspek: {}, catatan: '', total: null };
      const nextAspek = { ...cur.aspek, [aspekId]: valStr };
      const nextTotal = computeTotalFromAspek(nextAspek, tabelConfig);
      return {
        ...prev,
        [pesertaId]: {
          ...cur,
          aspek: nextAspek,
          total: nextTotal
        }
      };
    });
  };

  const handleCatatanChange = (pesertaId: number, catatan: string) => {
    setDrafts(prev => {
      const cur = prev[pesertaId] || { aspek: {}, catatan: '', total: null };
      return {
        ...prev,
        [pesertaId]: {
          ...cur,
          catatan
        }
      };
    });
  };

  const handleSaveRow = async (pesertaId: number, silentToast: boolean = true) => {
    const draft = drafts[pesertaId];
    if (!draft || draft.total === null || isNaN(draft.total)) return;

    const numericAspek: Record<string, number> = {};
    Object.entries(draft.aspek).forEach(([k, v]) => {
      if (v !== '') {
        const n = parseFloat(v);
        if (!isNaN(n)) numericAspek[k] = n;
      }
    });

    setSavingId(pesertaId);
    try {
      const res = await fetch('/api/olimpiade-seni/juri/penilaian', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          juri_id: juriData.id,
          peserta_id: pesertaId,
          nilai: draft.total,
          aspek: numericAspek,
          catatan: draft.catatan
        })
      });
      const json = await res.json();
      if (json.success) {
        setPeserta(prev =>
          prev.map(p =>
            p.id === pesertaId
              ? { ...p, nilai: draft.total, aspek: numericAspek, catatan: draft.catatan }
              : p
          )
        );
        if (silentToast) {
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: `Tersimpan (Total: ${draft.total})`,
            showConfirmButton: false,
            timer: 1400
          });
        }
      } else {
        Swal.fire('Gagal', json.error || 'Gagal menyimpan nilai', 'error');
      }
    } catch (err) {
      Swal.fire('Error', 'Kesalahan jaringan saat menyimpan nilai', 'error');
    } finally {
      setSavingId(null);
    }
  };

  const handleExportExcelJuri = () => {
    const aspekCols = tabelConfig?.aspek || [];
    const rows = peserta.map((p, idx) => {
      const d = drafts[p.id] || { aspek: {}, catatan: '', total: p.nilai };
      const rowObj: Record<string, any> = {
        No: idx + 1,
        'Nomor Peserta': p.nomor_peserta || '-',
        'Nama Peserta / Regu': p.nama,
        'Asal Sekolah': p.asal_sekolah || '-'
      };
      aspekCols.forEach(a => {
        rowObj[`${a.nama} (Maks ${a.bobotMaks})`] = d.aspek[a.id] !== undefined && d.aspek[a.id] !== '' ? Number(d.aspek[a.id]) : '';
      });
      rowObj['Total Nilai'] = d.total !== null ? d.total : '';
      if (tabelConfig?.tampilkanCatatan) {
        rowObj['Catatan Juri'] = d.catatan || '';
      }
      return rowObj;
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Penilaian Juri');
    XLSX.writeFile(wb, `Penilaian_Juri_${juriData?.cabang_lomba || 'Seni'}_${juriData?.nama_juri || ''}.xlsx`);
  };

  const filteredPeserta = useMemo(() => {
    return peserta.filter(p => {
      const d = drafts[p.id];
      const sudah = d?.total !== null && d?.total !== undefined;
      if (filterStatus === 'sudah' && !sudah) return false;
      if (filterStatus === 'belum' && sudah) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchNama = (p.nama || '').toLowerCase().includes(q);
        const matchNo = (p.nomor_peserta || '').toLowerCase().includes(q);
        const matchSek = (p.asal_sekolah || '').toLowerCase().includes(q);
        return matchNama || matchNo || matchSek;
      }
      return true;
    });
  }, [peserta, drafts, filterStatus, searchTerm]);

  const totalPesertaCount = peserta.length;
  const sudahDinilaiCount = peserta.filter(p => drafts[p.id]?.total !== null && drafts[p.id]?.total !== undefined).length;
  const progressPct = totalPesertaCount > 0 ? Math.round((sudahDinilaiCount / totalPesertaCount) * 100) : 0;

  if (!juriData) return null;

  const aspekList = tabelConfig?.aspek || [];
  const totalMaks = aspekList.reduce((acc, a) => acc + (Number(a.bobotMaks) || 0), 0);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', padding: '20px' }}>
      <div style={{ maxWidth: '1240px', margin: '0 auto' }}>
        {/* Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'white',
            padding: '22px 26px',
            borderRadius: '18px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '18px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px', flexWrap: 'wrap', flex: '1 1 540px' }}>
            {/* Logo Olimpiade */}
            <div
              style={{
                width: '76px',
                height: '76px',
                minWidth: '76px',
                borderRadius: '16px',
                background: '#f8fafc',
                border: '1.5px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '6px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}
            >
              <img
                src="/logo_olimpiade_seni.png"
                alt="Logo Olimpiade & Seni"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/logo.png';
                }}
              />
            </div>

            {/* Info Dewan Juri & Cabang */}
            <div style={{ flex: '1 1 360px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5, flexWrap: 'wrap' }}>
                <span
                  style={{
                    background: '#ecfdf5',
                    color: '#059669',
                    border: '1px solid #a7f3d0',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    letterSpacing: '0.03em'
                  }}
                >
                  PORTAL DEWAN JURI RESMI
                </span>
                <span
                  style={{
                    background: '#f0f9ff',
                    color: '#0284c7',
                    border: '1px solid #bae6fd',
                    padding: '3px 10px',
                    borderRadius: 20,
                    fontSize: '0.75rem',
                    fontWeight: 800
                  }}
                >
                  LOMBA SENI
                </span>
                <span style={{ fontSize: '0.82rem', color: '#64748b', fontWeight: 600 }}>
                  MTs Almaarif 01 Singosari
                </span>
              </div>

              <h2 style={{ margin: '0 0 8px 0', color: '#0f172a', fontSize: '1.45rem', fontWeight: 800 }}>
                Lembar Penilaian Juri — <span style={{ color: '#0284c7' }}>{juriData.cabang_lomba}</span>
              </h2>

              {/* Tonjolkan Nama Juri */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                  color: 'white',
                  padding: '7px 16px',
                  borderRadius: 12,
                  boxShadow: '0 3px 10px rgba(2, 132, 199, 0.28)',
                  marginBottom: 6
                }}
              >
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: '50%',
                    background: 'rgba(255, 255, 255, 0.22)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}
                >
                  <i className="fas fa-user-tie"></i>
                </div>
                <div>
                  <div style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#bae6fd', fontWeight: 700 }}>
                    Dewan Juri
                  </div>
                  <div style={{ fontSize: '1.2rem', fontWeight: 900, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                    {juriData.nama_juri}
                  </div>
                </div>
              </div>

              <p style={{ margin: '4px 0 0 0', color: '#64748b', fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
                <span>Nilai tiap aspek otomatis dijumlahkan dan tersimpan saat Anda berpindah kolom input.</span>
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={handleExportExcelJuri}
              style={{
                background: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8
              }}
            >
              <i className="fas fa-file-excel"></i> Download Excel Nilai Saya
            </button>

            <button
              onClick={() => fetchData(juriData.id, juriData.cabang_lomba)}
              style={{
                background: '#f8fafc',
                color: '#334155',
                border: '1px solid #cbd5e1',
                padding: '10px 14px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem'
              }}
            >
              <i className="fas fa-sync-alt"></i> Segarkan
            </button>

            <button
              onClick={handleLogout}
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '10px',
                cursor: 'pointer',
                fontWeight: 700,
                fontSize: '0.88rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <i className="fas fa-sign-out-alt"></i> Keluar
            </button>
          </div>
        </div>

        {/* Progress & Filter Bar */}
        <div
          style={{
            background: 'white',
            padding: '16px 22px',
            borderRadius: '14px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.04)',
            marginBottom: '18px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '14px'
          }}
        >
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#334155', marginBottom: 6 }}>
              <span>Progres Pengisian Nilai Anda:</span>
              <span style={{ color: '#059669' }}>
                {sudahDinilaiCount} dari {totalPesertaCount} Peserta ({progressPct}%)
              </span>
            </div>
            <div style={{ width: '100%', height: 10, background: '#e2e8f0', borderRadius: 99, overflow: 'hidden' }}>
              <div
                style={{
                  width: `${progressPct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #10b981 0%, #0284c7 100%)',
                  transition: 'width 0.3s ease'
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Cari No. Peserta / Nama / Sekolah..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                minWidth: 240,
                outline: 'none'
              }}
            />

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as any)}
              style={{
                padding: '9px 14px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                fontSize: '0.88rem',
                fontWeight: 700,
                color: '#334155',
                background: 'white'
              }}
            >
              <option value="semua">Semua Peserta ({totalPesertaCount})</option>
              <option value="belum">Belum Dinilai ({totalPesertaCount - sudahDinilaiCount})</option>
              <option value="sudah">Sudah Dinilai ({sudahDinilaiCount})</option>
            </select>
          </div>
        </div>

        {/* Main Scoring Table */}
        <div style={{ background: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: '50px', textAlign: 'center' }}>
              <InlineLoading message="Memuat tabel penilaian peserta..." />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
                <thead>
                  <tr style={{ background: '#0f172a', color: 'white', textAlign: 'left' }}>
                    <th style={{ padding: '14px 12px', width: 50, textAlign: 'center' }}>No</th>
                    <th style={{ padding: '14px 12px', width: 130 }}>No. Peserta</th>
                    <th style={{ padding: '14px 12px', minWidth: 200 }}>Nama Peserta / Regu</th>
                    <th style={{ padding: '14px 12px', minWidth: 180 }}>Asal Sekolah</th>
                    {aspekList.map(a => (
                      <th key={a.id} style={{ padding: '14px 12px', width: 155, textAlign: 'center', background: '#1e293b' }}>
                        <div style={{ fontWeight: 800, color: '#38bdf8' }}>{a.nama}</div>
                        <div style={{ fontSize: '0.72rem', color: '#cbd5e1', fontWeight: 600, marginTop: 2 }}>
                          Maks: {a.bobotMaks} Poin
                        </div>
                      </th>
                    ))}
                    <th style={{ padding: '14px 12px', width: 130, textAlign: 'center', background: '#065f46' }}>
                      <div style={{ fontWeight: 900, color: '#fde047' }}>TOTAL NILAI</div>
                      <div style={{ fontSize: '0.7rem', color: '#a7f3d0' }}>
                        {tabelConfig?.modeHitung === 'avg' ? 'Rata-Rata' : `Maks ${totalMaks}`}
                      </div>
                    </th>
                    {tabelConfig?.tampilkanCatatan && (
                      <th style={{ padding: '14px 12px', minWidth: 180 }}>Catatan / Komentar Juri</th>
                    )}
                    <th style={{ padding: '14px 12px', width: 100, textAlign: 'center' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPeserta.length === 0 ? (
                    <tr>
                      <td colSpan={6 + aspekList.length} style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
                        Tidak ada data peserta yang sesuai dengan pencarian/filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPeserta.map((p, idx) => {
                      const d = drafts[p.id] || { aspek: {}, catatan: '', total: null };
                      const isSaved = p.nilai !== null && p.nilai !== undefined;
                      const isSavingThis = savingId === p.id;

                      return (
                        <tr
                          key={p.id}
                          style={{
                            borderBottom: '1px solid #e2e8f0',
                            background: isSaved ? '#f0fdf4' : idx % 2 === 0 ? '#ffffff' : '#f8fafc'
                          }}
                        >
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#64748b' }}>
                            {idx + 1}
                          </td>
                          <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 800, color: '#0284c7' }}>
                            {p.nomor_peserta}
                          </td>
                          <td style={{ padding: '12px', fontWeight: 800, color: '#0f172a' }}>{p.nama}</td>
                          <td style={{ padding: '12px', color: '#475569', fontSize: '0.85rem' }}>
                            {p.asal_sekolah || '-'}
                          </td>

                          {/* Kolom Input Tiap Aspek Penilaian */}
                          {aspekList.map(a => (
                            <td key={a.id} style={{ padding: '10px 8px', textAlign: 'center' }}>
                              <input
                                type="number"
                                min={0}
                                max={a.bobotMaks}
                                step="0.5"
                                value={d.aspek[a.id] ?? ''}
                                onChange={e => handleAspekChange(p.id, a.id, e.target.value, a.bobotMaks)}
                                onBlur={() => handleSaveRow(p.id, true)}
                                placeholder={`0 - ${a.bobotMaks}`}
                                style={{
                                  width: '100%',
                                  maxWidth: 115,
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #cbd5e1',
                                  textAlign: 'center',
                                  fontWeight: 800,
                                  fontSize: '0.98rem',
                                  color: '#0f172a',
                                  background: 'white',
                                  outline: 'none'
                                }}
                              />
                            </td>
                          ))}

                          {/* Kolom Total Nilai */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <div
                              style={{
                                background: d.total !== null ? '#dcfce7' : '#f1f5f9',
                                border: `1.5px solid ${d.total !== null ? '#10b981' : '#cbd5e1'}`,
                                color: d.total !== null ? '#047857' : '#94a3b8',
                                padding: '8px 10px',
                                borderRadius: '10px',
                                fontWeight: 900,
                                fontSize: '1.1rem'
                              }}
                            >
                              {d.total !== null ? d.total : '-'}
                            </div>
                          </td>

                          {/* Kolom Catatan Juri */}
                          {tabelConfig?.tampilkanCatatan && (
                            <td style={{ padding: '10px 8px' }}>
                              <input
                                type="text"
                                value={d.catatan || ''}
                                onChange={e => handleCatatanChange(p.id, e.target.value)}
                                onBlur={() => handleSaveRow(p.id, true)}
                                placeholder="Catatan singkat (opsional)..."
                                style={{
                                  width: '100%',
                                  padding: '8px 10px',
                                  borderRadius: '8px',
                                  border: '1px solid #cbd5e1',
                                  fontSize: '0.84rem',
                                  background: 'white'
                                }}
                              />
                            </td>
                          )}

                          {/* Tombol Simpan / Status */}
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleSaveRow(p.id, false)}
                              disabled={isSavingThis || d.total === null}
                              style={{
                                background: isSaved ? '#10b981' : '#0284c7',
                                color: 'white',
                                border: 'none',
                                padding: '7px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: 800,
                                cursor: d.total === null ? 'not-allowed' : 'pointer',
                                opacity: d.total === null ? 0.5 : 1,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: 5
                              }}
                            >
                              <i className={`fas ${isSavingThis ? 'fa-spinner fa-spin' : isSaved ? 'fa-check-circle' : 'fa-save'}`}></i>
                              <span>{isSavingThis ? '...' : isSaved ? 'Tersimpan' : 'Simpan'}</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
