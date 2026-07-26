'use client';
import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function SurveyMadrasahPage() {
  const [activeSurvey, setActiveSurvey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [siswas, setSiswas] = useState<any[]>([]);
  const [showSuggestionsWali, setShowSuggestionsWali] = useState(false);

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
  const [formDataWaliMurid, setFormDataWaliMurid] = useState({
    nama: '',
    alasanMemilih: [] as string[],
    alasanLain: '',
    sumberInfo: [] as string[],
    sumberInfoLain: '',
    saran: ''
  });

  const [formDataSiswa, setFormDataSiswa] = useState({
    nama: '',
    kelas: '',
    alasanMemilih: [] as string[],
    alasanLain: '',
    sumberInfo: [] as string[],
    harapan: ''
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
    setSuccessMsg('');

    let payloadData: any = {};

    if (type === 'wali_murid') {
      let finalInfo = [...formDataWaliMurid.sumberInfo];
      if (formDataWaliMurid.sumberInfoLain) finalInfo.push(`Lainnya: ${formDataWaliMurid.sumberInfoLain}`);
      
      let finalAlasan = [...formDataWaliMurid.alasanMemilih];
      if (formDataWaliMurid.alasanLain) finalAlasan.push(`Lainnya: ${formDataWaliMurid.alasanLain}`);

      payloadData = {
        'Nama Wali Murid': formDataWaliMurid.nama,
        'Alasan Memilih MTs': finalAlasan.join(', '),
        'Sumber Informasi': finalInfo.join(', '),
        'Saran & Masukan': formDataWaliMurid.saran
      };
    } else if (type === 'siswa') {
      let finalAlasan = [...formDataSiswa.alasanMemilih];
      if (formDataSiswa.alasanLain) finalAlasan.push(`Lainnya: ${formDataSiswa.alasanLain}`);

      payloadData = {
        'Nama Siswa': formDataSiswa.nama,
        'Kelas': formDataSiswa.kelas,
        'Alasan Memilih MTs': finalAlasan.join(', '),
        'Sumber Informasi': formDataSiswa.sumberInfo.join(', '),
        'Harapan Ke Depan': formDataSiswa.harapan
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
        setSuccessMsg('Terima kasih! Respon Anda telah berhasil disimpan.');
        setTimeout(() => {
          setActiveSurvey(null);
          setSuccessMsg('');
          // reset forms
          setFormDataWaliMurid({ nama: '', alasanMemilih: [], alasanLain: '', sumberInfo: [], sumberInfoLain: '', saran: '' });
          setFormDataSiswa({ nama: '', kelas: '', alasanMemilih: [], alasanLain: '', sumberInfo: [], harapan: '' });
          setFormDataOrtu({ namaWali: '', namaSiswa: '', kelasSiswa: '', q1: '', q2: '', q3: '', q4: '', q5: '', q6: '', q7: '', q8: '', q9: '', q10: '' });
        }, 3000);
      } else {
        alert(result.error || 'Terjadi kesalahan');
      }
    } catch (err: any) {
      alert('Error: ' + err.message);
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

      {successMsg && (
        <div className={styles.alertSuccess}>
          <i className="fas fa-check-circle"></i> {successMsg}
        </div>
      )}

      {!activeSurvey && (
        <div className={styles.gridContainer}>
          <div className={styles.surveyCard} onClick={() => setActiveSurvey('wali_murid')}>
            <div className={styles.iconWrapper}><i className="fas fa-user-friends"></i></div>
            <h3>Angket Persepsi Wali Murid</h3>
            <p>Berikan pendapat Bapak/Ibu mengapa memilih MTs Almaarif 01 Singosari.</p>
            <button className={styles.btnAction}>Isi Angket</button>
          </div>
          <div className={styles.surveyCard} onClick={() => setActiveSurvey('siswa')}>
            <div className={styles.iconWrapper}><i className="fas fa-user-graduate"></i></div>
            <h3>Angket Persepsi Siswa</h3>
            <p>Apa alasan Ananda memilih belajar di MTs Almaarif 01 Singosari?</p>
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

      {activeSurvey === 'wali_murid' && (
        <form className={styles.surveyForm} onSubmit={(e) => submitSurvey(e, 'wali_murid')}>
          <div className={styles.formHeader}>
            <button type="button" className={styles.btnBack} onClick={() => setActiveSurvey(null)}>
              <i className="fas fa-arrow-left"></i> Kembali
            </button>
            <h2>Angket Persepsi Wali Murid</h2>
          </div>
          
          <div className={styles.formGroup} style={{ position: 'relative' }}>
            <label>Nama Wali Murid <span style={{color: 'red'}}>*</span></label>
            <input 
              type="text" 
              className={styles.input} 
              value={formDataWaliMurid.nama} 
              required
              onChange={e => {
                setFormDataWaliMurid({...formDataWaliMurid, nama: e.target.value});
                setShowSuggestionsWali(true);
              }} 
              onFocus={() => setShowSuggestionsWali(true)}
              onBlur={() => setTimeout(() => setShowSuggestionsWali(false), 200)}
              placeholder="Masukkan nama Anda..." 
            />
            {showSuggestionsWali && formDataWaliMurid.nama.length > 1 && (
              <ul className={styles.suggestionsList}>
                {siswas
                  .filter(s => 
                    (s.namaAyah && s.namaAyah.toLowerCase().includes(formDataWaliMurid.nama.toLowerCase())) ||
                    (s.namaIbu && s.namaIbu.toLowerCase().includes(formDataWaliMurid.nama.toLowerCase())) ||
                    (s.nama && s.nama.toLowerCase().includes(formDataWaliMurid.nama.toLowerCase()))
                  )
                  .slice(0, 5)
                  .map((s, idx) => {
                    const matchAyah = s.namaAyah && s.namaAyah.toLowerCase().includes(formDataWaliMurid.nama.toLowerCase());
                    const matchIbu = s.namaIbu && s.namaIbu.toLowerCase().includes(formDataWaliMurid.nama.toLowerCase());
                    const parentName = matchAyah ? s.namaAyah : (matchIbu ? s.namaIbu : s.namaAyah || s.namaIbu || 'Wali');
                    
                    return (
                      <li key={idx} onClick={() => {
                        setFormDataWaliMurid({...formDataWaliMurid, nama: parentName});
                        setShowSuggestionsWali(false);
                      }}>
                        <strong>{parentName}</strong> <br/>
                        <small style={{color: '#64748b'}}>Wali dari: {s.nama} ({s.rombel || s.tahunAjaran})</small>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>

          <div className={styles.formGroup}>
            <label>A. Mengapa Bapak/Ibu memilih MTs Almaarif sebagai tempat pendidikan untuk putra putrinya? (Bisa pilih lebih dari satu)</label>
            <div className={styles.checkboxGrid}>
              {alasanWaliMurid.map((item, idx) => (
                <label key={idx} className={styles.checkboxLabel}>
                  <input type="checkbox" value={item} checked={formDataWaliMurid.alasanMemilih.includes(item)} onChange={e => handleCheckboxChange(e, formDataWaliMurid, setFormDataWaliMurid, 'alasanMemilih')} />
                  {item}
                </label>
              ))}
              <div className={styles.customInputGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={formDataWaliMurid.alasanLain.length > 0} onChange={() => {}} />
                  Lainnya: 
                </label>
                <input type="text" className={styles.inputSmall} value={formDataWaliMurid.alasanLain} onChange={e => setFormDataWaliMurid({...formDataWaliMurid, alasanLain: e.target.value})} placeholder="Tulis alasan lain..." />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>B. Bagaimana Bapak/Ibu mendapatkan informasi tentang MTs Almaarif?</label>
            <div className={styles.checkboxGrid}>
              {infoWaliMurid.map((item, idx) => (
                <label key={idx} className={styles.checkboxLabel}>
                  <input type="checkbox" value={item} checked={formDataWaliMurid.sumberInfo.includes(item)} onChange={e => handleCheckboxChange(e, formDataWaliMurid, setFormDataWaliMurid, 'sumberInfo')} />
                  {item}
                </label>
              ))}
              <div className={styles.customInputGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={formDataWaliMurid.sumberInfoLain.length > 0} onChange={() => {}} />
                  Lain-lain: 
                </label>
                <input type="text" className={styles.inputSmall} value={formDataWaliMurid.sumberInfoLain} onChange={e => setFormDataWaliMurid({...formDataWaliMurid, sumberInfoLain: e.target.value})} placeholder="Tulis sumber info lain..." />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>C. Apa saran Bapak/Ibu Wali Murid untuk MTs Almaarif 01 Singosari agar ke depan lebih baik dan unggul?</label>
            <textarea className={styles.textarea} required value={formDataWaliMurid.saran} onChange={e => setFormDataWaliMurid({...formDataWaliMurid, saran: e.target.value})} rows={4} placeholder="Tulis saran Anda di sini..."></textarea>
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading || (formDataWaliMurid.alasanMemilih.length === 0 && !formDataWaliMurid.alasanLain) || (formDataWaliMurid.sumberInfo.length === 0 && !formDataWaliMurid.sumberInfoLain)}>
            {loading ? 'Mengirim...' : 'Kirim Survey'} <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      )}

      {activeSurvey === 'siswa' && (
        <form className={styles.surveyForm} onSubmit={(e) => submitSurvey(e, 'siswa')}>
          <div className={styles.formHeader}>
            <button type="button" className={styles.btnBack} onClick={() => setActiveSurvey(null)}>
              <i className="fas fa-arrow-left"></i> Kembali
            </button>
            <h2>Angket Persepsi Siswa</h2>
          </div>
          
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label>Nama Ananda (Opsional)</label>
              <input type="text" className={styles.input} value={formDataSiswa.nama} onChange={e => setFormDataSiswa({...formDataSiswa, nama: e.target.value})} placeholder="Nama Siswa..." />
            </div>
            <div className={styles.formGroup}>
              <label>Kelas (Opsional)</label>
              <input type="text" className={styles.input} value={formDataSiswa.kelas} onChange={e => setFormDataSiswa({...formDataSiswa, kelas: e.target.value})} placeholder="Contoh: 7A" />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>A. Mengapa Ananda memilih MTs Almaarif sebagai tempat belajar dan menuntut ilmu? Karena…</label>
            <div className={styles.checkboxGrid}>
              {alasanSiswa.map((item, idx) => (
                <label key={idx} className={styles.checkboxLabel}>
                  <input type="checkbox" value={item} checked={formDataSiswa.alasanMemilih.includes(item)} onChange={e => handleCheckboxChange(e, formDataSiswa, setFormDataSiswa, 'alasanMemilih')} />
                  {item}
                </label>
              ))}
              <div className={styles.customInputGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={formDataSiswa.alasanLain.length > 0} onChange={() => {}} />
                  Lainnya: 
                </label>
                <input type="text" className={styles.inputSmall} value={formDataSiswa.alasanLain} onChange={e => setFormDataSiswa({...formDataSiswa, alasanLain: e.target.value})} placeholder="Tulis alasan lain..." />
              </div>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>B. Bagaimana Ananda mendapatkan informasi tentang MTs Almaarif 01 Singosari?</label>
            <div className={styles.checkboxGrid}>
              {infoSiswa.map((item, idx) => (
                <label key={idx} className={styles.checkboxLabel}>
                  <input type="checkbox" value={item} checked={formDataSiswa.sumberInfo.includes(item)} onChange={e => handleCheckboxChange(e, formDataSiswa, setFormDataSiswa, 'sumberInfo')} />
                  {item}
                </label>
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label>C. Apa harapan Ananda untuk MTs Almaarif ke depan?</label>
            <textarea className={styles.textarea} required value={formDataSiswa.harapan} onChange={e => setFormDataSiswa({...formDataSiswa, harapan: e.target.value})} rows={4} placeholder="Tulis harapanmu di sini..."></textarea>
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={loading || (formDataSiswa.alasanMemilih.length === 0 && !formDataSiswa.alasanLain) || formDataSiswa.sumberInfo.length === 0}>
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
            <div className={styles.formGroup}>
              <label>Nama Anak / Siswa (Opsional)</label>
              <input type="text" className={styles.input} value={formDataOrtu.namaSiswa} onChange={e => setFormDataOrtu({...formDataOrtu, namaSiswa: e.target.value})} placeholder="Nama Anak..." />
            </div>
            <div className={styles.formGroup}>
              <label>Kelas (Opsional)</label>
              <input type="text" className={styles.input} value={formDataOrtu.kelasSiswa} onChange={e => setFormDataOrtu({...formDataOrtu, kelasSiswa: e.target.value})} placeholder="Contoh: 8B" />
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

          <button type="submit" className={styles.btnSubmit} disabled={loading}>
            {loading ? 'Mengirim...' : 'Kirim Survey'} <i className="fas fa-paper-plane"></i>
          </button>
        </form>
      )}

    </div>
  );
}
