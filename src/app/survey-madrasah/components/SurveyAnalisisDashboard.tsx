'use client';

import React, { useState, useMemo } from 'react';

interface SurveyAnalisisDashboardProps {
  analytics: any;
  loading: boolean;
  onRefresh: () => void;
}

export default function SurveyAnalisisDashboard({
  analytics,
  loading,
  onRefresh
}: SurveyAnalisisDashboardProps) {
  const [subTab, setSubTab] = useState<'kepuasan' | 'wali' | 'siswa' | 'kelas'>('kepuasan');
  const [searchSaran, setSearchSaran] = useState('');
  const [searchHarapan, setSearchHarapan] = useState('');

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
        <i className="fas fa-spinner fa-spin fa-3x" style={{ color: '#4f46e5', marginBottom: '16px' }}></i>
        <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', margin: '0 0 6px 0' }}>
          Menganalisis Data Evaluasi Madrasah...
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem' }}>Menghitung persentase dan skor kepuasan responden</p>
      </div>
    );
  }

  if (!analytics || analytics.totalAll === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
        <i className="fas fa-chart-pie fa-3x" style={{ color: '#cbd5e1', marginBottom: '16px' }}></i>
        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', marginBottom: '8px' }}>
          Belum Ada Data Respon Survey
        </h3>
        <p style={{ color: '#64748b', fontSize: '0.95rem', maxWidth: '450px', margin: '0 auto 20px auto' }}>
          Belum ada isian survey yang tersimpan. Data persentase evaluasi akan otomatis terhitung saat siswa atau wali murid mengisi angket.
        </p>
        <button
          onClick={onRefresh}
          style={{
            background: '#4f46e5',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <i className="fas fa-sync-alt"></i> Muat Ulang Data
        </button>
      </div>
    );
  }

  const { totalAll, waliMurid, siswa, kepuasanOrtu, kelasDistribution } = analytics;

  // Filtered Saran Wali
  const filteredSaran = (waliMurid?.saranList || []).filter((s: any) => {
    if (!searchSaran) return true;
    const q = searchSaran.toLowerCase();
    return s.nama.toLowerCase().includes(q) || s.kelas.toLowerCase().includes(q) || s.saran.toLowerCase().includes(q);
  });

  // Filtered Harapan Siswa
  const filteredHarapan = (siswa?.harapanList || []).filter((h: any) => {
    if (!searchHarapan) return true;
    const q = searchHarapan.toLowerCase();
    return h.nama.toLowerCase().includes(q) || h.kelas.toLowerCase().includes(q) || h.harapan.toLowerCase().includes(q);
  });

  const getScoreBadge = (score: number) => {
    if (score >= 3.7) return { text: 'Sangat Memuaskan', bg: '#dcfce7', color: '#15803d', icon: 'fa-star' };
    if (score >= 3.0) return { text: 'Memuaskan / Baik', bg: '#e0f2fe', color: '#0369a1', icon: 'fa-check-circle' };
    if (score >= 2.5) return { text: 'Cukup Baik', bg: '#fef3c7', color: '#b45309', icon: 'fa-info-circle' };
    return { text: 'Perlu Evaluasi', bg: '#fee2e2', color: '#b91c1c', icon: 'fa-triangle-exclamation' };
  };

  const overallBadge = getScoreBadge(kepuasanOrtu?.overallScore || 0);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* Top Header & Action Controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#4f46e5', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              <i className="fas fa-chart-pie"></i>
            </span>
            Dasbor Evaluasi & Analisis Survey Madrasah
          </h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b' }}>
            Statistik persentase, indeks mutu layanan, dan rekomendasi evaluasi madrasah
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={onRefresh}
            style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: '#475569',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}
          >
            <i className="fas fa-sync-alt"></i> Refresh
          </button>
          <button
            onClick={() => window.print()}
            style={{
              background: '#4f46e5',
              border: 'none',
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontWeight: 700,
              color: 'white',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)'
            }}
          >
            <i className="fas fa-print"></i> Cetak Laporan
          </button>
        </div>
      </div>

      {/* 4 Executive KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        
        {/* Card 1: Total Responden */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Total Respon Terkumpul</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#ede9fe', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              <i className="fas fa-database"></i>
            </span>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#1e1b4b', lineHeight: 1.1 }}>
            {totalAll}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span>Wali: <strong>{waliMurid?.total || 0}</strong></span> • 
            <span>Siswa: <strong>{siswa?.total || 0}</strong></span> • 
            <span>Kepuasan: <strong>{kepuasanOrtu?.total || 0}</strong></span>
          </div>
        </div>

        {/* Card 2: Indeks Kepuasan Orang Tua */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Indeks Kepuasan Layanan</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#dcfce7', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              <i className="fas fa-heart"></i>
            </span>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#15803d', lineHeight: 1.1 }}>
            {kepuasanOrtu?.overallIndex || 0}%
          </div>
          <div style={{ fontSize: '0.8rem', color: '#166534', marginTop: '6px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ background: overallBadge.bg, color: overallBadge.color, padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
              <i className={`fas ${overallBadge.icon}`}></i> {overallBadge.text}
            </span>
          </div>
        </div>

        {/* Card 3: Rata-Rata Skor Mutu */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Skor Rata-Rata Mutu</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              <i className="fas fa-award"></i>
            </span>
          </div>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: '#0369a1', lineHeight: 1.1 }}>
            {kepuasanOrtu?.overallScore || 0} <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: 600 }}>/ 4.00</span>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '6px' }}>
            Skala 1.0 (Sangat Tidak Setuju) s.d 4.0 (Sangat Setuju)
          </div>
        </div>

        {/* Card 4: Top Alasan Memilih MTs */}
        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '18px 20px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Faktor Pilihan Utama (Wali)</span>
            <span style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#fef3c7', color: '#d97706', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
              <i className="fas fa-crown"></i>
            </span>
          </div>
          <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', lineHeight: 1.3, maxHeight: '42px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {waliMurid?.alasanBreakdown?.[0]?.label || '-'}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#d97706', marginTop: '8px', fontWeight: 700 }}>
            Dipilih oleh {waliMurid?.alasanBreakdown?.[0]?.percentage || 0}% responden wali murid
          </div>
        </div>

      </div>

      {/* Sub Tabs Navigation */}
      <div style={{
        display: 'flex',
        gap: '8px',
        borderBottom: '2px solid #e2e8f0',
        marginBottom: '24px',
        overflowX: 'auto',
        paddingBottom: '2px'
      }}>
        <button
          onClick={() => setSubTab('kepuasan')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'kepuasan' ? '3px solid #4f46e5' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: subTab === 'kepuasan' ? 800 : 600,
            color: subTab === 'kepuasan' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <i className="fas fa-heart-pulse"></i> Kepuasan Layanan (10 Aspek)
        </button>

        <button
          onClick={() => setSubTab('wali')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'wali' ? '3px solid #4f46e5' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: subTab === 'wali' ? 800 : 600,
            color: subTab === 'wali' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <i className="fas fa-user-friends"></i> Persepsi Wali Murid ({waliMurid?.total || 0})
        </button>

        <button
          onClick={() => setSubTab('siswa')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'siswa' ? '3px solid #4f46e5' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: subTab === 'siswa' ? 800 : 600,
            color: subTab === 'siswa' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <i className="fas fa-user-graduate"></i> Persepsi Siswa ({siswa?.total || 0})
        </button>

        <button
          onClick={() => setSubTab('kelas')}
          style={{
            background: 'none',
            border: 'none',
            borderBottom: subTab === 'kelas' ? '3px solid #4f46e5' : '3px solid transparent',
            padding: '10px 18px',
            fontSize: '0.95rem',
            fontWeight: subTab === 'kelas' ? 800 : 600,
            color: subTab === 'kelas' ? '#4f46e5' : '#64748b',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            transition: 'all 0.15s'
          }}
        >
          <i className="fas fa-chalkboard-user"></i> Sebaran per Kelas
        </button>
      </div>

      {/* ========================================================================= */}
      {/* SUBTAB 1: KEPUASAN LAYANAN ORANG TUA (10 ASPEK) */}
      {/* ========================================================================= */}
      {subTab === 'kepuasan' && (
        <div>
          {/* Executive SWOT / Insights */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px', marginBottom: '24px' }}>
            
            {/* Top Strengths */}
            <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534', fontWeight: 800, fontSize: '0.95rem', marginBottom: '12px' }}>
                <i className="fas fa-star" style={{ color: '#16a34a' }}></i> 3 Aspek Layanan Paling Memuaskan (Kekuatan)
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(kepuasanOrtu?.topStrengths || []).map((s: any, idx: number) => (
                  <div key={idx} style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#14532d', fontWeight: 600 }}>
                      #{idx + 1} {s.label}
                    </div>
                    <span style={{ background: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: '11px', padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                      {s.puasPct}% Puas
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Areas for Improvement */}
            <div style={{ background: '#fffbeb', border: '1.5px solid #fde047', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#92400e', fontWeight: 800, fontSize: '0.95rem', marginBottom: '12px' }}>
                <i className="fas fa-lightbulb" style={{ color: '#d97706' }}></i> 3 Area Prioritas Evaluasi & Peningkatan Mutu
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {(kepuasanOrtu?.areasToImprove || []).map((s: any, idx: number) => (
                  <div key={idx} style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '8px', border: '1px solid #fef08a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                    <div style={{ fontSize: '0.85rem', color: '#78350f', fontWeight: 600 }}>
                      #{idx + 1} {s.label}
                    </div>
                    <span style={{ background: '#fef3c7', color: '#b45309', fontWeight: 800, fontSize: '11px', padding: '3px 8px', borderRadius: '10px', whiteSpace: 'nowrap' }}>
                      Skor {s.avgScore} / 4.0
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* 10 Detailed Questions Breakdown */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Distribusi Persentase 10 Indikator Layanan Madrasah
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Berdasarkan penilaian skala Likert dari {kepuasanOrtu?.total || 0} orang tua / wali murid
                </p>
              </div>

              {/* Legend Indicator */}
              <div style={{ display: 'flex', gap: '12px', fontSize: '11.5px', fontWeight: 600, flexWrap: 'wrap' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#10b981' }}></span> Sangat Setuju
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#3b82f6' }}></span> Setuju
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#f59e0b' }}></span> Kurang Setuju
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#ef4444' }}></span> Sangat Tidak Setuju
                </span>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {(kepuasanOrtu?.questions || []).map((q: any) => {
                const total = q.total || 1;
                return (
                  <div
                    key={q.no}
                    style={{
                      background: '#f8fafc',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1e293b', flex: 1, minWidth: '240px' }}>
                        <span style={{ color: '#4f46e5', marginRight: '6px' }}>{q.no}.</span> {q.label}
                      </div>
                      
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px' }}>
                          {q.puasPct}% Puas
                        </span>
                        <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: '11.5px', fontWeight: 800, padding: '4px 10px', borderRadius: '8px' }}>
                          Skor {q.avgScore}
                        </span>
                      </div>
                    </div>

                    {/* Stacked Progress Bar */}
                    <div style={{
                      width: '100%',
                      height: '14px',
                      background: '#e2e8f0',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      display: 'flex',
                      marginBottom: '10px'
                    }}>
                      {q.sangatSetuju.pct > 0 && (
                        <div
                          style={{ width: `${q.sangatSetuju.pct}%`, background: '#10b981' }}
                          title={`Sangat Setuju: ${q.sangatSetuju.count} (${q.sangatSetuju.pct}%)`}
                        />
                      )}
                      {q.setuju.pct > 0 && (
                        <div
                          style={{ width: `${q.setuju.pct}%`, background: '#3b82f6' }}
                          title={`Setuju: ${q.setuju.count} (${q.setuju.pct}%)`}
                        />
                      )}
                      {q.kurangSetuju.pct > 0 && (
                        <div
                          style={{ width: `${q.kurangSetuju.pct}%`, background: '#f59e0b' }}
                          title={`Kurang Setuju: ${q.kurangSetuju.count} (${q.kurangSetuju.pct}%)`}
                        />
                      )}
                      {q.sangatTidakSetuju.pct > 0 && (
                        <div
                          style={{ width: `${q.sangatTidakSetuju.pct}%`, background: '#ef4444' }}
                          title={`Sangat Tidak Setuju: ${q.sangatTidakSetuju.count} (${q.sangatTidakSetuju.pct}%)`}
                        />
                      )}
                    </div>

                    {/* Numerical Breakdown Sub-row */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11.5px', color: '#475569' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span>Sangat Setuju:</span>
                        <strong style={{ color: '#059669' }}>{q.sangatSetuju.count} ({q.sangatSetuju.pct}%)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span>Setuju:</span>
                        <strong style={{ color: '#2563eb' }}>{q.setuju.count} ({q.setuju.pct}%)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span>Kurang Setuju:</span>
                        <strong style={{ color: '#d97706' }}>{q.kurangSetuju.count} ({q.kurangSetuju.pct}%)</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', background: '#fff', padding: '4px 8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                        <span>Tdk Setuju:</span>
                        <strong style={{ color: '#dc2626' }}>{q.sangatTidakSetuju.count} ({q.sangatTidakSetuju.pct}%)</strong>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 2: PERSEPSI WALI MURID */}
      {/* ========================================================================= */}
      {subTab === 'wali' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Alasan Memilih MTs */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Peringkat Alasan Wali Murid Memilih MTs Almaarif 01 Singosari
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Diurutkan dari alasan terbanyak yang menjadi faktor keputusan orang tua (Total {waliMurid?.total || 0} responden)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(waliMurid?.alasanBreakdown || []).map((item: any, idx: number) => {
                const isTop3 = idx < 3;
                return (
                  <div key={idx} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: isTop3 ? '1px solid #c7d2fe' : '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                        <span style={{ color: isTop3 ? '#4f46e5' : '#94a3b8', marginRight: '6px' }}>#{idx + 1}</span> {item.label}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#4f46e5', whiteSpace: 'nowrap' }}>
                        {item.percentage}% ({item.count} suara)
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(item.percentage, 100)}%`,
                          height: '100%',
                          background: isTop3 ? 'linear-gradient(90deg, #4f46e5, #818cf8)' : '#94a3b8',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Sumber Informasi */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Efektivitas Sumber Informasi & Saluran Promosi
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Darimana wali murid pertama kali mengetahui informasi tentang madrasah
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {(waliMurid?.sumberBreakdown || []).map((item: any, idx: number) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>{item.label}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7' }}>{item.percentage}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(item.percentage, 100)}%`, height: '100%', background: '#0284c7', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>{item.count} dari {waliMurid?.total || 0} responden</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Aspirasi, Kritik & Saran Masukan Wali Murid */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Aspirasi, Kritik & Saran Masukan Wali Murid
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Masukan langsung dari orang tua untuk evaluasi dan program madrasah ({filteredSaran.length} saran)
                </p>
              </div>

              <input
                type="text"
                placeholder="Cari saran, nama, atau kelas..."
                value={searchSaran}
                onChange={e => setSearchSaran(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  minWidth: '240px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredSaran.length > 0 ? (
                filteredSaran.map((s: any, idx: number) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1e293b', fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.5, flex: 1 }}>
                      &ldquo;{s.saran}&rdquo;
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: 'auto' }}>
                      <span style={{ fontWeight: 700, color: '#475569' }}>{s.nama} ({s.kelas})</span>
                      <span>{s.timestamp}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Tidak ada saran yang cocok dengan pencarian
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 3: PERSEPSI SISWA */}
      {/* ========================================================================= */}
      {subTab === 'siswa' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Section 1: Alasan Siswa Memilih MTs */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Peringkat Alasan Siswa Memilih MTs Almaarif 01 Singosari
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Faktor penentu mengapa siswa berminat belajar di madrasah (Total {siswa?.total || 0} responden)
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(siswa?.alasanBreakdown || []).map((item: any, idx: number) => {
                const isTop3 = idx < 3;
                return (
                  <div key={idx} style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '10px', border: isTop3 ? '1px solid #bae6fd' : '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', gap: '10px' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>
                        <span style={{ color: isTop3 ? '#0284c7' : '#94a3b8', marginRight: '6px' }}>#{idx + 1}</span> {item.label}
                      </span>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0284c7', whiteSpace: 'nowrap' }}>
                        {item.percentage}% ({item.count} siswa)
                      </span>
                    </div>

                    <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${Math.min(item.percentage, 100)}%`,
                          height: '100%',
                          background: isTop3 ? 'linear-gradient(90deg, #0284c7, #38bdf8)' : '#94a3b8',
                          borderRadius: '4px'
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Sumber Informasi Siswa */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Saluran Informasi Siswa
            </h3>
            <p style={{ margin: '0 0 18px 0', fontSize: '0.85rem', color: '#64748b' }}>
              Media yang paling banyak menjangkau calon siswa baru
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
              {(siswa?.sumberBreakdown || []).map((item: any, idx: number) => (
                <div key={idx} style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#334155' }}>{item.label}</span>
                    <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#059669' }}>{item.percentage}%</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.min(item.percentage, 100)}%`, height: '100%', background: '#059669', borderRadius: '3px' }} />
                  </div>
                  <span style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', display: 'block' }}>{item.count} dari {siswa?.total || 0} responden</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Harapan Siswa */}
          <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
                  Harapan Siswa untuk Madrasah ke Depan
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' }}>
                  Aspirasi dan cita-cita ananda untuk MTs Almaarif ({filteredHarapan.length} respon)
                </p>
              </div>

              <input
                type="text"
                placeholder="Cari harapan, nama, atau kelas..."
                value={searchHarapan}
                onChange={e => setSearchHarapan(e.target.value)}
                style={{
                  padding: '8px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.875rem',
                  minWidth: '240px'
                }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px', maxHeight: '500px', overflowY: 'auto', paddingRight: '4px' }}>
              {filteredHarapan.length > 0 ? (
                filteredHarapan.map((h: any, idx: number) => (
                  <div key={idx} style={{ background: '#f8fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ fontSize: '0.875rem', color: '#1e293b', fontStyle: 'italic', marginBottom: '10px', lineHeight: 1.5, flex: 1 }}>
                      &ldquo;{h.harapan}&rdquo;
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', color: '#64748b', borderTop: '1px dashed #e2e8f0', paddingTop: '8px', marginTop: 'auto' }}>
                      <span style={{ fontWeight: 700, color: '#0369a1' }}>{h.nama} ({h.kelas})</span>
                      <span>{h.timestamp}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  Tidak ada data harapan yang cocok
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBTAB 4: SEBARAN PER KELAS */}
      {/* ========================================================================= */}
      {subTab === 'kelas' && (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.03)' }}>
          <h3 style={{ margin: '0 0 6px 0', fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
            Partisipasi Responden Berdasarkan Rombongan Belajar (Kelas)
          </h3>
          <p style={{ margin: '0 0 20px 0', fontSize: '0.85rem', color: '#64748b' }}>
            Pemetaan keaktifan pengisian survey per kelas untuk bahan monitoring dan evaluasi wali kelas
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569', fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 14px' }}>Rombel / Kelas</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Angket Wali</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Angket Siswa</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Kepuasan Ortu</th>
                  <th style={{ padding: '12px 14px', textAlign: 'center' }}>Total Respon</th>
                  <th style={{ padding: '12px 14px' }}>Visual Partisipasi</th>
                </tr>
              </thead>
              <tbody>
                {(kelasDistribution || []).map((k: any, idx: number) => {
                  const maxClassTotal = Math.max(...(kelasDistribution || []).map((x: any) => x.total), 1);
                  const barPct = Math.round((k.total / maxClassTotal) * 100);

                  return (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 14px', fontWeight: 800, color: '#1e293b' }}>
                        <span style={{ background: '#eef2ff', color: '#4f46e5', padding: '4px 10px', borderRadius: '6px' }}>
                          Kelas {k.kelas}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#334155' }}>{k.waliMurid}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#334155' }}>{k.siswa}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', color: '#334155' }}>{k.kepuasanOrtu}</td>
                      <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                        {k.total}
                      </td>
                      <td style={{ padding: '12px 14px', minWidth: '160px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: `${barPct}%`, height: '100%', background: '#4f46e5', borderRadius: '4px' }} />
                          </div>
                          <span style={{ fontSize: '11px', color: '#64748b', width: '32px' }}>{barPct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
