'use client';
import { useState } from 'react';

export default function SusulanPage() {
  const [activeTab, setActiveTab] = useState<'rekap-data' | 'input' | 'rekap-susulan'>('rekap-data');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'white', padding: '24px', borderRadius: '10px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#1e293b', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="fas fa-file-alt" style={{ color: '#3b82f6' }}></i>
          Perangkat Ujian Susulan
        </h1>
        <p style={{ color: '#64748b' }}>Kelola data perangkat ujian susulan.</p>
      </div>

      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '20px' }}>
        <button
          onClick={() => setActiveTab('rekap-data')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'rekap-data' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'rekap-data' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'rekap-data' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-database" style={{ marginRight: '8px' }}></i>
          Rekap Data
        </button>
        <button
          onClick={() => setActiveTab('input')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'input' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'input' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'input' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-edit" style={{ marginRight: '8px' }}></i>
          Input
        </button>
        <button
          onClick={() => setActiveTab('rekap-susulan')}
          style={{ padding: '12px 20px', background: 'none', border: 'none', borderBottom: activeTab === 'rekap-susulan' ? '3px solid #0ea5e9' : '3px solid transparent', color: activeTab === 'rekap-susulan' ? '#0ea5e9' : '#64748b', fontWeight: activeTab === 'rekap-susulan' ? 'bold' : 'normal', cursor: 'pointer', fontSize: '15px' }}
        >
          <i className="fas fa-list-alt" style={{ marginRight: '8px' }}></i>
          Rekap Susulan
        </button>
      </div>

      <div style={{ background: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '400px' }}>
        {activeTab === 'rekap-data' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Rekap Data</h2>
            <p style={{ color: '#64748b' }}>Halaman ini sedang dalam tahap pengembangan.</p>
          </div>
        )}
        
        {activeTab === 'input' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Input Susulan</h2>
            <p style={{ color: '#64748b' }}>Halaman ini sedang dalam tahap pengembangan.</p>
          </div>
        )}
        
        {activeTab === 'rekap-susulan' && (
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: 'bold', color: '#334155', marginBottom: '20px' }}>Rekap Susulan</h2>
            <p style={{ color: '#64748b' }}>Halaman ini sedang dalam tahap pengembangan.</p>
          </div>
        )}
      </div>
    </div>
  );
}
