'use client';

import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import styles from '@/components/EVoting.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
    const interval = setInterval(() => {
      fetchKandidat();
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const chartData = {
    labels: kandidatList.map(k => `Calon ${k.noUrut}: ${k.nama}`),
    datasets: [
      {
        label: 'Perolehan Suara',
        data: kandidatList.map(k => k.suara),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(168, 85, 247, 0.8)'
        ]
      }
    ]
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <div className={styles.quickCountCard} style={{ width: '100%', maxWidth: '1600px', background: 'white', margin: 0, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
        <h2 style={{ textAlign: 'center', marginBottom: '10px', fontSize: '2.5rem', color: '#1e293b' }}>
          <i className="fas fa-chart-bar" style={{ marginRight: '15px' }}></i>
          Hasil Quick Count Pemilihan OSIM
        </h2>
        <div style={{ marginBottom: '40px', textAlign: 'center', fontWeight: 'bold', color: '#3b82f6', fontSize: '1.5rem' }}>
          Total Suara Masuk: {totalPemilih} Suara
        </div>
        <div style={{ height: '600px', display: 'flex', justifyContent: 'center' }}>
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
                  ticks: { font: { size: 14 } }
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
        <p style={{ textAlign: 'center', marginTop: '30px', color: '#94a3b8', fontStyle: 'italic' }}>
          *Data diperbarui secara otomatis setiap 5 detik
        </p>
      </div>
    </div>
  );
}
