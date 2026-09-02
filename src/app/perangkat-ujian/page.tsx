'use client';
import { useState } from 'react';

export default function PerangkatUjianPage() {
  const [activeTab, setActiveTab] = useState<'nopes' | 'nobang'>('nopes');

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <div style={{ marginBottom: '20px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>
          Perangkat Ujian
        </h1>
        <p style={{ color: '#64748b' }}>
          Generate Nomor Peserta (Nopes) dan Nomor Bangku (Nobang) untuk Ujian.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveTab('nopes')}
          style={{ 
            padding: '12px 20px', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'nopes' ? '3px solid #0ea5e9' : '3px solid transparent',
            color: activeTab === 'nopes' ? '#0ea5e9' : '#64748b',
            fontWeight: activeTab === 'nopes' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          <i className="fas fa-id-badge" style={{ marginRight: '8px' }}></i>
          Generate Nopes
        </button>
        <button 
          onClick={() => setActiveTab('nobang')}
          style={{ 
            padding: '12px 20px', 
            background: 'none', 
            border: 'none', 
            borderBottom: activeTab === 'nobang' ? '3px solid #0ea5e9' : '3px solid transparent',
            color: activeTab === 'nobang' ? '#0ea5e9' : '#64748b',
            fontWeight: activeTab === 'nobang' ? 'bold' : 'normal',
            cursor: 'pointer',
            fontSize: '15px'
          }}
        >
          <i className="fas fa-chair" style={{ marginRight: '8px' }}></i>
          Generate Nobang
        </button>
      </div>

      {/* Tab Content */}
      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
        {activeTab === 'nopes' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#334155' }}>
              Generate Nomor Peserta (Nopes)
            </h2>
            <p style={{ color: '#64748b' }}>Fitur untuk cetak Nopes akan ditambahkan di sini.</p>
          </div>
        )}
        
        {activeTab === 'nobang' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '16px', color: '#334155' }}>
              Generate Nomor Bangku (Nobang)
            </h2>
            <p style={{ color: '#64748b' }}>Fitur untuk cetak Nobang akan ditambahkan di sini.</p>
          </div>
        )}
      </div>
    </div>
  );
}
