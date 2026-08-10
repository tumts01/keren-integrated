'use client';
import { useState, useEffect, useRef } from 'react';
import styles from './Bon.module.css';

// ===== SATUAN OPTIONS =====
const SATUAN_OPTIONS = [
  'PCS','PACK','RIM','UNIT','BKS','SAK','EKOR','BOX','LUSIN','KG',
  'LITER','METER','SET','LEMBAR','BOTOL','KARDUS','ROLL','JAM','KEGIATAN','BUAH','KALI','ORANG','BULAN'
];

// ===== HELPERS =====
const formatRp = (n: any) => {
  if (!n && n !== 0) return 'Rp0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(n));
};

// ===== PENERIMA / TOKO FIELD =====
function PenerimaField({ penerima, onChange, tokoList }: {
  penerima: { nama: string; keterangan: string }[];
  onChange: (p: { nama: string; keterangan: string }[]) => void;
  tokoList: any[];
}) {
  const add = () => onChange([...penerima, { nama: '', keterangan: '' }]);
  const remove = (i: number) => onChange(penerima.filter((_, idx) => idx !== i));
  const update = (i: number, field: string, val: string) => {
    const arr = [...penerima]; (arr[i] as any)[field] = val; onChange(arr);
  };

  return (
    <div className={styles.rincianSection} style={{ marginBottom: 20 }}>
      <div className={styles.rincianHeader}>
        <span><i className="fas fa-handshake" style={{ color: '#f59e0b', marginRight: 6 }}></i>Penerima / Toko</span>
        <button type="button" className={styles.btnSm} onClick={add}>
          <i className="fas fa-plus"></i> Tambah Penerima/Toko
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {penerima.map((item, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              list={`tokoList-${idx}`}
              className={styles.rincianInput}
              value={item.nama}
              onChange={e => update(idx, 'nama', e.target.value)}
              placeholder="Nama toko / rekanan..."
            />
            <datalist id={`tokoList-${idx}`}>
              {tokoList.map((t, ti) => <option key={ti} value={t['NamaToko'] || t['namaToko']} />)}
            </datalist>
            <input
              className={styles.rincianInput}
              style={{ maxWidth: 200 }}
              value={item.keterangan}
              onChange={e => update(idx, 'keterangan', e.target.value)}
              placeholder="Catatan (opsional)"
            />
            {penerima.length > 1 && (
              <button type="button" className={`${styles.btnSm} ${styles.btnRed}`} onClick={() => remove(idx)}>
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintModal({ url, onClose }: { url: string; onClose: () => void }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);

  const handlePrint = () => {
    iframeRef.current?.contentWindow?.print();
  };

  return (
    <div className={styles.printOverlay}>
      <div className={styles.printBar}>
        <div className={styles.printBarLeft}>
          <i className="fas fa-file-pdf" style={{ color: '#ef4444' }}></i>
          <span>Preview Dokumen</span>
        </div>
        <div className={styles.printBarRight}>
          {ready && (
            <button className={styles.printBarBtn} onClick={handlePrint}>
              <i className="fas fa-print"></i> Cetak / Unduh PDF
            </button>
          )}
          <button className={styles.printBarClose} onClick={onClose}>
            <i className="fas fa-times"></i> Tutup
          </button>
        </div>
      </div>
      {!ready && (
        <div className={styles.printLoading}>
          <i className="fas fa-spinner fa-spin"></i>
          <span>Memuat dokumen...</span>
        </div>
      )}
      <iframe
        ref={iframeRef}
        src={url}
        className={styles.printIframe}
        style={{ opacity: ready ? 1 : 0 }}
        onLoad={() => setReady(true)}
      />
    </div>
  );
}

// ===== EDIT BON MODAL =====
function EditBonModal({ bon, tokoList, onClose, onSaved }: {
  bon: any;
  tokoList: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const parseJSON = (s: string, fallback: any) => { try { return JSON.parse(s); } catch { return fallback; } };

  const [nama, setNama] = useState(bon['Nama'] || '');
  const [jabatan, setJabatan] = useState(bon['Jabatan'] || '');
  const [tanggal, setTanggal] = useState(bon['Tanggal'] || '');
  const [keperluan, setKeperluan] = useState(bon['Keperluan'] || '');
  const [jumlahDiminta, setJumlahDiminta] = useState(bon['JumlahDiminta'] || '');
  const [keterangan, setKeterangan] = useState(bon['Keterangan'] || '');
  const [rincian, setRincian] = useState<any[]>(
    parseJSON(bon['RincianJSON'], [{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }])
  );
  const [penerima, setPenerima] = useState<{ nama: string; keterangan: string }[]>(
    parseJSON(bon['PenerimaJSON'], [{ nama: '', keterangan: '' }])
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const updateRow = (idx: number, field: string, val: any) => {
    const arr = [...rincian]; (arr[idx] as any)[field] = val; setRincian(arr);
  };
  const addRow = () => setRincian([...rincian, { barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const removeRow = (idx: number) => setRincian(rincian.filter((_, i) => i !== idx));

  const totalRincian = rincian.reduce((s, i) => s + (i.qty * i.harga), 0);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const jumlah = jumlahDiminta.replace(/[^0-9]/g, '') || String(totalRincian);
      const res = await fetch('/api/bon/update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noBon: bon['NoBon'] || bon['ID'],
          nama, jabatan, tanggal, keperluan,
          jumlahDiminta: jumlah,
          rincian,
          penerima: penerima.filter(p => p.nama),
          keterangan
        })
      });
      const json = await res.json();
      if (json.success) { onSaved(); onClose(); }
      else setError(json.error || 'Gagal menyimpan');
    } catch { setError('Terjadi kesalahan jaringan'); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.printOverlay} style={{ zIndex: 1100 }}>
      <div style={{
        background: '#fff', borderRadius: 16, maxWidth: 760, width: '95vw',
        maxHeight: '90vh', overflowY: 'auto', margin: 'auto', marginTop: 32,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: 0
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #f59e0b, #d97706)', borderRadius: '16px 16px 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-edit" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Edit Pengajuan BON</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem' }}>{bon['NoBon'] || bon['ID']}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ padding: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className={styles.formGroup}>
              <label>Nama Pemohon</label>
              <input className={styles.input} value={nama} onChange={e => setNama(e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label>Jabatan</label>
              <input className={styles.input} value={jabatan} onChange={e => setJabatan(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label>Tanggal</label>
              <input type="date" className={styles.input} value={tanggal} onChange={e => setTanggal(e.target.value)} required />
            </div>
            <div className={styles.formGroup}>
              <label>Jumlah Uang Diminta (Rp)</label>
              <input
                type="text" inputMode="numeric" className={styles.input}
                value={jumlahDiminta === '' ? '' : Number(String(jumlahDiminta).replace(/[^0-9]/g,'')||0).toLocaleString('id-ID')}
                onChange={e => setJumlahDiminta(e.target.value.replace(/[^0-9]/g,''))}
                placeholder="Contoh: 5.000.000"
              />
            </div>
          </div>
          <div className={styles.formGroup} style={{ marginBottom: 16 }}>
            <label>Keperluan / Rincian</label>
            <textarea className={styles.input} style={{ minHeight: 60 }} value={keperluan} onChange={e => setKeperluan(e.target.value)} required />
          </div>

          {/* Penerima */}
          <div className={styles.rincianSection} style={{ marginBottom: 16 }}>
            <div className={styles.rincianHeader}>
              <span><i className="fas fa-handshake" style={{ color: '#f59e0b', marginRight: 6 }}></i>Penerima / Toko</span>
              <button type="button" className={styles.btnSm} onClick={() => setPenerima([...penerima, { nama: '', keterangan: '' }])}>
                <i className="fas fa-plus"></i> Tambah
              </button>
            </div>
            {penerima.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                <input list={`editToko-${idx}`} className={styles.rincianInput} value={item.nama}
                  onChange={e => { const a = [...penerima]; a[idx].nama = e.target.value; setPenerima(a); }}
                  placeholder="Nama toko / rekanan..." />
                <datalist id={`editToko-${idx}`}>{tokoList.map((t, ti) => <option key={ti} value={t['NamaToko'] || t['namaToko']} />)}</datalist>
                <input className={styles.rincianInput} style={{ maxWidth: 180 }} value={item.keterangan}
                  onChange={e => { const a = [...penerima]; a[idx].keterangan = e.target.value; setPenerima(a); }}
                  placeholder="Catatan (opsional)" />
                {penerima.length > 1 && (
                  <button type="button" className={`${styles.btnSm} ${styles.btnRed}`}
                    onClick={() => setPenerima(penerima.filter((_, i) => i !== idx))}>
                    <i className="fas fa-times"></i>
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Rincian Barang */}
          <div className={styles.rincianSection} style={{ marginBottom: 16 }}>
            <div className={styles.rincianHeader}>
              <span><i className="fas fa-list" style={{ color: '#3b82f6', marginRight: 6 }}></i>Rincian Keperluan/Barang</span>
              <button type="button" className={styles.btnSm} onClick={addRow}><i className="fas fa-plus"></i> Tambah Baris</button>
            </div>
            <table className={styles.table}>
              <thead><tr>
                <th style={{ width: '35%' }}>Nama Barang/Kegiatan</th>
                <th style={{ width: 44 }}>Qty</th>
                <th style={{ width: 82 }}>Satuan</th>
                <th style={{ width: 120 }}>Harga Satuan</th>
                <th style={{ width: 110 }}>Jumlah</th>
                <th style={{ width: 36 }}></th>
              </tr></thead>
              <tbody>
                {rincian.map((item, idx) => (
                  <tr key={idx}>
                    <td><input className={styles.rincianInput} value={item.barang} onChange={e => updateRow(idx, 'barang', e.target.value)} placeholder="Nama barang..." /></td>
                    <td><input type="text" inputMode="numeric" className={styles.rincianInput} style={{ width: '100%', textAlign: 'center' }} value={item.qty === 0 ? '' : item.qty} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)} placeholder="1" /></td>
                    <td><select className={styles.rincianInput} value={item.satuan} onChange={e => updateRow(idx, 'satuan', e.target.value)}>{SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                    <td><input type="text" inputMode="numeric" className={styles.rincianInput} value={item.harga === 0 ? '' : item.harga.toLocaleString('id-ID')} onChange={e => updateRow(idx, 'harga', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)} placeholder="0" /></td>
                    <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatRp(item.qty * item.harga)}</td>
                    <td>{rincian.length > 1 && <button type="button" className={`${styles.btnSm} ${styles.btnRed}`} onClick={() => removeRow(idx)}><i className="fas fa-times"></i></button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ textAlign: 'right', marginTop: 8, fontWeight: 700, color: '#1e293b' }}>
              Total Rincian: {formatRp(totalRincian)}
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginBottom: 20 }}>
            <label>Keterangan Tambahan (opsional)</label>
            <textarea className={styles.input} style={{ minHeight: 52 }} value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Catatan, alasan revisi, dll..." />
          </div>

          {error && <div style={{ color: '#ef4444', marginBottom: 12, fontSize: '0.88rem' }}><i className="fas fa-exclamation-circle mr-1"></i>{error}</div>}

          <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button type="button" className={styles.btnSecondary} onClick={onClose} disabled={saving}>Batal</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan Perubahan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ===== EDIT REALISASI MODAL =====
function EditRealisasiModal({ data, tokoList, onClose, onSaved }: {
  data: { bon: any; realisasi: any };
  tokoList: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const parseJSON = (s: string, fallback: any) => { try { return JSON.parse(s); } catch { return fallback; } };

  const [tanggal, setTanggal] = useState(data.realisasi['TanggalBelanja'] || new Date().toISOString().split('T')[0]);
  const [rincian, setRincian] = useState<any[]>(
    parseJSON(data.realisasi['RincianJSON'], [{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }])
  );
  const [penerima, setPenerima] = useState<{ nama: string; keterangan: string }[]>(
    parseJSON(data.realisasi['PenerimaJSON'], [{ nama: '', keterangan: '' }])
  );
  const [keterangan, setKeterangan] = useState(data.realisasi['Keterangan'] || '');
  const [buktiNota, setBuktiNota] = useState<File[]>([]);
  const [buktiFoto, setBuktiFoto] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const notaRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } }
          else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
            } else { reject(new Error('Canvas to Blob failed')); }
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File[]>>) => {
    const files = Array.from(e.target.files || []);
    const processedFiles: File[] = [];
    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try { processedFiles.push(await compressImage(file)); }
        catch (err) { processedFiles.push(file); }
      } else { processedFiles.push(file); }
    }
    setter(processedFiles);
  };

  const updateRow = (idx: number, field: string, val: any) => {
    const arr = [...rincian]; (arr[idx] as any)[field] = val; setRincian(arr);
  };
  const addRow = () => setRincian([...rincian, { barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const removeRow = (idx: number) => setRincian(rincian.filter((_, i) => i !== idx));

  const totalRealisasi = rincian.reduce((s, i) => s + (i.qty * i.harga), 0);
  const sisa = parseFloat(data.bon['JumlahDiminta'] || data.bon['JumlahUang'] || '0') - totalRealisasi;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('id', data.realisasi['ID']);
      fd.append('tanggalBelanja', tanggal);
      fd.append('rincianJSON', JSON.stringify(rincian));
      fd.append('jumlahDiminta', data.bon['JumlahDiminta'] || data.bon['JumlahUang'] || '0');
      fd.append('jumlahRealisasi', String(totalRealisasi));
      fd.append('keterangan', keterangan);
      fd.append('penerimaJSON', JSON.stringify(penerima.filter(p => p.nama)));
      buktiNota.forEach(f => fd.append('buktiNota', f));
      buktiFoto.forEach(f => fd.append('buktiFoto', f));

      const res = await fetch('/api/bon/realisasi', { method: 'PATCH', body: fd });
      const json = await res.json();
      if (json.success) { onSaved(); onClose(); }
      else setError(json.error || 'Gagal menyimpan realisasi');
    } catch { setError('Terjadi kesalahan jaringan'); }
    finally { setSaving(false); }
  };

  return (
    <div className={styles.printOverlay} style={{ zIndex: 1100 }}>
      <div style={{
        background: '#fff', borderRadius: 16, maxWidth: 860, width: '95vw',
        maxHeight: '90vh', overflowY: 'auto', margin: 'auto', marginTop: 32,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', padding: 0
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '18px 24px', borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #10b981, #059669)', borderRadius: '16px 16px 0 0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <i className="fas fa-edit" style={{ color: '#fff', fontSize: '1.1rem' }}></i>
            <div>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1rem' }}>Edit Realisasi Belanja</div>
              <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.78rem' }}>{data.bon['NoBon'] || data.bon['ID']}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: 8, color: '#fff', padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} style={{ padding: 24 }}>
          {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: 12, borderRadius: 8, marginBottom: 16 }}>{error}</div>}
          
          <div className={styles.formGroup} style={{ marginBottom: 16 }}>
            <label>Tanggal Realisasi</label>
            <input type="date" className={styles.input} value={tanggal} onChange={e => setTanggal(e.target.value)} required />
          </div>

          <div className={styles.infoBon} style={{ marginBottom: 16 }}>
            <span><strong>Pemohon:</strong> {data.bon['Nama']} — {data.bon['Jabatan']}</span>
            <span><strong>Keperluan:</strong> {data.bon['Keperluan']}</span>
            <span><strong>Diminta:</strong> <b style={{ color: '#3b82f6' }}>{formatRp(data.bon['JumlahDiminta'] || data.bon['JumlahUang'])}</b></span>
          </div>

          <PenerimaField penerima={penerima} onChange={setPenerima} tokoList={tokoList} />

          <div className={styles.rincianSection}>
            <div className={styles.rincianHeader}>
              <span>Rincian Realisasi Belanja</span>
              <button type="button" className={styles.btnSm} onClick={addRow}><i className="fas fa-plus"></i> Tambah</button>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th style={{ width: '35%' }}>Nama Barang/Kegiatan</th><th style={{ width: 44 }}>Qty</th><th style={{ width: 82 }}>Satuan</th><th style={{ width: 120 }}>Harga Satuan</th><th style={{ width: 110 }}>Jumlah</th><th style={{ width: 36 }}></th></tr></thead>
                <tbody>
                  {rincian.map((item, idx) => (
                    <tr key={idx}>
                      <td><input className={styles.rincianInput} value={item.barang} onChange={e => updateRow(idx, 'barang', e.target.value)} required /></td>
                      <td><input type="text" inputMode="numeric" className={styles.rincianInput} style={{ width: '100%', textAlign: 'center' }} value={item.qty === 0 ? '' : item.qty} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)} /></td>
                      <td><select className={styles.rincianInput} value={item.satuan} onChange={e => updateRow(idx, 'satuan', e.target.value)}>{SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                      <td><input type="text" inputMode="numeric" className={styles.rincianInput} value={item.harga === 0 ? '' : item.harga.toLocaleString('id-ID')} onChange={e => updateRow(idx, 'harga', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)} /></td>
                      <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatRp(item.qty * item.harga)}</td>
                      <td>{rincian.length > 1 && <button type="button" className={`${styles.btnSm} ${styles.btnRed}`} onClick={() => removeRow(idx)}><i className="fas fa-times"></i></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={styles.totalRow}>
              <span>Total Realisasi: <strong style={{ color: '#1d4ed8' }}>{formatRp(totalRealisasi)}</strong></span>
              <span>Sisa/Lebih: <strong style={{ color: sisa >= 0 ? '#059669' : '#dc2626' }}>{formatRp(Math.abs(sisa))} {sisa >= 0 ? '(Sisa)' : '(Kurang)'}</strong></span>
            </div>
          </div>

          <div className={styles.formRow} style={{ marginTop: 16 }}>
            <div className={styles.formGroup}>
              <label>Upload Ulang Bukti Nota <span className={styles.fileBadge}>Bisa beberapa file</span></label>
              <div className={styles.fileBtn} onClick={() => notaRef.current?.click()}>
                <input ref={notaRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple onChange={e => handleFileChange(e, setBuktiNota)} />
                <i className="fas fa-paperclip"></i>
                <span>{buktiNota.length > 0 ? `${buktiNota.length} file dipilih` : 'Pilih file baru (Biarkan kosong jika tetap)'}</span>
              </div>
              {buktiNota.length > 0 && <div className={styles.fileList}>{buktiNota.map((f, i) => <span key={i}><i className="fas fa-file"></i> {f.name}</span>)}</div>}
            </div>
            <div className={styles.formGroup}>
              <label>Upload Ulang Bukti Barang <span className={styles.fileBadge}>Bisa beberapa foto</span></label>
              <div className={styles.fileBtn} onClick={() => fotoRef.current?.click()}>
                <input ref={fotoRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple onChange={e => handleFileChange(e, setBuktiFoto)} />
                <i className="fas fa-camera"></i>
                <span>{buktiFoto.length > 0 ? `${buktiFoto.length} file dipilih` : 'Pilih file baru (Biarkan kosong jika tetap)'}</span>
              </div>
              {buktiFoto.length > 0 && <div className={styles.fileList}>{buktiFoto.map((f, i) => <span key={i}><i className="fas fa-image"></i> {f.name}</span>)}</div>}
            </div>
          </div>

          <div className={styles.formGroup} style={{ marginTop: 16 }}>
            <label>Keterangan Tambahan</label>
            <textarea className={styles.input} rows={2} value={keterangan} onChange={e => setKeterangan(e.target.value)} />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Batal</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving}>
              {saving ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-save"></i> Simpan Perubahan</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TabRekap({ onPrint }: { onPrint: (url: string) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [editBon, setEditBon] = useState<any | null>(null);
  const [editRealisasiBon, setEditRealisasiBon] = useState<any | null>(null);
  const [tokoList, setTokoList] = useState<any[]>([]);

  const handleEditRealisasiClick = async (item: any) => {
    setLoading(true);
    const id = item['NoBon'] || item['ID'];
    const res = await fetch(`/api/bon/realisasi?bonId=${encodeURIComponent(id)}`);
    const json = await res.json();
    if (json.success && json.data && json.data.length > 0) {
      setEditRealisasiBon({ bon: item, realisasi: json.data[0] });
    } else {
      alert('Data realisasi tidak ditemukan atau belum dibuat.');
    }
    setLoading(false);
  };

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
  useEffect(() => {
    fetch('/api/bon/toko').then(r => r.json()).then(j => setTokoList(j.data || []));
  }, []);

  return (
    <div>
      {/* Edit Modal */}
      {editBon && (
        <EditBonModal
          bon={editBon}
          tokoList={tokoList}
          onClose={() => setEditBon(null)}
          onSaved={() => { setEditBon(null); fetchData(); }}
        />
      )}
      {/* Edit Realisasi Modal */}
      {editRealisasiBon && (
        <EditRealisasiModal
          data={editRealisasiBon}
          tokoList={tokoList}
          onClose={() => setEditRealisasiBon(null)}
          onSaved={() => { setEditRealisasiBon(null); fetchData(); }}
        />
      )}
      {/* Stat Cards */}
      <div className={styles.statCards}>
        {[
          { icon: 'fa-file-invoice', color: '#3b82f6', num: stats.total || 0, lbl: 'Total BON' },
          { icon: 'fa-check-circle', color: '#10b981', num: stats.selesai || 0, lbl: 'Sudah Lapor' },
          { icon: 'fa-clock', color: '#f59e0b', num: stats.belumLapor || 0, lbl: 'Belum Lapor' },
          { icon: 'fa-wallet', color: '#8b5cf6', num: formatRp(stats.totalNominal), lbl: 'Total Nominal', small: true },
        ].map((c, i) => (
          <div key={i} className={styles.statCard} style={{ borderColor: c.color }}>
            <div className={styles.statIcon} style={{ background: c.color + '18', color: c.color }}>
              <i className={`fas ${c.icon}`}></i>
            </div>
            <div>
              <div className={styles.statNum} style={{ fontSize: c.small ? '0.95rem' : undefined }}>{c.num}</div>
              <div className={styles.statLbl}>{c.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <div className={styles.filterSearch}>
          <i className="fas fa-search"></i>
          <input type="text" placeholder="Cari nama / keperluan / jabatan..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={styles.filterSelect} value={status} onChange={e => setStatus(e.target.value)}>
          <option value="">Semua Status</option>
          <option value="Draft">Belum Lapor</option>
          <option value="Selesai">Selesai</option>
        </select>
        <input type="date" className={styles.filterDate} value={from} onChange={e => setFrom(e.target.value)} title="Dari tanggal" />
        <input type="date" className={styles.filterDate} value={to} onChange={e => setTo(e.target.value)} title="Sampai tanggal" />
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No BON</th><th>Tanggal</th><th>Pemohon</th><th>Keperluan</th>
                <th>Diminta</th><th>Realisasi</th><th>Status</th><th style={{ minWidth: 160 }}>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className={styles.emptyCell}><i className="fas fa-spinner fa-spin"></i> Memuat...</td></tr>
              ) : data.length === 0 ? (
                <tr><td colSpan={8} className={styles.emptyCell}>Tidak ada data BON</td></tr>
              ) : data.map((item, idx) => (
                <tr key={idx}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '0.78rem' }}>{item['NoBon'] || item['ID'] || '-'}</td>
                  <td style={{ fontSize: '0.82rem' }}>{item['Tanggal'] || '-'}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item['Nama'] || '-'}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{item['Jabatan'] || '-'}</div>
                  </td>
                  <td style={{ maxWidth: 180, fontSize: '0.82rem' }}>{item['Keperluan'] || '-'}</td>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem' }}>{formatRp(item['JumlahDiminta'] || item['JumlahUang'])}</td>
                  <td style={{ fontWeight: 600, fontSize: '0.85rem', color: '#10b981' }}>
                    {item['JumlahRealisasi'] ? formatRp(item['JumlahRealisasi']) : '-'}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${(item['Status'] || '').toLowerCase() === 'selesai' ? styles.badgeOk : styles.badgePending}`}>
                      {item['Status'] || 'Draft'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {/* Tombol Edit — tampil untuk status selain Selesai */}
                      {(item['Status'] || 'Draft').toLowerCase() !== 'selesai' && (
                        <button
                          className={`${styles.actionBtn}`}
                          style={{ background: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }}
                          onClick={() => setEditBon(item)}
                          title="Edit Pengajuan BON"
                        >
                          <i className="fas fa-edit"></i>
                          <span>Edit</span>
                        </button>
                      )}
                      <button className={styles.actionBtn} onClick={() => {
                        const id = encodeURIComponent(item['NoBon'] || item['ID']);
                        onPrint(`/bon/cetak/${id}`);
                      }} title="Cetak Pengajuan BON">
                        <i className="fas fa-print"></i>
                        <span>Cetak BON</span>
                      </button>
                      {(item['Status'] || '').toLowerCase() === 'selesai' && (
                        <>
                          <button className={`${styles.actionBtn}`} style={{ background: '#fef3c7', color: '#d97706', borderColor: '#fde68a' }} onClick={() => handleEditRealisasiClick(item)} title="Edit Laporan Realisasi">
                            <i className="fas fa-edit"></i>
                            <span>Edit Realisasi</span>
                          </button>
                          <button className={`${styles.actionBtn} ${styles.actionBtnGreen}`} onClick={() => {
                            const id = encodeURIComponent(item['NoBon'] || item['ID']);
                            onPrint(`/bon/cetak-realisasi/${id}`);
                          }} title="Cetak Laporan Realisasi">
                            <i className="fas fa-file-alt"></i>
                            <span>Cetak Realisasi</span>
                          </button>
                        </>
                      )}
                    </div>
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
                  <span className={styles.badge} style={{ background: (jenisColor[(t['Jenis'] || '').toLowerCase()] || '#64748b') + '20', color: jenisColor[(t['Jenis'] || '').toLowerCase()] || '#64748b', border: 'none' }}>
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
          <label>Nama Toko / Rekanan <span className={styles.required}>*</span></label>
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
function TabRealisasi({ onPrint }: { onPrint: (url: string) => void }) {
  const [penerima, setPenerima] = useState<{ nama: string; keterangan: string }[]>([{ nama: '', keterangan: '' }]);
  const [tokoList, setTokoList] = useState<any[]>([]);
  const [bonList, setBonList] = useState<any[]>([]);
  const [selectedBon, setSelectedBon] = useState<any>(null);
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [rincian, setRincian] = useState([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const [keterangan, setKeterangan] = useState('');
  const [buktiNota, setBuktiNota] = useState<File[]>([]);
  const [buktiFoto, setBuktiFoto] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [savedNoBon, setSavedNoBon] = useState('');
  const notaRef = useRef<HTMLInputElement>(null);
  const fotoRef = useRef<HTMLInputElement>(null);

  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const newFile = new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(newFile);
            } else {
              reject(new Error('Canvas to Blob failed'));
            }
          }, 'image/jpeg', 0.7); // compress to 70% quality JPEG
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<File[]>>) => {
    const files = Array.from(e.target.files || []);
    const processedFiles: File[] = [];

    for (const file of files) {
      if (file.type.startsWith('image/')) {
        try {
          const compressed = await compressImage(file);
          processedFiles.push(compressed);
        } catch (error) {
          console.error('Gagal kompres gambar', error);
          processedFiles.push(file); // fallback ke asli
        }
      } else {
        processedFiles.push(file); // pdf dll biarkan
      }
    }
    setter(processedFiles);
  };

  useEffect(() => {
    fetch('/api/bon?status=Draft').then(r => r.json()).then(j => setBonList(j.data || []));
    fetch('/api/bon/toko').then(r => r.json()).then(j => setTokoList(j.data || []));
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
    fd.append('penerimaJSON', JSON.stringify(penerima.filter(p => p.nama)));
    buktiNota.forEach(f => fd.append('buktiNota', f));
    buktiFoto.forEach(f => fd.append('buktiFoto', f));

    const res = await fetch('/api/bon/realisasi', { method: 'POST', body: fd });
    const json = await res.json();
    if (json.success) { setSavedNoBon(selectedBon['NoBon'] || selectedBon['ID']); setSukses(true); }
    else alert('Gagal: ' + json.error);
    setLoading(false);
  };

  if (sukses) return (
    <div className={styles.successCard}>
      <div className={styles.successIcon}><i className="fas fa-check-circle"></i></div>
      <h3>Realisasi Berhasil Disimpan!</h3>
      <p>Laporan realisasi untuk <strong>{savedNoBon}</strong> telah dicatat.</p>
      <div className={styles.successActions}>
        <button className={styles.btnPrimary} onClick={() => onPrint(`/bon/cetak-realisasi/${encodeURIComponent(savedNoBon)}`)}>
          <i className="fas fa-print"></i> Cetak Laporan Realisasi
        </button>
        <button className={styles.btnSecondary} onClick={() => { setSukses(false); setSavedNoBon(''); setSelectedBon(null); setRincian([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]); setBuktiNota([]); setBuktiFoto([]); }}>
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
            <label>Pilih Nota BON <span className={styles.required}>*</span></label>
            <select className={styles.input} value={selectedBon?.['NoBon'] || ''} onChange={e => {
              const bon = bonList.find(b => (b['NoBon'] || b['ID']) === e.target.value);
              setSelectedBon(bon || null);
              if (bon) { try { const r = JSON.parse(bon['RincianJSON'] || '[]'); if (r.length > 0) setRincian(r); } catch {} }
            }} required>
              <option value="">— Pilih Nota BON —</option>
              {bonList.map((b, i) => {
                const id = b['NoBon'] || b['ID'];
                const label = b['isSisaSaldo']
                  ? `💰 Sisa Saldo — ${b['Nama'] || ''} — ${b['Keperluan'] || 'Belanja Sisa Saldo'}`
                  : `${id} — ${b['Keperluan']}`;
                return <option key={i} value={id}>{label}</option>;
              })}
            </select>
          </div>
          <div className={styles.formGroup}>
            <label>Tanggal Realisasi</label>
            <input type="date" className={styles.input} value={tanggal} onChange={e => setTanggal(e.target.value)} required />
          </div>
        </div>

        {selectedBon && (
          <div className={styles.infoBon}>
            <span><strong>Pemohon:</strong> {selectedBon['Nama']} — {selectedBon['Jabatan']}</span>
            <span><strong>Keperluan:</strong> {selectedBon['Keperluan']}</span>
            <span><strong>Diminta:</strong> <b style={{ color: '#3b82f6' }}>{formatRp(selectedBon['JumlahDiminta'] || selectedBon['JumlahUang'])}</b></span>
          </div>
        )}

        <PenerimaField penerima={penerima} onChange={setPenerima} tokoList={tokoList} />

        <div className={styles.rincianSection}>
          <div className={styles.rincianHeader}>
            <span>Rincian Realisasi Belanja</span>
            <button type="button" className={styles.btnSm} onClick={addRow}><i className="fas fa-plus"></i> Tambah</button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th style={{ width: '35%' }}>Nama Barang/Kegiatan</th><th style={{ width: 44 }}>Qty</th><th style={{ width: 82 }}>Satuan</th><th style={{ width: 120 }}>Harga Satuan</th><th style={{ width: 110 }}>Jumlah</th><th style={{ width: 36 }}></th></tr></thead>
              <tbody>
                {rincian.map((item, idx) => (
                  <tr key={idx}>
                    <td><input className={styles.rincianInput} value={item.barang} onChange={e => updateRow(idx, 'barang', e.target.value)} placeholder="Nama barang..." required /></td>
                    <td><input type="text" inputMode="numeric" className={styles.rincianInput} style={{ width: '100%', textAlign: 'center' }} value={item.qty === 0 ? '' : item.qty} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)} placeholder="1" /></td>
                    <td><select className={styles.rincianInput} value={item.satuan} onChange={e => updateRow(idx, 'satuan', e.target.value)}>{SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                    <td><input type="text" inputMode="numeric" className={styles.rincianInput} value={item.harga === 0 ? '' : item.harga.toLocaleString('id-ID')} onChange={e => updateRow(idx, 'harga', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)} placeholder="0" /></td>
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
              <span>Sisa/Lebih: <strong style={{ color: sisa >= 0 ? '#059669' : '#dc2626' }}>{formatRp(Math.abs(sisa))} {sisa >= 0 ? '(Sisa)' : '(Kurang)'}</strong></span>
            )}
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={styles.formGroup}>
            <label>Upload Bukti Nota <span className={styles.fileBadge}>Bisa beberapa file</span></label>
            <div className={styles.fileBtn} onClick={() => notaRef.current?.click()}>
              <input ref={notaRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple onChange={e => handleFileChange(e, setBuktiNota)} />
              <i className="fas fa-paperclip"></i>
              <span>{buktiNota.length > 0 ? `${buktiNota.length} file dipilih` : 'Pilih file (PDF/JPG/Word)'}</span>
            </div>
            {buktiNota.length > 0 && <div className={styles.fileList}>{buktiNota.map((f, i) => <span key={i}><i className="fas fa-file"></i> {f.name}</span>)}</div>}
          </div>
          <div className={styles.formGroup}>
            <label>Upload Bukti Barang <span className={styles.fileBadge}>Bisa beberapa foto</span></label>
            <div className={styles.fileBtn} onClick={() => fotoRef.current?.click()}>
              <input ref={fotoRef} type="file" style={{ display: 'none' }} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" multiple onChange={e => handleFileChange(e, setBuktiFoto)} />
              <i className="fas fa-camera"></i>
              <span>{buktiFoto.length > 0 ? `${buktiFoto.length} file dipilih` : 'Foto barang / PDF'}</span>
            </div>
            {buktiFoto.length > 0 && <div className={styles.fileList}>{buktiFoto.map((f, i) => <span key={i}><i className="fas fa-image"></i> {f.name}</span>)}</div>}
          </div>

        </div>

        <div className={styles.formGroup}>
          <label>Keterangan Tambahan <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opsional)</span></label>
          <textarea className={styles.input} rows={2} value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Catatan tambahan..." />
        </div>

        <button type="submit" className={styles.btnPrimary} disabled={loading} style={{ width: '100%' }}>
          {loading ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan & Upload...</> : <><i className="fas fa-save"></i> Simpan & Cetak Laporan Realisasi</>}
        </button>
      </form>
    </div>
  );
}

// ===== TAB: AJUKAN BON =====
function TabAjukan({ onPrint }: { onPrint: (url: string) => void }) {
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [tokoList, setTokoList] = useState<any[]>([]);
  const [penerima, setPenerima] = useState<{ nama: string; keterangan: string }[]>([{ nama: '', keterangan: '' }]);
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [tanggal, setTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [keperluan, setKeperluan] = useState('');
  const [jumlahDiminta, setJumlahDiminta] = useState('');
  const [rincian, setRincian] = useState([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]);
  const [keterangan, setKeterangan] = useState('');
  const [gunakanSaldo, setGunakanSaldo] = useState('');
  const [saldoMap, setSaldoMap] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [sukses, setSukses] = useState(false);
  const [savedNoBon, setSavedNoBon] = useState('');
  const [historyItems, setHistoryItems] = useState<{name: string, price: number}[]>([]);

  useEffect(() => {
    // Role yang bisa mengajukan BON
    const BON_ROLES = ['admin', 'pimpinan', 'guru / ka. lab. ti', 'bimbingan konseling', 'guru / koord. literasi', 'gtk / ka. lab. ipa', 'ka. perpustakaan'];
    fetch('/api/user').then(r => r.json()).then(j => {
      const filtered = (j.data || []).filter((u: any) => {
        const role = (u.role || u.role || '').toLowerCase();
        return BON_ROLES.includes(role);
      });
      setAvailableUsers(filtered);
      const stored = localStorage.getItem('keren_user_data');
      if (stored) {
        const u = JSON.parse(stored);
        const role = (u.role || '').toLowerCase();
        if (BON_ROLES.includes(role)) {
          setNama(u.nama || '');
          setJabatan(u.jabatan || u.role || '');
        }
      }
    });
    fetch('/api/bon/toko').then(r => r.json()).then(j => setTokoList(j.data || []));
    fetch('/api/bon').then(r => r.json()).then(j => {
      if (j.saldoMap) setSaldoMap(j.saldoMap);
      if (j.data) {
        const history: Record<string, number> = {};
        j.data.forEach((item: any) => {
          if (item.RincianJSON) {
            try {
              const rincianArray = JSON.parse(item.RincianJSON);
              rincianArray.forEach((r: any) => {
                const name = (r.barang || '').trim();
                const price = Number(r.harga) || 0;
                // Simpan harga terakhir yang ditemukan (asumsi data di-reverse, jadi history terbaru ada di depan)
                if (name && price > 0 && !history[name]) {
                  history[name] = price;
                }
              });
            } catch (e) {}
          }
        });
        setHistoryItems(Object.entries(history).map(([name, price]) => ({ name, price })));
      }
    });
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
    const jumlah = jumlahDiminta.replace(/[^0-9]/g,'') || String(totalRincian);
    const saldo = gunakanSaldo.replace(/[^0-9]/g,'') || '0';
    const res = await fetch('/api/bon/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama, jabatan, tanggal, keperluan, jumlahDiminta: jumlah, saldoTerpakai: saldo, rincian, penerima: penerima.filter(p => p.nama), keterangan, tahunAjaran: '2026/2027' })
    });
    const json = await res.json();
    if (json.success) { setSavedNoBon(json.noBon); setSukses(true); }
    else alert('Gagal: ' + json.error);
    setLoading(false);
  };

  if (sukses) return (
    <div className={styles.successCard}>
      <div className={styles.successIcon}><i className="fas fa-check-circle"></i></div>
      <h3>BON Berhasil Diajukan!</h3>
      <div className={styles.noBonBox}>
        <div className={styles.noBonLabel}>Nomor BON</div>
        <div className={styles.noBonValue}>{savedNoBon}</div>
      </div>
      <div className={styles.successActions}>
        <button className={styles.btnPrimary} onClick={() => onPrint(`/bon/cetak/${encodeURIComponent(savedNoBon)}`)}>  
          <i className="fas fa-print"></i> Cetak Tanda Bukti BON
        </button>
        <button className={styles.btnSecondary} onClick={() => { setSukses(false); setSavedNoBon(''); setKeperluan(''); setJumlahDiminta(''); setKeterangan(''); setRincian([{ barang: '', qty: 1, satuan: 'PCS', harga: 0 }]); setPenerima([{ nama: '', keterangan: '' }]); }}>
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
            <label>Nama Pemohon <span className={styles.required}>*</span></label>
            <select className={styles.input} value={nama} onChange={e => {
              setNama(e.target.value);
              const u = availableUsers.find(u => (u['Nama'] || u['nama']) === e.target.value);
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
            <label>Tanggal Pengajuan <span className={styles.required}>*</span></label>
            <input type="date" className={styles.input} value={tanggal} onChange={e => setTanggal(e.target.value)} required />
          </div>
          <div className={styles.formGroup}>
            <label>Jumlah Uang Diminta (Rp) <span className={styles.required}>*</span></label>
            <input
              type="text"
              inputMode="numeric"
              className={styles.input}
              value={jumlahDiminta === '' ? '' : Number(jumlahDiminta.replace(/[^0-9]/g,'')||0).toLocaleString('id-ID')}
              onChange={e => {
                const raw = e.target.value.replace(/[^0-9]/g,'');
                setJumlahDiminta(raw);
              }}
              placeholder="Contoh: 5.000.000"
              required
            />
          </div>
        </div>

        {nama && saldoMap[nama] > 0 && (
          <div className={styles.formRow} style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label>Saldo Tersedia</label>
              <div style={{ fontWeight: 600, color: '#059669', fontSize: '1.1rem' }}>Rp {Number(saldoMap[nama]).toLocaleString('id-ID')}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Sisa uang dari BON sebelumnya</div>
            </div>
            <div className={styles.formGroup} style={{ marginBottom: 0 }}>
              <label>Gunakan Saldo (Rp)</label>
              <input
                type="text"
                inputMode="numeric"
                className={styles.input}
                value={gunakanSaldo === '' ? '' : Number(gunakanSaldo.replace(/[^0-9]/g,'')||0).toLocaleString('id-ID')}
                onChange={e => {
                  let raw = e.target.value.replace(/[^0-9]/g,'');
                  if (Number(raw) > saldoMap[nama]) raw = String(saldoMap[nama]);
                  setGunakanSaldo(raw);
                }}
                placeholder="Maksimal: "
              />
            </div>
          </div>
        )}

        {gunakanSaldo && Number(gunakanSaldo) > 0 && (
          <div style={{ background: '#eff6ff', padding: '12px 16px', borderRadius: '8px', color: '#1e3a8a', fontWeight: 600, marginBottom: '16px' }}>
            <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
            Info: Kas Tunai yang akan diterima dari Bendahara adalah Rp {Number(Math.max(0, (Number(jumlahDiminta.replace(/[^0-9]/g,'')||0) - Number(gunakanSaldo)))).toLocaleString('id-ID')}
          </div>
        )}

        <div className={styles.formGroup}>
          <label>Keperluan / Tujuan Belanja <span className={styles.required}>*</span></label>
          <input className={styles.input} value={keperluan} onChange={e => setKeperluan(e.target.value)} placeholder="Contoh: Belanja ATK untuk rapat" required />
        </div>

        <div className={styles.rincianSection}>
          <datalist id="history-barang">
            {historyItems.map((h, i) => <option key={i} value={h.name} />)}
          </datalist>
          <div className={styles.rincianHeader}>
            <span>Rincian Keperluan/Barang</span>
            <button type="button" className={styles.btnSm} onClick={addRow}><i className="fas fa-plus"></i> Tambah Baris</button>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th style={{ width: '35%' }}>Nama Barang/Kegiatan</th><th style={{ width: 44 }}>Qty</th><th style={{ width: 82 }}>Satuan</th><th style={{ width: 120 }}>Harga Satuan</th><th style={{ width: 110 }}>Jumlah</th><th style={{ width: 36 }}></th></tr></thead>
              <tbody>
                {rincian.map((item, idx) => (
                  <tr key={idx}>
                    <td>
                      <input 
                        list="history-barang"
                        className={styles.rincianInput} 
                        value={item.barang} 
                        onChange={e => {
                          const val = e.target.value;
                          updateRow(idx, 'barang', val);
                          const found = historyItems.find(h => h.name === val);
                          if (found && item.harga === 0) {
                            updateRow(idx, 'harga', found.price);
                          }
                        }} 
                        placeholder="Nama barang..." 
                        required 
                      />
                    </td>
                    <td><input type="text" inputMode="numeric" className={styles.rincianInput} style={{ width: '100%', textAlign: 'center' }} value={item.qty === 0 ? '' : item.qty} onChange={e => updateRow(idx, 'qty', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)} placeholder="1" /></td>
                    <td><select className={styles.rincianInput} value={item.satuan} onChange={e => updateRow(idx, 'satuan', e.target.value)}>{SATUAN_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
                    <td><input type="text" inputMode="numeric" className={styles.rincianInput} value={item.harga === 0 ? '' : item.harga.toLocaleString('id-ID')} onChange={e => updateRow(idx, 'harga', parseInt(e.target.value.replace(/[^0-9]/g,'')) || 0)} placeholder="0" /></td>
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

        <PenerimaField penerima={penerima} onChange={setPenerima} tokoList={tokoList} />

        <div className={styles.formGroup}>
          <label>Keterangan Tambahan <span style={{ color: '#94a3b8', fontWeight: 400 }}>(opsional)</span></label>
          <textarea className={styles.input} rows={2} value={keterangan} onChange={e => setKeterangan(e.target.value)} placeholder="Catatan tambahan..." />
        </div>

        <button type="submit" className={styles.btnPrimary} disabled={loading} style={{ width: '100%' }}>
          {loading ? <><i className="fas fa-spinner fa-spin"></i> Menyimpan...</> : <><i className="fas fa-paper-plane"></i> Ajukan & Cetak BON</>}
        </button>
      </form>
    </div>
  );
}

// ===== TAB: LAPORAN KEUANGAN =====
function TabLaporanKeuangan({ onPrint }: { onPrint: (url: string) => void }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableUsers, setAvailableUsers] = useState<any[]>([]);
  const [filterUser, setFilterUser] = useState('');
  const [filterBulan, setFilterBulan] = useState(new Date().toISOString().substring(0, 7));
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('keren_user_data');
    if (stored) {
      const u = JSON.parse(stored);
      const role = (u.role || '').toLowerCase();
      if (['admin', 'pimpinan', 'bendahara'].includes(role)) {
        setIsAdmin(true);
      } else {
        setFilterUser(u.nama || '');
      }
    }
    fetch('/api/user').then(r => r.json()).then(j => {
      setAvailableUsers(j.data || []);
    });
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const res = await fetch(`/api/bon`);
    const json = await res.json();
    setData(json.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  let mutasi: any[] = [];
  let currentSaldo = 0;   // kumulatif semua bulan (tidak dipakai di display)
  let displaySaldo = 0;  // saldo running hanya bulan target (untuk kolom saldo tabel)
  let totalTerima = 0;
  let totalKeluar = 0;

  if (filterUser && filterBulan) {
    const sortedData = [...data].reverse();
    
    sortedData.filter(d => (d.Nama || d.nama || '').trim() === filterUser).forEach(bon => {
      const isTargetMonth = (bon.Tanggal || '').startsWith(filterBulan);
      const idBukti = bon.NoBon || bon.ID;
      
      const requested = parseFloat(bon.JumlahDiminta || '0');
      const saldoDipakai = parseFloat(bon.SaldoTerpakai || '0');
      const isSaldoOnly = requested <= saldoDipakai && saldoDipakai > 0;
      
      let penerimaanKas = 0;
      if (!isSaldoOnly && requested > 0) {
        penerimaanKas = Math.max(0, requested - saldoDipakai);
        currentSaldo += penerimaanKas;
        if (isTargetMonth && penerimaanKas > 0) {
          displaySaldo += penerimaanKas;
          totalTerima += penerimaanKas;
          mutasi.push({
            id: `TRM-${idBukti}`,
            tanggal: bon.Tanggal,
            noBukti: idBukti,
            uraian: `Penerimaan Kas: ${bon.Keperluan}`,
            terima: penerimaanKas,
            keluar: 0,
            saldo: displaySaldo
          });
        }
      }

      let rincian: any[] = [];
      try {
        if (bon.RealisasiRincianJSON) rincian = JSON.parse(bon.RealisasiRincianJSON);
        else if (bon.RincianJSON) rincian = JSON.parse(bon.RincianJSON);
      } catch(e){}

      if (rincian.length > 0) {
        rincian.forEach((r, idx) => {
          const qty = Number(r.qty) || 0;
          const harga = Number(r.harga) || 0;
          const out = qty * harga;
          if (out > 0) {
            currentSaldo -= out;
            if (isTargetMonth) {
              displaySaldo -= out;
              totalKeluar += out;
              mutasi.push({
                id: `KLR-${idBukti}-${idx}`,
                tanggal: bon.Tanggal,
                noBukti: idBukti,
                uraian: `Belanja: ${r.barang} (${qty} ${r.satuan})`,
                terima: 0,
                keluar: out,
                saldo: displaySaldo
              });
            }
          }
        });
      }
      
      // Tambahkan baris khusus Sisa Saldo di akhir setiap BON
      if (isTargetMonth) {
        mutasi.push({
          id: `SISA-${idBukti}`,
          tanggal: bon.Tanggal,
          noBukti: idBukti,
          uraian: `*Sisa Saldo dari BON ini*`,
          terima: 0,
          keluar: 0,
          saldo: displaySaldo
        });
      }
    });
  }

  let lastBukti = '';
  let counter = 0;
  const finalMutasi = mutasi.map((m, i, arr) => {
    if (m.noBukti !== lastBukti) {
      lastBukti = m.noBukti;
      counter++;
      const rowSpanCount = arr.filter(x => x.noBukti === m.noBukti).length;
      return { ...m, rowSpan: rowSpanCount, num: counter };
    }
    return { ...m, rowSpan: 0, num: counter };
  });

  return (
    <div>
      <div className={styles.statCards}>
        {[
          { icon: 'fa-arrow-down', color: '#10b981', num: formatRp(totalTerima), lbl: 'Penerimaan Bulan Ini' },
          { icon: 'fa-arrow-up', color: '#ef4444', num: formatRp(totalKeluar), lbl: 'Pengeluaran Bulan Ini' },
          { icon: 'fa-wallet', color: '#3b82f6', num: formatRp(totalTerima - totalKeluar), lbl: 'Sisa Saldo Bulan Ini' },
        ].map((s, i) => (
          <div key={i} className={styles.statCard}>
            <div className={styles.statIcon} style={{ background: s.color + '20', color: s.color }}>
              <i className={`fas ${s.icon}`}></i>
            </div>
            <div className={styles.statInfo}>
              <div className={styles.statNum} style={{ fontSize: '1.2rem' }}>{s.num}</div>
              <div className={styles.statLbl}>{s.lbl}</div>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.filterBar}>
        <input 
          type="month" 
          className={styles.filterDate} 
          value={filterBulan} 
          onChange={e => setFilterBulan(e.target.value)} 
          title="Filter Bulan"
        />
        {isAdmin && (
          <select 
            className={styles.filterSelect} 
            value={filterUser} 
            onChange={e => setFilterUser(e.target.value)}
            title="Filter Pemohon"
          >
            <option value="">-- Pilih Pemohon --</option>
            {availableUsers.map(u => (
              <option key={u.ID || u.nama} value={u.Nama || u.nama}>{u.Nama || u.nama}</option>
            ))}
          </select>
        )}
        <div style={{ marginLeft: 'auto' }}>
          <button 
            className={styles.btnPrimary} 
            disabled={!filterUser || finalMutasi.length === 0}
            onClick={() => onPrint(`/bon/cetak-laporan/${encodeURIComponent(filterUser)}/${filterBulan}`)}
          >
            <i className="fas fa-print"></i> Cetak Laporan Keuangan
          </button>
        </div>
      </div>

      <div className={styles.tableWrap}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center' }}><i className="fas fa-spinner fa-spin fa-2x"></i></div>
        ) : finalMutasi.length > 0 ? (
          <table className={styles.table} style={{ whiteSpace: 'normal', minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ width: 40, textAlign: 'center' }}>No</th>
                <th style={{ width: 100 }}>Tanggal</th>
                <th style={{ width: 220 }}>No. Bukti / BON</th>
                <th>Uraian / Keperluan</th>
                <th style={{ width: 120, textAlign: 'right' }}>Penerimaan</th>
                <th style={{ width: 120, textAlign: 'right' }}>Pengeluaran</th>
                <th style={{ width: 120, textAlign: 'right' }}>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {finalMutasi.map((m) => (
                <tr key={m.id}>
                  {m.rowSpan > 0 && <td rowSpan={m.rowSpan} style={{ textAlign: 'center', verticalAlign: 'top' }}>{m.num}</td>}
                  {m.rowSpan > 0 && <td rowSpan={m.rowSpan} style={{ verticalAlign: 'top', whiteSpace: 'nowrap' }}>{m.tanggal}</td>}
                  {m.rowSpan > 0 && <td rowSpan={m.rowSpan} style={{ verticalAlign: 'top', whiteSpace: 'nowrap', fontWeight: 600 }}>{m.noBukti}</td>}
                  <td style={{ verticalAlign: 'top' }}>{m.uraian}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', color: m.terima > 0 ? '#10b981' : 'inherit' }}>{m.terima > 0 ? formatRp(m.terima) : '-'}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', color: m.keluar > 0 ? '#ef4444' : 'inherit' }}>{m.keluar > 0 ? formatRp(m.keluar) : '-'}</td>
                  <td style={{ textAlign: 'right', verticalAlign: 'top', fontWeight: 600, color: '#3b82f6' }}>{formatRp(m.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
            <i className="fas fa-inbox fa-3x" style={{ marginBottom: 16 }}></i>
            <p>Tidak ada mutasi belanja atau penerimaan untuk filter ini.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ===== MAIN PAGE =====
const TABS = [
  { id: 'laporan',     label: 'Lap. Keuangan', icon: 'fa-book',                color: '#ec4899' },
  { id: 'ajukan',      label: 'Ajukan BON',    icon: 'fa-file-invoice-dollar', color: '#237227' },
  { id: 'realisasi',   label: 'Lap. Realisasi', icon: 'fa-receipt',             color: '#0ea5e9' },
  { id: 'rekap',       label: 'Rekap Data',     icon: 'fa-chart-bar',           color: '#8b5cf6' },
  { id: 'tambah-toko', label: 'Tambah Toko',    icon: 'fa-store',               color: '#f59e0b' },
  { id: 'data-toko',   label: 'Data Penerima/Toko', icon: 'fa-list-ul', color: '#64748b' },
];

export default function BonPage() {
  const [activeTab, setActiveTab] = useState('rekap');
  const [printUrl, setPrintUrl] = useState('');

  return (
    <div className={styles.container}>
      {/* Print Modal */}
      {printUrl && <PrintModal url={printUrl} onClose={() => setPrintUrl('')} />}

      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}><i className="fas fa-file-invoice-dollar"></i> Nota BON</h1>
          <p className={styles.pageSubtitle}>Sistem Manajemen Pengajuan & Realisasi Belanja Madrasah</p>
        </div>
      </div>

      {/* Modern Tab Bar */}
      <div className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tabBtn} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={activeTab === tab.id ? { '--tab-color': tab.color } as any : {}}
          >
            <span className={styles.tabIcon} style={activeTab === tab.id ? { background: tab.color + '20', color: tab.color } : {}}>
              <i className={`fas ${tab.icon}`}></i>
            </span>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </div>

      <div className={styles.tabContent}>
        {activeTab === 'laporan'     && <TabLaporanKeuangan onPrint={setPrintUrl} />}
        {activeTab === 'ajukan'      && <TabAjukan onPrint={setPrintUrl} />}
        {activeTab === 'realisasi'   && <TabRealisasi onPrint={setPrintUrl} />}
        {activeTab === 'rekap'       && <TabRekap onPrint={setPrintUrl} />}
        {activeTab === 'tambah-toko' && <TabTambahToko />}
        {activeTab === 'data-toko'   && <TabDataToko />}
      </div>
    </div>
  );
}

