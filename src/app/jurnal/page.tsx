'use client';

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from './jurnal.module.css';

export default function JurnalPage() {
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [selectedKelas, setSelectedKelas] = useState('');
  const [selectedMapel, setSelectedMapel] = useState('');
  const [selectedJam, setSelectedJam] = useState<number[]>([]);
  const [materi, setMateri] = useState('');
  
  const [kelasList, setKelasList] = useState<string[]>([]);
  const [mapelList, setMapelList] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/kelas').then(res => res.json()).then(data => {
      if (data.success) {
        const uniqueKelas = Array.from(new Set(data.data.map((k: any) => k.rombel)))
          .filter((k: any) => k && k.length >= 2 && k !== '-') as string[];
        uniqueKelas.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
        setKelasList(uniqueKelas);
      }
    }).catch(console.error);

    fetch('/api/jadwal/mapel').then(res => res.json()).then(data => {
      if (data.success && data.data) {
        setMapelList(data.data.map((m: any) => m.namaMapel));
      }
    }).catch(console.error);
  }, []);

  const toggleJam = (jam: number) => {
    setSelectedJam(prev => 
      prev.includes(jam) ? prev.filter(j => j !== jam) : [...prev, jam].sort((a,b) => a-b)
    );
  };

  const handleSubmit = async () => {
    if (!selectedKelas || !selectedMapel) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu!' });
      return;
    }
    if (selectedJam.length === 0) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon pilih Jam Ke!' });
      return;
    }
    if (!materi.trim()) {
      Swal.fire({ icon: 'warning', title: 'Oops...', text: 'Mohon isi Materi yang diajarkan!' });
      return;
    }

    const result = await Swal.fire({
      title: 'Konfirmasi',
      text: `Simpan jurnal mengajar untuk kelas ${selectedKelas}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Ya, Simpan!',
      cancelButtonText: 'Batal'
    });

    if (!result.isConfirmed) return;

    setIsSubmitting(true);
    const guru = localStorage.getItem('username') || 'Unknown';
    try {
      const res = await fetch('/api/jurnal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tanggal,
          jamKe: selectedJam.join(', '),
          kelas: selectedKelas,
          mapel: selectedMapel,
          guru,
          materi,
          tahunAjaran: new Date().getFullYear().toString() + '/' + (new Date().getFullYear() + 1).toString() // Simplified
        })
      });
      const data = await res.json();
      
      if (data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Jurnal mengajar berhasil disimpan.'
        });
        setMateri(''); // Reset materi after successful submission
        setSelectedJam([]); // Reset jam
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: 'Gagal menyimpan: ' + (data.error || 'Terjadi kesalahan')
        });
      }
    } catch (error: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Terjadi kesalahan sistem: ' + error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <h2><i className="fas fa-book-open"></i> Jurnal Mengajar</h2>
          <p>Isi jurnal kegiatan pembelajaran kelas.</p>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterGroup}>
            <label>Tanggal</label>
            <input 
              type="date" 
              className={styles.inputField}
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
            />
          </div>
          <div className={styles.filterGroup}>
            <label>Mata Pelajaran</label>
            <select 
              value={selectedMapel} 
              onChange={(e) => setSelectedMapel(e.target.value)}
              className={styles.inputField}
            >
              <option value="">-- Pilih Mapel --</option>
              {mapelList.map((m, i) => (
                <option key={i} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup}>
            <label>Kelas</label>
            <select 
              value={selectedKelas} 
              onChange={(e) => setSelectedKelas(e.target.value)}
              className={styles.inputField}
            >
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map(k => (
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
          </div>
          <div className={styles.filterGroup} style={{ flex: '1 1 100%' }}>
            <label>Jam Ke (Pilih satu atau lebih)</label>
            <div className={styles.jamPills}>
              {[1,2,3,4,5,6,7,8,9,10].map(jam => (
                <button
                  key={jam}
                  type="button"
                  onClick={() => toggleJam(jam)}
                  className={`${styles.jamPill} ${selectedJam.includes(jam) ? styles.jamPillActive : ''}`}
                >
                  {jam}
                </button>
              ))}
            </div>
          </div>
        </div>

        {selectedKelas && (
          <div style={{ marginTop: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold', color: '#334155' }}>
              Materi Pembelajaran
            </label>
            <textarea 
              className={styles.inputField}
              style={{ width: '100%', height: '120px', resize: 'vertical' }}
              placeholder="Tuliskan materi yang diajarkan pada sesi ini..."
              value={materi}
              onChange={(e) => setMateri(e.target.value)}
            />
          </div>
        )}

        <div className={styles.actions} style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end' }}>
          <button 
            className={styles.btnSave} 
            onClick={handleSubmit} 
            disabled={isSubmitting}
            style={{ opacity: isSubmitting ? 0.7 : 1, width: '100%' }}
          >
            {isSubmitting ? 'Menyimpan...' : <><i className="fas fa-save"></i> Simpan Jurnal</>}
          </button>
        </div>
      </div>
    </div>
  );
}
