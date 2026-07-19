'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './Bon.module.css';

// ===== SATUAN OPTIONS =====
const SATUAN_OPTIONS = [
  'PCS','PACK','RIM','UNIT','BKS','SAK','EKOR','BOX','LUSIN','KG',
  'LITER','METER','SET','LEMBAR','BOTOL','KARDUS','ROLL','JAM','KEGIATAN','BUAH','KALI'
];

// ===== HELPERS =====
const formatRp = (n: any) => {
  if (!n && n !== 0) return 'Rp0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(n));
};

const tglIndo = (str: string) => {
  if (!str) return '-';
  try {
    const d = new Date(str);
    return d.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  } catch { return str; }
};

// ===== TAB: REKAP DATA =====
function TabRekap({ user }: { user: any }) {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const fetchData = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    const res = await fetch(`/api/bon?${params}`);
    const json = await res.json();
    setData(json.data || []);
    setStats(json.stats || {});
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [search, status, from, to]);

  return (
    <div>
      <div className={styles.statCards}>
        <div className={styles.statCard} style={{ borderColor: '#3b82f6' }}>
          <i className="fas fa-file-invoice" style={{ color: '#3b82f6' }}></i>
          <div><div className={styles.statNum}>{stats.total || 0}</div><div className={styles.statLbl}>Total BON</div></div>
        </div>
        <div className={styles.statCard} style={{ borderColor: '#10b981' }}>
          <i className="fas fa-check-circle" style={{ color: '#10b981' }}></i>
          <div><div className={styles.statNum}>{stats.selesai || 0}</div><div className={styles.statLbl}>Sudah Lapor</div></div>
        </div>
        <div className={styles.statCard} style={{ borderColor: '#f59e0b' }}>
          <i className="fas fa-clock" style={{ color: '#f59e0b' }}></i>
          <div><div className={styles.statNum}>{stats.belumLapor || 0}</div><div className={styles.statLbl}>Belum Lapor</div></div>
        </div>
        <div className={styles.statCard} style={{ borderColor: '#8b5cf6' }}>
          <i className="fas fa-wallet" style={{ color: '#8b5cf6' }}></i>
          <div><div className={styles.statNum} style={{ fontSize: '1rem' }}>{formatRp(stats.totalNominal)}</div><div className={styles.statLbl}>Total Nominal</div></div>
        </div>
      </div>

      <div className={styles.filterBar}>
        <input type="text" placeholder="Cari nama / keperluan / jabatan..." className={styles.filterInput} value={search} onChange={e => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="Draft">Draft / Belum Lapor</option>
          <option value="Selesai">Selesai</option>
        </select>
        <input type="date" className={styles.filterInput} value={from} onChange={e => setFrom(e.target.value)} title="Dari tanggal" />
        <input type="date" className={styles.filterInput} value={to} onChange={e => setTo(e.target.value)} title="Sampai tanggal" />
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No BON</th><th>Tanggal</th><th>Pemohon</th><th>Keperluan</th>
                <th>Diminta</th><th>Status</th><th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className={styles.emptyCell}><i className="fas fa-spinner fa-spin"></i> Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={7} className={styles.emptyCell}>Tidak ada data BON</td></tr>
              ) : data.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.8rem' }}>{item['NoBon'] || item['ID'] || '-'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{item['Tanggal'] || '-'}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item['Nama'] || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item['Jabatan'] || '-'}</div>
                  </td>
                  <td style={{ maxWidth: 180, fontSize: '0.82rem' }}>{item['Keperluan'] || '-'}</td>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatRp(item['JumlahDiminta'] || item['JumlahUang'])}</td>
                  <td>
                    <span className={`${styles.badge} ${(item['Status'] || '').toLowerCase() === 'selesai' ? styles.badgeOk : styles.badgePending}`}>
                      {item['Status'] || 'Draft'}
                    </span>
                  </td>
                  <td>
                    <button className={styles.btnSm} onClick={() => {
                      const id = encodeURIComponent(item['NoBon'] || item['ID']);
                      window.open(`/bon/cetak/${id}`, '_blank');
                    }} title="Cetak Pengajuan">
                      <i className="fas fa-print"></i>
                    </button>
                    {(item['Status'] || '').toLowerCase() === 'selesai' && (
                      <button className={`${styles.btnSm} ${styles.btnGreen}`} onClick={() => {
                        const id = encodeURIComponent(item['NoBon'] || item['ID']);
                        window.open(`/bon/cetak-realisasi/${id}`, '_blank');
                      }} title="Cetak Realisasi">
                        <i className="fas fa-file-alt"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== TAB: DATA TOKO =====
function TabDataToko() {
  const [toko, setToko] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchToko = async () => {
    setLoading(true);
    const res = await fetch('/api/bon/toko');
    const json = await res.json();
    setToko(json.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchToko(); }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus toko ini?')) return;
    await fetch('/api/bon/toko', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    fetchToko();
  };

  const jenisColor: Record<string, string> = { instansi: '#3b82f6', penyedia: '#10b981', individu: '#f59e0b' };

  return (
    <div className={styles.tableCard}>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>No</th><th>Nama Toko</th><th>Alamat</th><th>Jenis</th><th>Aksi</th></tr></thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className={styles.emptyCell}><i className="fas fa-spinner fa-spin"></i></td></tr>
            ) : toko.length === 0 ? (
              <tr><td colSpan={5} className={styles.emptyCell}>Belum ada data toko</td></tr>
            ) : toko.map((t, i) => (
              <tr key={i}>
                <td>{i + 1}</td>
                <td style={{ fontWeight: 600 }}>{t['NamaToko']}</td>
                <td style={{ fontSize: '0.83rem', color: '#64748b' }}>{t['Alamat'] || '-'}</td>
                <td>
                  <span className={styles.badge} style={{ background: jenisColor[(t['Jenis'] || '').toLowerCase()] + '20', color: jenisColor[(t['Jenis'] || '').toLowerCase()], border: 'none' }}>
                    {t['Jenis'] || '-'}
                  </span>
                </td>
                <td>
                  <button className={`${styles.btnSm} ${styles.btnRed}`} onClick={() => handleDelete(t['ID'])}>
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== TAB: TAMBAH TOKO =====
function TabTambahToko() {
  const [namaToko, setNamaToko] = useState('');
  const [alamat, setAlamat] = useState('');
  const [jenis, setJenis] = useState('Penyedia');
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSukses('');
    const res = await fetch('/api/bon/toko', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namaToko, alamat, jenis })
    });
    const json = await res.json();
    if (json.success) {
      setSukses(`Toko "${namaToko}" berhasil ditambahkan!`);
      setNamaToko(''); setAlamat(''); setJenis('Penyedia');
    }
    setLoading(false);
  };

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}><i className="fas fa-store"></i> Tambah Data Toko / Rekanan</h3>
      {sukses && <div className={styles.alertOk}><i className="fas fa-check-circle"></i> {sukses}</div>}
      <form onSubmit={handleSubmit}>
        <div className={styles.formGroup}>
          <label>Nama Toko / Rekanan <span style={{ color: 'red' }}>*</span></label>
          <input className={styles.input} value={namaToko} onChange={e => setNamaToko(e.target.value)} placeholder="Contoh: Toko Berkah Jaya" required />
        </div>
        <div className={styles.formGroup}>
          <label>Alamat</label>
          <input className={styles.input} value={alamat} onChange={e => setAlamat(e.target.value)} placeholder="Contoh: Jl. Masjid No. 33 Singosari" />
        </div>
        <div className={styles.formGroup}>
          <label>Jenis</label>
          <select className={styles.input} value={jenis} onChange={e => setJenis(e.target.value)}>
            <option value="Penyedia">Penyedia</option>
            <option value="Instansi">Instansi</option>
            <option value="Individu">Individu</option>
          </select>
        </div>
        <button type="submit" className={styles.btnPrimary} disabled={loading}>
          {loading ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-plus"></i> Tambah Toko</>}
        </button>
      </form>
    </div>
  );
}

// ===== TAB: LAPORAN REALISASI =====
function TabRealisasi() {
  const [bonList, setBonList] = useState<any[]>([]);
  const [selectedBon, setSelectedBon] = useState<any>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [rincian, setRincian] = useState([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const [keterangan, setKeterangan] = useState('');
  const [buktiNota, setBuktiNota] = useState<File | null>(null);
  const [buktiFoto, setBuktiFoto] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [savedNoBon, setSavedNoBon] = useState('');
  const notaRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/bon?status=Draft').then(r => r.json()).then(j => setBonList(j.data || []));
  }, []);

  const totalRealisasi = rincian.reduce((s, i) => s + (i.qty * i.harga), 0);
  const sisa = selectedBon ? parseFloat(selectedBon['JumlahDiminta'] || selectedBon['JumlahUang'] || '0') - totalRealisasi : 0;

  const addRow = () => setRincian([...rincian, { barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const removeRow = (i: number) => setRincian(rincian.filter((_, idx) => idx !== i));
  const updateRow = (i: number, f: string, v: any) => {
    const r = [...rincian]; (r[i] as any)[f] = v; setRincian(r);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBon) return alert('Pilih nota BON terlebih dahulu!');
    setLoading(true);
    const fd = new FormData();
    fd.append('bonId', selectedBon['NoBon'] || selectedBon['ID']);
    fd.append('noBon', selectedBon['NoBon'] || selectedBon['ID']);
    fd.append('tanggalBelanja', tanggal);
    fd.append('rincianJSON', JSON.stringify(rincian));
    fd.append('jumlahDiminta', selectedBon['JumlahDiminta'] || selectedBon['JumlahUang'] || '0');
    fd.append('jumlahRealisasi', String(totalRealisasi));
    fd.append('keterangan', keterangan);
    if (buktiNota) fd.append('buktiNota', buktiNota);
    if (buktiFoto) fd.append('buktiFoto', buktiFoto);

    const res = await fetch('/api/bon/realisasi', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) {
      setSavedNoBon(selectedBon['NoBon'] || selectedBon['ID']);
      setSukses(true);
    } else alert('Gagal: ' + json.error);
    setLoading(false);
  };

  if (sukses) return (
    <div className={styles.formCard} style={{ textAlign: 'center', padding: '48px 24px' }}>
      <i className="fas fa-check-circle" style={{ fontSize: '4rem', color: '#10b981', marginBottom: '16px' }}></i>
      <h3 style={{ color: '#065f46', marginBottom: '8px' }}>Realisasi Berhasil Disimpan!</h3>
      <p style={{ color: '#64748b', marginBottom: '24px' }}>Laporan realisasi untuk {savedNoBon} telah dicatat.</p>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className={styles.btnPrimary} onClick={() => window.open(`/bon/cetak-realisasi/${encodeURIComponent(savedNoBon)}`, '_blank')}>
          <i className="fas fa-print"></i> Cetak Laporan Realisasi
        </button>
        <button className={styles.btnSecondary} onClick={() => { setSukses(false); setSavedNoBon(''); setSelectedBon(null); setRincian([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]); }}>
          <i className="fas fa-plus"></i> Input Realisasi Lain
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}><i className="fas fa-receipt"></i> Input Laporan Realisasi Belanja</h3>
      <form onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Pilih Nota BON <span style={{ color: 'red' }}>*</span></label>
            <select className={styles.input} value={selectedBon?.['NoBon'] || ''} onChange={e => {
              const bon = bonList.find(b => (b['NoBon'] || b['ID']) === e.target.value);
              setSelectedBon(bon || null);
              if (bon) {
                try { const r = JSON.parse(bon['RincianJSON'] || '[]'); if (r.length > 0) setRincian(r); } catch {}
              }
            }} required>
              <option value="">— Pilih Nota BON —</option>
              {bonList.map((b, i) => <option key={i} value={b['NoBon'] || b['ID']}>{b['NoBon'] || b['ID']} — {b['Keperluan']}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Tanggal Realisasi</label>
            <input type="date" className={styles.input} value={tanggal} onChange={e => setTanggal(e.target.value)} required />
          </div>
        </div>

        {selectedBon && (
          <div className={styles.infoBon}>
            <div><strong>Pemohon:</strong> {selectedBon['Nama']} — {selectedBon['Jabatan']}</div>
            <div><strong>Keperluan:</strong> {selectedBon['Keperluan']}</div>
            <div><strong>Jumlah Diminta:</strong> <span style={{ color: '#3b82f6', fontWeight: 700 }}>{formatRp(selectedBon['JumlahDiminta'] || selectedBon['JumlahUang'])}</span></div>
          </div>
        )}

        <div className={styles.rincianSection}>
          <div className={styles.rincianHeader}>
            <span>Rincian Realisasi Belanja</span>
            <button type="button" className={styles.btnSm} onClick={addRow}><i className="fas fa-plus"></i> Tambah</button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Nama Barang/Kegiatan</th><th>Qty</th><th>Satuan</th><th>Harga Satuan</th><th>Jumlah</th><th></th></tr></thead>
              <tbody>
                {rincian.map((item, idx) => (
                  <tr key={idx}>
                    <td><input className={styles.rincianInput} value={item.barang} onChange={e => updateRow(idx, 'barang', e.target.value)} placeholder="Nama barang..." required /></td>
                    <td><input type="number" className={styles.rincianInput} style={{ width: 60 }} value={item.qty} min={1} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value) || 1)} /></td>
                    <td>
                      <select className={styles.rincianInput} style={{ width: 90 }} value={item.satuan} onChange={e => updateRow(idx, 'satuan', e.target.value)}>
                        {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><input type="number" className={styles.rincianInput} style={{ width: 120 }} value={item.harga} min={0} onChange={e => updateRow(idx, 'harga', parseInt(e.target.value) || 0)} placeholder="0" /></td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatRp(item.qty * item.harga)}</td>
                    <td>{rincian.length > 1 && <button type="button" className={`${styles.btnSm} ${styles.btnRed}`} onClick={() => removeRow(idx)}><i className="fas fa-times"></i></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.totalRow}>
            <span>Total Realisasi: <strong style={{ color: '#1d4ed8' }}>{formatRp(totalRealisasi)}</strong></span>
            {selectedBon && (
              <span style={{ marginLeft: 24 }}>
                Sisa/Lebih: <strong style={{ color: sisa >= 0 ? '#059669' : '#dc2626' }}>{formatRp(Math.abs(sisa))} {sisa >= 0 ? '(Sisa)' : '(Kurang)'}</strong>
              </span>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Upload Bukti Nota</label>
            <div className={styles.fileBtn} onClick={() => notaRef.current?.click()}>
              <input ref={notaRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setBuktiNota(e.target.files?.[0] || null)} />
              <i className="fas fa-paperclip"></i> {buktiNota ? buktiNota.name : 'Pilih file (PDF/JPG/Word)'}
            </div>
          </div>
          <div className={styles.formGroup}>
            <label>Upload Bukti Barang</label>
            <div className={styles.fileBtn} onClick={() => fotoRef.current?.click()}>
              <input ref={fotoRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setBuktiFoto(e.target.files?.[0] || null)} />
              <i className="fas fa-camera"></i> {buktiFoto ? buktiFoto.name : 'Foto barang / PDF'}
            </div>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Keterangan Tambahan (opsional)</label>
          <textarea className={styles.input} rows={2} value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Catatan tambahan..." />
        </div>

        <button type="submit" className={styles.btnPrimary} disabled={loading} style={{ width: '100%' }}>
          {loading ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan & Cetak Laporan Realisasi</>}
        </button>
      </form>
    </div>
  );
}

// ===== TAB: AJUKAN BON =====
function TabAjukan({ user }: { user: any }) {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [keperluan, setKeperluan] = useState('');
  const [jumlahDiminta, setJumlahDiminta] = useState('');
  const [rincian, setRincian] = useState([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const [keterangan, setKeterangan] = useState('');
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [savedNoBon, setSavedNoBon] = useState('');

  useEffect(() => {
    const u = localStorage.getItem('keren_user_data');
    if (u) {
      const parsed = JSON.parse(u);
      setNama(parsed.nama || '');
      setJabatan(parsed.jabatan || parsed.rule || '');
    }
    fetch('/api/guru').then(r => r.json()).then(j => setAvailableUsers(j.data || []));
  }, []);

  const totalRincian = rincian.reduce((s, i) => s + (i.qty * i.harga), 0);
  const addRow = () => setRincian([...rincian, { barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const removeRow = (i: number) => setRincian(rincian.filter((_, idx) => idx !== i));
  const updateRow = (i: number, f: string, v: any) => {
    const r = [...rincian]; (r[i] as any)[f] = v; setRincian(r);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const jumlah = jumlahDiminta || String(totalRincian);
    const res = await fetch('/api/bon/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, jabatan, tanggal, keperluan, jumlahDiminta: jumlah, rincian, keterangan, tahunAjaran: '2026/2027' })
    });
    const json = await res.json();
    if (json.success) {
      setSavedNoBon(json.noBon);
      setSukses(true);
    } else alert('Gagal: ' + json.error);
    setLoading(false);
  };

  if (sukses) return (
    <div className={styles.formCard} style={{ textAlign: 'center', padding: '48px 24px' }}>
      <i className="fas fa-check-circle" style={{ fontSize: '4rem', color: '#10b981', marginBottom: '16px' }}></i>
      <h3 style={{ color: '#065f46', marginBottom: '8px' }}>BON Berhasil Diajukan!</h3>
      <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 12, padding: '16px 24px', marginBottom: 24, display: 'inline-block' }}>
        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Nomor BON</div>
        <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#15803d' }}>{savedNoBon}</div>
      </div>
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
        <button className={styles.btnPrimary} onClick={() => window.open(`/bon/cetak/${encodeURIComponent(savedNoBon)}`, '_blank')}>
          <i className="fas fa-print"></i> Cetak Tanda Bukti BON
        </button>
        <button className={styles.btnSecondary} onClick={() => { setSukses(false); setSavedNoBon(''); setKeperluan(''); setJumlahDiminta(''); setKeterangan(''); setRincian([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]); }}>
          <i className="fas fa-plus"></i> Ajukan BON Baru
        </button>
      </div>
    </div>
  );

  return (
    <div className={styles.formCard}>
      <h3 className={styles.formTitle}><i className="fas fa-file-invoice-dollar"></i> Form Pengajuan Nota BON</h3>
      <form onSubmit={handleSubmit}>
        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Nama Pemohon <span style={{ color: 'red' }}>*</span></label>
            <select className={styles.input} value={nama} onChange={e => {
              setNama(e.target.value);
              const u = availableUsers.find(u => u['Nama'] === e.target.value || u['nama'] === e.target.value);
              if (u) setJabatan(u['Jabatan'] || u['jabatan'] || '');
            }} required>
              <option value="">Pilih Nama</option>
              {availableUsers.map((u, i) => <option key={i} value={u['Nama'] || u['nama']}>{u['Nama'] || u['nama']}</option>)}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Jabatan</label>
            <input className={styles.input} value={jabatan} onChange={e => setJabatan(e.target.value)} placeholder="Jabatan pemohon" />
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Tanggal Pengajuan <span style={{ color: 'red' }}>*</span></label>
            <input type="date" className={styles.input} value={tanggal} onChange={e => setTanggal(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label>Jumlah Uang Diminta (Rp) <span style={{ color: 'red' }}>*</span></label>
            <input type="number" className={styles.input} value={jumlahDiminta} onChange={e => setJumlahDiminta(e.target.value)} placeholder="Contoh: 5000000" min={0} required />
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Keperluan / Tujuan Belanja <span style={{ color: 'red' }}>*</span></label>
          <input className={styles.input} value={keperluan} onChange={e => setKeperluan(e.target.value)} placeholder="Contoh: Belanja ATK untuk rapat" required />
        </div>

        <div className={styles.rincianSection}>
          <div className={styles.rincianHeader}>
            <span>Rincian Keperluan/Barang</span>
            <button type="button" className={styles.btnSm} onClick={addRow}><i className="fas fa-plus"></i> Tambah</button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Nama Barang/Kegiatan</th><th>Qty</th><th>Satuan</th><th>Harga Satuan</th><th>Jumlah</th><th></th></tr></thead>
              <tbody>
                {rincian.map((item, idx) => (
                  <tr key={idx}>
                    <td><input className={styles.rincianInput} value={item.barang} onChange={e => updateRow(idx, 'barang', e.target.value)} placeholder="Nama barang..." required /></td>
                    <td><input type="number" className={styles.rincianInput} style={{ width: 60 }} value={item.qty} min={1} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value) || 1)} /></td>
                    <td>
                      <select className={styles.rincianInput} style={{ width: 90 }} value={item.satuan} onChange={e => updateRow(idx, 'satuan', e.target.value)}>
                        {SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td><input type="number" className={styles.rincianInput} style={{ width: 120 }} value={item.harga} min={0} onChange={e => updateRow(idx, 'harga', parseInt(e.target.value) || 0)} /></td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatRp(item.qty * item.harga)}</td>
                    <td>{rincian.length > 1 && <button type="button" className={`${styles.btnSm} ${styles.btnRed}`} onClick={() => removeRow(idx)}><i className="fas fa-times"></i></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className={styles.totalRow}>
            Total Rencana: <strong style={{ color: '#1d4ed8', marginLeft: 8 }}>{formatRp(totalRincian)}</strong>
          </div>
        </div>

        <div className={styles.formGroup}>
          <label>Keterangan Tambahan (opsional)</label>
          <textarea className={styles.input} rows={2} value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Catatan tambahan..." />
        </div>

        <button type="submit" className={styles.btnPrimary} disabled={loading} style={{ width: '100%' }}>
          {loading ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-paper-plane"></i> Ajukan & Cetak BON</>}
        </button>
      </form>
    </div>
  );
}

// ===== MAIN PAGE =====
const TABS = [
  { id: 'ajukan', label: 'Ajukan BON', icon: 'fa-file-invoice-dollar' },
  { id: 'realisasi', label: 'Lap. Realisasi', icon: 'fa-receipt' },
  { id: 'rekap', label: 'Rekap Data', icon: 'fa-chart-bar' },
  { id: 'tambah-toko', label: 'Tambah Toko', icon: 'fa-store' },
  { id: 'data-toko', label: 'Data Toko', icon: 'fa-list' },
];

export default function BonPage() {
  const [activeTab, setActiveTab] = useState('rekap');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const u = localStorage.getItem('keren_user_data');
    if (u) setUser(JSON.parse(u));
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}><i className="fas fa-file-invoice-dollar"></i> Nota BON</h1>
          <p className={styles.pageSubtitle}>Sistem Manajemen Pengajuan & Realisasi Belanja Madrasah</p>
        </div>
      </div>

      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <i className={`fas ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'ajukan' && <TabAjukan user={user} />}
        {activeTab === 'realisasi' && <TabRealisasi />}
        {activeTab === 'rekap' && <TabRekap user={user} />}
        {activeTab === 'tambah-toko' && <TabTambahToko />}
        {activeTab === 'data-toko' && <TabDataToko />}
      </div>
    </div>
  );
}
