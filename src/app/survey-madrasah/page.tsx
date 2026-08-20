'use client';
import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import styles from './page.module.css';

export default function SurveyMadrasahPage() {
  const [activeSurvey, setActiveSurvey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [siswas, setSiswas] = useState<any[]>([]);
  const [showSuggestionsWali, setShowSuggestionsWali] = useState(false);
  const [showSuggestionsSiswa, setShowSuggestionsSiswa] = useState(false);
  const [showSuggestionsOrtu, setShowSuggestionsOrtu] = useState(false);
  const [activeTab, setActiveTab] = useState<'isi'|'monitor'>('isi');
  const [isAdmin, setIsAdmin] = useState(false);
  const [rekapData, setRekapData] = useState<any[]>([]);
  const [loadingRekap, setLoadingRekap] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('keren_user_data');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const role = (user.role || user.role || '').toLowerCase();
        if (role === 'admin') setIsAdmin(true);
      } catch (e) {}
    }
  }, []);

  const fetchRekap = async (silent = false) => {
    if (!silent) setLoadingRekap(true);
    try {
      const res = await fetch('/api/survey-madrasah/rekap');
      const data = await res.json();
      if (data.success) {
        setRekapData(data.data);
      }
    } catch (e) {
      console.error(e);
    }
    if (!silent) setLoadingRekap(false);
  };

  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    if (activeTab === 'monitor') {
      fetchRekap(false); // First load shows spinner
      intervalId = setInterval(() => {
        fetchRekap(true); // Silent auto-refresh
      }, 30000); // Tiap 30 detik
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab]);

  useEffect(() => {
    const fetchSiswa = async () => {
      try {
        const res = await fetch('/api/siswa');
        const data = await res.json();
        if (data.success) {
          setSiswas(data.data || []);
        }
      } catch (err) {
        console.error('Gagal mengambil data siswa:', err);
      }
    };
    fetchSiswa();
  }, []);

  // Form states
  const [formDataOrtuSiswa, setFormDataOrtuSiswa] = useState({
    nama: '',
    kelas: '',
    alasanMemilih: [] as string[],
    alasanLain: '',
    sumberInfo: [] as string[],
    sumberInfoLain: '',
    saran: ''
  });

  const [formDataOrtu, setFormDataOrtu] = useState({
    namaWali: '',
    namaSiswa: '',
    kelasSiswa: '',
    q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: ''
  });

  const alasanWaliMurid = [
    'Dekat dengan tempat tinggal', 'Memiliki banyak program unggulan', 'Biaya pendidikan sangat terjangkau',
    'Maju/Unggul dan berkualitas', 'Dikelilingi oleh banyak pondok pesantren', 'Lingkungan mendukung, aman dan nyaman ramah anak',
    'Sarana Prasarana memadai dan sangat mendukung proses Pembelajaran', 'Menyediakan banyak pilihan Kegiatan ekstra kurikuler',
    'Menyelenggarakan kegiatan pembelajaran di luar Madrasah/alam bebas', 'Memiliki Banyak kegiatan pembiasaan untuk mendukung pembelajaran dan pembentukan karaktet',
    'Pendiri dan pembina banyak dari tokoh kharismatik/ulama', 'Menerapkan model pembelajaran yang menyenangkan dan bermakna',
    'Menyelenggarakan kelas sesuai dengan minat anak', 'Lulusannya unggul/berkualitas dan banyak mengabdi di berbagai bidang',
    'Gurunya memiliki kemampuan yang baik dalam mengajar', 'Mengutamakan pendidikan karakter (Akhlak Mulia)',
    'Mengajarkan Wawasan Ahlussunnah waljamaah an Nahdhiyah', 'Saya alumni MTs Almaarif 01 Singosari', 'Atas saran dari pengasuh pondok pesantren'
  ];

  const infoWaliMurid = [
    'Dari tetangga/teman', 'Dari alumni', 'Dari pengasuh pesantren', 'Dari guru MTs Almaarif',
    'Dari Web/IG/Tik tok MTs Almaarif', 'Dari dikoran/majalah', 'Dari brosur', 'Dari kegiatan yang diadakan oleh MTs'
  ];

  const alasanSiswa = [
    'MTs Almaarif 01 dekat dengan rumah saya', 'MTs Almaarif 01 memiliki banyak program unggulan', 'MTs Almaarif 01 maju dan berkualitas',
    'MTs Almaarif 01 dikelilingi pondok pesantren', 'MTs Almaarif 01 Lingkungannya mendukung, aman dan nyaman',
    'Di MTs Almaarif 01 sarana prasarana memadai dan sangat mendukung proses pembelajaran', 'MTs Almaarif 01 memiliki memiliki banyak pilihan kegiatan ekstra kurikuler',
    'MTs Almaarif 01 memiliki program kegiatan pembelajaran di luar madrasah/alam bebas', 'MTs Almaarif 01 memiliki banyak kegiatan pembiasaan untuk mendukung pembelajaran',
    'MTs Almaarif 01 menerapkan model pembelajaran yang menyenangkan dan bermakna', 'Lulusan MTs Almaarif berkualitas, dan berakhlak',
    'Guru-guru di MTs Almaarif 01 memiliki kemampuan yang baik dalam mengajar, ramah dan sopan', 'MTs Almaarif 01 mengutamakan pendidikan karakter (Akhlak Mulia)',
    'MTs Almaarif 01 mengajarkan wawasan Ahlussunnah waljamaah an Nahdhiyah'
  ];

  const infoSiswa = [
    'Dari tetangga/teman', 'Dari alumni', 'Dari pengasuh pesantren', 'Dari guru MTs Almaarif', 'Dari Web/IG MTs Almaarif',
    'Dari berita dikoran', 'Dari brosur', 'Dari kegiatan yang diadakan oleh MTs', 'Dari Guru di Madrasah (MI)/ Sekolah (SD)'
  ];

  const pertanyaanOrtu = [
    'Pelayanan administrasi dilakukan dengan ramah dan sopan.',
    'Pegawai memberikan pelayanan yang cepat dan membantu.',
    'Lingkungan madrasah bersih dan nyaman.',
    'Keamanan lingkungan madrasah sudah baik.',
    'Guru memberikan perhatian terhadap perkembangan belajar siswa.',
    'Guru bersikap adil kepada seluruh siswa.',
    'Informasi tugas dan nilai disampaikan dengan jelas.',
    'Wali kelas mudah dihubungi saat diperlukan.',
    'Madrasah melibatkan orang tua ketika diperlukan dalam penyelesaian masalah siswa.',
    'Anak saya merasa aman dan nyaman selama berada di madrasah.'
  ];

  const likertOptions = ['Sangat Setuju', 'Setuju', 'Kurang Setuju', 'Sangat Tidak Setuju'];

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>, state: any, setState: any, field: string) => {
    const { value, checked } = e.target;
    if (checked) {
      setState({ ...state, [field]: [...state[field], value] });
    } else {
      setState({ ...state, [field]: state[field].filter((v: string) => v !== value) });
    }
  };

  const submitSurvey = async (e: React.FormEvent, type: string) => {
    e.preventDefault();
    setLoading(true);

    let payloadData: any = {};

    if (type === 'ortu_siswa') {
      let finalInfo = [...formDataOrtuSiswa.sumberInfo];
      if (formDataOrtuSiswa.sumberInfoLain) finalInfo.push(`Lainnya: ${formDataOrtuSiswa.sumberInfoLain}`);
      
      let finalAlasan = [...formDataOrtuSiswa.alasanMemilih];
      if (formDataOrtuSiswa.alasanLain) finalAlasan.push(`Lainnya: ${formDataOrtuSiswa.alasanLain}`);

      payloadData = {
        'Nama Siswa': formDataOrtuSiswa.nama,
        'Kelas': formDataOrtuSiswa.kelas,
        'Alasan Memilih MTs': finalAlasan.join(', '),
        'Sumber Informasi': finalInfo.join(', '),
        'Saran / Harapan': formDataOrtuSiswa.saran
      };
    } else if (type === 'kepuasan_ortu') {
      payloadData = {
        'Nama Wali Murid': formDataOrtu.namaWali,
        'Nama Siswa': formDataOrtu.namaSiswa,
        'Kelas Siswa': formDataOrtu.kelasSiswa,
        'Q1: Administrasi Ramah': formDataOrtu.q1,
        'Q2: Pelayanan Cepat': formDataOrtu.q2,
        'Q3: Lingkungan Bersih': formDataOrtu.q3,
        'Q4: Keamanan Baik': formDataOrtu.q4,
        'Q5: Perhatian Guru': formDataOrtu.q5,
        'Q6: Guru Adil': formDataOrtu.q6,
        'Q7: Info Jelas': formDataOrtu.q7,
        'Q8: Wali Kelas Dihubungi': formDataOrtu.q8,
        'Q9: Melibatkan Ortu': formDataOrtu.q9,
        'Q10: Anak Aman Nyaman': formDataOrtu.q10,
      };
    }

    try {
      const res = await fetch('/api/survey-madrasah', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ surveyType: type, data: payloadData })
      });
      const result = await res.json();
      
      if (result.success) {
        Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Terima kasih! Respon Anda telah berhasil disimpan.',
          confirmButtonColor: '#3b82f6'
        });
        setActiveSurvey(null);
        // reset forms
        setFormDataOrtuSiswa({ nama: '', kelas: '', alasanMemilih: [], alasanLain: '', sumberInfo: [], sumberInfoLain: '', saran: '' });
        setFormDataOrtu({ namaWali: '', namaSiswa: '', kelasSiswa: '', q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: '' });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: result.error || 'Terjadi kesalahan',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (err: any) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err.message,
        confirmButtonColor: '#3b82f6'
      });
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>
        <i className="fas fa-poll-h"></i> Survey Madrasah
      </h1>
      <p className={styles.subtitle}>
        Berikan masukan dan pendapat Anda untuk membangun MTs Almaarif 01 Singosari menjadi lebih baik.
      </p>

      {isAdmin && (
        <div className={styles.tabContainer}>
          <button className={`${styles.tabBtn} ${activeTab === 'isi' ? styles.activeTab : ''}`} onClick={() => { setActiveTab('isi'); setActiveSurvey(null); }}>
            <i className="fas fa-edit"></i> Isi Angket
          </button>
          <button className={`${styles.tabBtn} ${activeTab === 'monitor' ? styles.activeTab : ''}`} onClick={() => setActiveTab('monitor')}>
            <i className="fas fa-chart-bar"></i> Monitoring (Admin)
          </button>
        </div>
      )}

      {activeTab === 'isi' ? (
        <>
          {!activeSurvey && (
        <div className={styles.gridContainer}>
          <div className={styles.surveyCard} onClick={() => setActiveSurvey('ortu_siswa')}>
            <div className={styles.iconWrapper}><i className="fas fa-users"></i></div>
            <h3>Survey Ortu & Siswa</h3>
            <p>Berikan pendapat Bapak/Ibu dan Ananda mengapa memilih belajar di MTs Almaarif 01 Singosari.</p>
            <button className={styles.btnAction}>Isi Angket</button>
          </div>
          <div className={styles.surveyCard} onClick={() => setActiveSurvey('kepuasan_ortu')}>
            <div className={styles.iconWrapper}><i className="fas fa-heart"></i></div>
            <h3>Angket Kepuasan Orang Tua</h3>
            <p>Penilaian kepuasan Bapak/Ibu terhadap layanan dan lingkungan MTs Almaarif 01.</p>
            <button className={styles.btnAction}>Isi Angket</button>
          </div>
        </div>
      )}

      {activeSurvey === 'ortu_siswa' && (
        <form className={styles.surveyForm} onSubmit={(e) => submitSurvey(e, 'ortu_siswa')}>
          <div className={styles.formHeader}>
            <button type="button" className={styles.btnBack} onClick={() => setActiveSurvey(null)}>
              <i className="fas fa-arrow-left"></i> Kembali
            </button>
            <h2>Survey Ortu & Siswa</h2>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>Nama Siswa <span style={{color: 'red'}}>*</span></label>
              <input 
                type="text" 
                className={styles.input} 
                value={formDataOrtuSiswa.nama} 
                required
                onChange={e => {
                  setFormDataOrtuSiswa({...formDataOrtuSiswa, nama: e.target.value});
                  setShowSuggestionsSiswa(true);
                }}
                onFocus={() => setShowSuggestionsSiswa(true)}
                onBlur={() => setTimeout(() => setShowSuggestionsSiswa(false), 200)}
                placeholder="Masukkan nama siswa..." 
              />
              {showSuggestionsSiswa && formDataOrtuSiswa.nama.length > 1 && (
                <ul className={styles.suggestionsList}>
                  {siswas
                    .filter(s => s.isLatest && s.nama && s.nama.toLowerCase().includes(formDataOrtuSiswa.nama.toLowerCase()))
                    .slice(0, 5)
                    .map((s, idx) => {
                      return (
                        <li key={idx} onClick={() => {
                          setFormDataOrtuSiswa({...formDataOrtuSiswa, nama: s.nama, kelas: s.rombel || s.tahunAjaran || ''});
                          setShowSuggestionsSiswa(false);
                        }}>
                          <strong>{s.nama}</strong> <br/>
                          <small style={{color: '#64748b'}}>Kelas: {s.rombel || s.tahunAjaran}</small>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Kelas (Otomatis)</label>
              <input type="text" className={styles.input} value={formDataOrtuSiswa.kelas} readOnly onChange={e => setFormDataOrtuSiswa({...formDataOrtuSiswa, kelas: e.target.value})} placeholder="Contoh: 7A" />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>A. Mengapa Bapak/Ibu dan Ananda memilih MTs Almaarif 01 Singosari sebagai tempat pendidikan? <br/><small style={{color: '#64748b', fontWeight: 'normal'}}>* Bisa memilih lebih dari satu jawaban</small></label>
            <div className={styles.checkboxGrid}>
              {alasanWaliMurid.map((item, idx) => (
                <label key={idx} className={styles.checkboxLabel}>
                  <input type="checkbox" value={item} checked={formDataOrtuSiswa.alasanMemilih.includes(item)} onChange={e => handleCheckboxChange(e, formDataOrtuSiswa, setFormDataOrtuSiswa, 'alasanMemilih')} />
                  <span>{item}</span>
                </label>
              ))}
              <div className={styles.customInputGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={formDataOrtuSiswa.alasanLain.length > 0} onChange={() => {}} />
                  Lainnya: 
                </label>
                <input type="text" className={styles.inputSmall} value={formDataOrtuSiswa.alasanLain} onChange={e => setFormDataOrtuSiswa({...formDataOrtuSiswa, alasanLain: e.target.value})} placeholder="Tulis alasan lain..." />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>B. Bagaimana Anda mendapatkan informasi tentang MTs Almaarif? <br/><small style={{color: '#64748b', fontWeight: 'normal'}}>* Bisa memilih lebih dari satu jawaban</small></label>
            <div className={styles.checkboxGrid}>
              {infoWaliMurid.map((item, idx) => (
                <label key={idx} className={styles.checkboxLabel}>
                  <input type="checkbox" value={item} checked={formDataOrtuSiswa.sumberInfo.includes(item)} onChange={e => handleCheckboxChange(e, formDataOrtuSiswa, setFormDataOrtuSiswa, 'sumberInfo')} />
                  <span>{item}</span>
                </label>
              ))}
              <div className={styles.customInputGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={formDataOrtuSiswa.sumberInfoLain.length > 0} onChange={() => {}} />
                  Lain-lain: 
                </label>
                <input type="text" className={styles.inputSmall} value={formDataOrtuSiswa.sumberInfoLain} onChange={e => setFormDataOrtuSiswa({...formDataOrtuSiswa, sumberInfoLain: e.target.value})} placeholder="Tulis sumber info lain..." />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>C. Apa saran dan harapan Anda untuk MTs Almaarif 01 Singosari ke depan?</label>
            <textarea className={styles.textarea} required value={formDataOrtuSiswa.saran} onChange={e => setFormDataOrtuSiswa({...formDataOrtuSiswa, saran: e.target.value})} rows={4} placeholder="Tulis saran / harapan di sini..."></textarea>
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading || (formDataOrtuSiswa.alasanMemilih.length === 0 && !formDataOrtuSiswa.alasanLain) || (formDataOrtuSiswa.sumberInfo.length === 0 && !formDataOrtuSiswa.sumberInfoLain)}>
            {loading ? 'Mengirim...' : 'Kirim Survey'} <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      )}

      {activeSurvey === 'kepuasan_ortu' && (
        <form className={styles.surveyForm} onSubmit={(e) => submitSurvey(e, 'kepuasan_ortu')}>
          <div className={styles.formHeader}>
            <button type="button" className={styles.btnBack} onClick={() => setActiveSurvey(null)}>
              <i className="fas fa-arrow-left"></i> Kembali
            </button>
            <h2>Angket Kepuasan Orang Tua/Wali Siswa</h2>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nama Orang Tua / Wali (Opsional)</label>
              <input type="text" className={styles.input} value={formDataOrtu.namaWali} onChange={e => setFormDataOrtu({...formDataOrtu, namaWali: e.target.value})} placeholder="Nama Anda..." />
            </div>
            <div className={styles.formGroup} style={{ position: 'relative' }}>
              <label>Nama Anak / Siswa <span style={{color: 'red'}}>*</span></label>
              <input 
                type="text" 
                className={styles.input} 
                value={formDataOrtu.namaSiswa} 
                required
                onChange={e => {
                  setFormDataOrtu({...formDataOrtu, namaSiswa: e.target.value});
                  setShowSuggestionsOrtu(true);
                }}
                onFocus={() => setShowSuggestionsOrtu(true)}
                onBlur={() => setTimeout(() => setShowSuggestionsOrtu(false), 200)}
                placeholder="Masukkan nama siswa..." 
              />
              {showSuggestionsOrtu && formDataOrtu.namaSiswa.length > 1 && (
                <ul className={styles.suggestionsList}>
                  {siswas
                    .filter(s => s.isLatest && s.nama && s.nama.toLowerCase().includes(formDataOrtu.namaSiswa.toLowerCase()))
                    .slice(0, 5)
                    .map((s, idx) => {
                      return (
                        <li key={idx} onClick={() => {
                          // Auto-fill both the student's class and the parent's name if empty
                          const parentName = formDataOrtu.namaWali ? formDataOrtu.namaWali : (s.namaAyah || s.namaIbu || '');
                          setFormDataOrtu({
                            ...formDataOrtu, 
                            namaSiswa: s.nama, 
                            kelasSiswa: s.rombel || s.tahunAjaran || '',
                            namaWali: parentName
                          });
                          setShowSuggestionsOrtu(false);
                        }}>
                          <strong>{s.nama}</strong> <br/>
                          <small style={{color: '#64748b'}}>Kelas: {s.rombel || s.tahunAjaran}</small>
                        </li>
                      );
                    })}
                </ul>
              )}
            </div>
            <div className={styles.formGroup}>
              <label>Kelas (Otomatis)</label>
              <input type="text" className={styles.input} value={formDataOrtu.kelasSiswa} readOnly onChange={e => setFormDataOrtu({...formDataOrtu, kelasSiswa: e.target.value})} placeholder="Contoh: 8B" />
            </div>
          </div>

          <div className={styles.likertTableContainer}>
            <table className={styles.likertTable}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Pernyataan</th>
                  {likertOptions.map(opt => <th key={opt}>{opt}</th>)}
                </tr>
              </thead>
              <tbody>
                {pertanyaanOrtu.map((q, idx) => {
                  const qKey = `q${idx + 1}` as keyof typeof formDataOrtu;
                  return (
                    <tr key={idx}>
                      <td>{idx + 1}</td>
                      <td>{q}</td>
                      {likertOptions.map(opt => (
                        <td key={opt} className={styles.centerText}>
                          <input type="radio" name={`q${idx + 1}`} value={opt} checked={formDataOrtu[qKey] === opt} onChange={e => setFormDataOrtu({...formDataOrtu, [qKey]: e.target.value})} required />
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading || !formDataOrtu.q1 || !formDataOrtu.q2 || !formDataOrtu.q3 || !formDataOrtu.q4 || !formDataOrtu.q5 || !formDataOrtu.q6 || !formDataOrtu.q7 || !formDataOrtu.q8 || !formDataOrtu.q9 || !formDataOrtu.q10}>
            {loading ? 'Mengirim...' : 'Kirim Survey'} <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      )}
      </>
      ) : (
        <div className={styles.monitorContainer}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ color: '#1e293b', fontSize: '1.25rem' }}>Rekapitulasi Survey</h2>
            <button onClick={() => fetchRekap(false)} disabled={loadingRekap} className={styles.btnAction} style={{ padding: '8px 16px', fontSize: '0.9rem' }}>
              <i className={`fas fa-sync-alt ${loadingRekap ? 'fa-spin' : ''}`}></i> Refresh
            </button>
          </div>
          {loadingRekap ? (
            <div style={{textAlign: 'center', padding: '40px', color: '#64748b'}}>
              <i className="fas fa-spinner fa-spin fa-2x" style={{ color: '#3b82f6', marginBottom: '10px' }}></i>
              <p>Memuat data rekap...</p>
            </div>
          ) : (
            <div className={styles.gridContainer}>
              {rekapData.map((rek, idx) => (
                <div key={idx} className={styles.rekapCard}>
                  <h3>{rek.nama}</h3>
                  <div className={styles.rekapTotal}>
                    <span className={styles.totalNumber}>{rek.total}</span>
                    <span className={styles.totalLabel}>Responden</span>
                  </div>
                  <div className={styles.rekapDetail}>
                    <h4>10 Input Terakhir:</h4>
                    {rek.latest && rek.latest.length > 0 ? (
                      <ul>
                        {rek.latest.map((item: any, i: number) => (
                          <li key={i}>
                            <strong>{item.nama}</strong> <span style={{ color: '#64748b' }}>({item.kelas})</span><br/>
                            <small>{item.timestamp}</small>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p style={{color: '#94a3b8', fontSize: '0.85rem'}}>Belum ada data</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
