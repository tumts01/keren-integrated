'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PendaftaranOlimpiadeSeni() {
  const router = useRouter();
  const [form, setForm] = useState({
    nama: '',
    asalSekolah: '',
    noHp: '',
    jenisLomba: 'Olimpiade Matematika',
    kategori: 'Olimpiade'
  });
  const [loading, setLoading] = useState(false);

  const lombaOptions = {
    'Olimpiade': ['Olimpiade Matematika', 'Olimpiade IPA', 'Olimpiade IPS', 'Olimpiade PAI'],
    'Seni': ['Kaligrafi', 'Banjari', 'Pidato Bahasa Arab', 'Pidato Bahasa Inggris', 'Singer']
  };

  const handleKategoriChange = (kat: 'Olimpiade' | 'Seni') => {
    setForm({
      ...form,
      kategori: kat,
      jenisLomba: lombaOptions[kat][0]
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // TODO: Submit to Supabase
    setTimeout(() => {
      alert('Pendaftaran Berhasil! (Simulasi)');
      setLoading(false);
      router.push('/olimpiade-seni');
    }, 1000);
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', padding: '40px 20px' }}>
      <div style={{ maxWidth: '700px', margin: '0 auto' }}>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <button 
            onClick={() => router.back()}
            style={{ width: '40px', height: '40px', borderRadius: '50%', border: 'none', background: 'white', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}
          >
            <i className="fas fa-arrow-left"></i>
          </button>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Pendaftaran Peserta</h1>
        </div>

        <div style={{ background: 'white', borderRadius: '20px', padding: '32px', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Nama Lengkap Peserta <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  required
                  value={form.nama}
                  onChange={e => setForm({...form, nama: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                  placeholder="Masukkan nama lengkap..."
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Asal Sekolah (SD/MI) <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  required
                  value={form.asalSekolah}
                  onChange={e => setForm({...form, asalSekolah: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                  placeholder="Contoh: MIN 1 Malang"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>No. HP / WhatsApp (Aktif) <span style={{ color: 'red' }}>*</span></label>
                <input 
                  type="text" 
                  required
                  value={form.noHp}
                  onChange={e => setForm({...form, noHp: e.target.value})}
                  style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none' }}
                  placeholder="0812xxxxxx"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Kategori Pendaftaran <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    value={form.kategori}
                    onChange={e => handleKategoriChange(e.target.value as 'Olimpiade' | 'Seni')}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                  >
                    <option value="Olimpiade">Olimpiade Akademik</option>
                    <option value="Seni">Lomba Seni</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>Pilihan Lomba <span style={{ color: 'red' }}>*</span></label>
                  <select 
                    value={form.jenisLomba}
                    onChange={e => setForm({...form, jenisLomba: e.target.value})}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '1rem', outline: 'none', background: 'white' }}
                  >
                    {lombaOptions[form.kategori as 'Olimpiade' | 'Seni'].map(opt => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </div>
              </div>

            </div>

            <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'flex-end', gap: '16px', borderTop: '1px solid #e2e8f0', paddingTop: '24px' }}>
              <button 
                type="button"
                onClick={() => router.back()}
                style={{ padding: '12px 24px', borderRadius: '10px', background: '#f1f5f9', color: '#475569', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Batal
              </button>
              <button 
                type="submit"
                disabled={loading}
                style={{ padding: '12px 32px', borderRadius: '10px', background: '#0284c7', color: 'white', border: 'none', fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-save"></i>}
                Simpan Pendaftaran
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
