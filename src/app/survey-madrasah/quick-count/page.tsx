'use client';

import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const COLORS = [
  { bg: 'rgba(59, 130, 246, 0.85)', border: '#3b82f6', light: '#eff6ff' },
  { bg: 'rgba(16, 185, 129, 0.85)', border: '#10b981', light: '#f0fdf4' },
  { bg: 'rgba(245, 158, 11, 0.85)',  border: '#f59e0b', light: '#fffbeb' },
  { bg: 'rgba(239, 68, 68, 0.85)',   border: '#ef4444', light: '#fef2f2' },
  { bg: 'rgba(168, 85, 247, 0.85)',  border: '#a855f7', light: '#faf5ff' },
];

function getImageUrl(url: string) {
  if (!url) return '';
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  if (url.includes('drive.google.com') && match && match[1]) {
    return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w400`;
  }
  return url;
}

export default function QuickCountPage() {
  const [kandidatList, setKandidatList] = useState<any[]>([]);
  const [totalPemilih, setTotalPemilih] = useState(0);

  const fetchKandidat = async () => {
    try {
      const res = await fetch('/api/e-voting/kandidat?t=' + Date.now());
      const result = await res.json();
      if (result.success) {
        setKandidatList(result.data);
        setTotalPemilih(result.totalPemilih || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchKandidat();
    const interval = setInterval(fetchKandidat, 5000);
    return () => clearInterval(interval);
  }, []);

  const maxSuara = Math.max(...kandidatList.map(k => k.suara), 1);

  const chartData = {
    labels: kandidatList.map(k => `Calon ${k.noUrut}: ${k.nama}`),
    datasets: [
      {
        label: 'Perolehan Suara',
        data: kandidatList.map(k => k.suara),
        backgroundColor: kandidatList.map((_, i) => COLORS[i % COLORS.length].bg),
        borderColor: kandidatList.map((_, i) => COLORS[i % COLORS.length].border),
        borderWidth: 2,
        borderRadius: 10,
      }
    ]
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', padding: '30px 20px' }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '2.8rem', fontWeight: 900, color: 'white', margin: 0, letterSpacing: '-0.5px' }}>
          <i className="fas fa-vote-yea" style={{ marginRight: '15px', color: '#fbbf24' }}></i>
          Live Quick Count — Pemilihan OSIM
        </h1>
        <div style={{ marginTop: '12px', display: 'inline-block', background: 'rgba(59,130,246,0.25)', border: '1px solid #3b82f6', borderRadius: '30px', padding: '8px 30px' }}>
          <span style={{ color: '#93c5fd', fontWeight: 700, fontSize: '1.3rem' }}>
            Total Suara Masuk: <span style={{ color: '#fbbf24', fontSize: '1.6rem' }}>{totalPemilih}</span> Suara
          </span>
        </div>
      </div>

      {/* Foto Kandidat */}
      {kandidatList.length > 0 && (
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginBottom: '30px', flexWrap: 'wrap' }}>
          {kandidatList.map((k, i) => {
            const color = COLORS[i % COLORS.length];
            const isLeader = k.suara === maxSuara && k.suara > 0;
            return (
              <div key={k.id} style={{
                background: 'white',
                borderRadius: '20px',
                padding: '18px 16px',
                textAlign: 'center',
                width: '200px',
                boxShadow: isLeader
                  ? `0 0 0 4px ${color.border}, 0 15px 35px rgba(0,0,0,0.35)`
                  : '0 8px 25px rgba(0,0,0,0.25)',
                position: 'relative',
                transition: 'all 0.3s ease',
              }}>
                {isLeader && (
                  <div style={{
                    position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
                    background: '#fbbf24', color: '#1e293b', borderRadius: '20px',
                    padding: '4px 14px', fontSize: '0.75rem', fontWeight: 800, whiteSpace: 'nowrap'
                  }}>
                    👑 Unggul
                  </div>
                )}
                <div style={{
                  width: '120px', height: '150px', borderRadius: '12px', overflow: 'hidden',
                  margin: '0 auto 12px', border: `3px solid ${color.border}`,
                  background: '#1e293b'
                }}>
                  {k.fotoKetua ? (
                    <img
                      src={getImageUrl(k.fotoKetua)}
                      alt={k.nama}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  ) : (
                    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <i className="fas fa-user" style={{ fontSize: '3rem', color: '#475569' }}></i>
                    </div>
                  )}
                </div>
                <div style={{
                  display: 'inline-block', background: color.light, color: color.border,
                  borderRadius: '20px', padding: '2px 12px', fontSize: '0.8rem', fontWeight: 700, marginBottom: '6px'
                }}>
                  Calon {k.noUrut}
                </div>
                <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#1e293b', marginBottom: '8px', lineHeight: 1.3 }}>{k.nama}</div>
                <div style={{
                  fontSize: '2rem', fontWeight: 900, color: color.border,
                  borderTop: `2px solid ${color.light}`, paddingTop: '8px'
                }}>
                  {k.suara}
                  <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 500 }}> suara</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Chart */}
      <div style={{ background: 'white', borderRadius: '20px', padding: '30px', boxShadow: '0 10px 40px rgba(0,0,0,0.3)' }}>
        <div style={{ height: '400px' }}>
          <Bar
            data={chartData}
            options={{
              maintainAspectRatio: false,
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { precision: 0, font: { size: 16 } }
                },
                x: {
                  ticks: { font: { size: 14, weight: 'bold' } }
                }
              },
              plugins: {
                legend: { display: false },
                tooltip: {
                  titleFont: { size: 16 },
                  bodyFont: { size: 16 }
                }
              }
            }}
          />
        </div>
      </div>

      <p style={{ textAlign: 'center', marginTop: '20px', color: 'rgba(255,255,255,0.4)', fontStyle: 'italic', fontSize: '0.9rem' }}>
        <i className="fas fa-sync-alt" style={{ marginRight: '6px' }}></i>
        Data diperbarui secara otomatis setiap 5 detik
      </p>
    </div>
  );
}
