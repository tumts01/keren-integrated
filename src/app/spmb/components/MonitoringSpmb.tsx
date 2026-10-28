'use client';
import { useState, useMemo } from 'react';
import styles from './MonitoringSpmb.module.css';

// Deteksi jenis sekolah: MI, SD, atau Lainnya
export function getSchoolType(name: string): 'MI' | 'SD' | 'Lainnya' {
  const upper = (name || '').toUpperCase();
  if (/\b(MI|MIN|MIS|MADRASAH IBTIDAIYAH)\b/.test(upper)) return 'MI';
  if (/\b(SD|SDI|SDN|SDIT|SEKOLAH DASAR)\b/.test(upper)) return 'SD';
  return 'Lainnya';
}

// Deteksi wilayah tempat tinggal / domisili pendaftar
export function getApplicantLocation(alamatSiswa: string, alamatSekolah: string): string {
  const combined = `${alamatSiswa || ''} ${alamatSekolah || ''}`.toUpperCase();
  if (/SINGOSARI|PAGENTAN|KLAMPOK|CANDIRENGGO|LOSARI|BANJARARUM|DENGKOL|TOYOMARTO|GUNUNGREJO|ARDIMULYO|BATURETNO|LANGLANG|RANDUAGUNG|TUNAHAN|WATU GEDE|PURWOASRI/.test(combined)) {
    return 'Kec. Singosari';
  }
  if (/LAWANG|TURIREJO|KALIREJO|SRIGADING|WONOREJO LAWANG|KETINDAN|SIDODADI/.test(combined)) {
    return 'Kec. Lawang';
  }
  if (/PAKIS|TIRTOMOYO|MANGLIAWAN|ASRIKATON|BUNUT|PULESARI/.test(combined)) {
    return 'Kec. Pakis';
  }
  if (/KARANGPLOSO|GIRIMOYO|KEPUHARJO|AMPELDENTO|TEGALGONDO/.test(combined)) {
    return 'Kec. Karangploso';
  }
  if (/PASURUAN|PURWOSARI|PURWODADI|WONOREJO PASURUAN|PANDAAN|SUKOREJO/.test(combined)) {
    return 'Kab. Pasuruan';
  }
  if (/BLIMBING|LOWOKWARU|KLOJEN|SUKUN|KEDUNGKANDANG|MALANG KOTA|KOTA MALANG|POLOWIJEN|ARJOSARI/.test(combined)) {
    return 'Kota Malang';
  }
  return 'Wilayah Lainnya';
}

// Helper parsing timestamp SPMB
function parseItemTime(str: string): number {
  if (!str) return 0;
  const parts = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (parts) {
    const [, d, m, y] = parts;
    return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
  }
  const parsed = Date.parse(str);
  return isNaN(parsed) ? 0 : parsed;
}

interface MonitoringSpmbProps {
  data: any[];
  onSelectSchoolFilter?: (schoolName: string) => void;
  onSelectLocationFilter?: (locationName: string) => void;
  activeSchoolFilter?: string;
  activeLocationFilter?: string;
  onClearFilters?: () => void;
}

export default function MonitoringSpmb({
  data,
  onSelectSchoolFilter,
  onSelectLocationFilter,
  activeSchoolFilter,
  activeLocationFilter,
  onClearFilters,
}: MonitoringSpmbProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'sekolah' | 'wilayah' | 'jalur' | 'tren'>('sekolah');
  const [schoolSearch, setSchoolSearch] = useState('');
  const [schoolTypeFilter, setSchoolTypeFilter] = useState<'semua' | 'MI' | 'SD'>('semua');
  const [schoolSort, setSchoolSort] = useState<'terbanyak' | 'abjad'>('terbanyak');
  const [expandedSchool, setExpandedSchool] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  // Perhitungan Data & Statistik
  const stats = useMemo(() => {
    const total = data.length;
    let totalL = 0;
    let totalP = 0;

    const schoolMap: Record<string, {
      name: string;
      type: 'MI' | 'SD' | 'Lainnya';
      total: number;
      laki: number;
      perempuan: number;
      students: { nama: string; jalur: string; tanggal: string }[];
    }> = {};

    const regionMap: Record<string, { total: number; laki: number; perempuan: number }> = {};
    const jalurMap: Record<string, number> = {};
    const monthMap: Record<string, number> = {};

    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    let count7Days = 0;

    data.forEach(item => {
      // Gender
      const jk = (item.jenisKelamin || '').toLowerCase();
      const isL = jk.startsWith('l');
      if (isL) totalL++;
      else totalP++;

      // Sekolah Asal
      let sRaw = (item.asalSekolah || '').trim();
      if (!sRaw) sRaw = 'Tidak Mengisi';
      const sKey = sRaw.toUpperCase().replace(/\s+/g, ' ');

      if (!schoolMap[sKey]) {
        schoolMap[sKey] = {
          name: sRaw,
          type: getSchoolType(sRaw),
          total: 0,
          laki: 0,
          perempuan: 0,
          students: []
        };
      }
      schoolMap[sKey].total++;
      if (isL) schoolMap[sKey].laki++;
      else schoolMap[sKey].perempuan++;
      schoolMap[sKey].students.push({
        nama: item.namaLengkap || '-',
        jalur: item.jalurPendaftaran || '-',
        tanggal: item.timestamp ? item.timestamp.split(',')[0] : '-'
      });

      // Wilayah
      const loc = getApplicantLocation(item.alamatLengkap || '', item.alamatSekolahAsal || '');
      if (!regionMap[loc]) regionMap[loc] = { total: 0, laki: 0, perempuan: 0 };
      regionMap[loc].total++;
      if (isL) regionMap[loc].laki++;
      else regionMap[loc].perempuan++;

      // Jalur
      const j = (item.jalurPendaftaran || 'Lainnya').trim();
      jalurMap[j] = (jalurMap[j] || 0) + 1;

      // Waktu input / timeline
      const t = parseItemTime(item.timestamp || '');
      if (t > 0) {
        if (t >= sevenDaysAgo) count7Days++;
        const dObj = new Date(t);
        const mKey = dObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
        monthMap[mKey] = (monthMap[mKey] || 0) + 1;
      }
    });

    const schoolsArray = Object.values(schoolMap);
    const totalMi = schoolsArray.filter(s => s.type === 'MI').reduce((acc, s) => acc + s.total, 0);
    const totalSd = schoolsArray.filter(s => s.type === 'SD').reduce((acc, s) => acc + s.total, 0);
    const countMiSchools = schoolsArray.filter(s => s.type === 'MI').length;
    const countSdSchools = schoolsArray.filter(s => s.type === 'SD').length;

    return {
      total,
      totalL,
      totalP,
      schoolsArray,
      totalMi,
      totalSd,
      countMiSchools,
      countSdSchools,
      distinctSchools: schoolsArray.length,
      regionMap,
      jalurMap,
      monthMap,
      count7Days
    };
  }, [data]);

  // Filtered & Sorted Sekolah List
  const filteredSchools = useMemo(() => {
    let list = stats.schoolsArray.filter(s => {
      if (schoolSearch.trim()) {
        const q = schoolSearch.toLowerCase().trim();
        if (!s.name.toLowerCase().includes(q)) return false;
      }
      if (schoolTypeFilter !== 'semua') {
        if (s.type !== schoolTypeFilter) return false;
      }
      return true;
    });

    list.sort((a, b) => {
      if (schoolSort === 'terbanyak') {
        return b.total - a.total;
      }
      return a.name.localeCompare(b.name, 'id');
    });

    return list;
  }, [stats.schoolsArray, schoolSearch, schoolTypeFilter, schoolSort]);

  // Sorted Wilayah List
  const sortedRegions = useMemo(() => {
    return Object.entries(stats.regionMap)
      .map(([name, val]) => ({ name, ...val }))
      .sort((a, b) => b.total - a.total);
  }, [stats.regionMap]);

  return (
    <div className={styles.wrapper}>
      {/* HEADER PANEL */}
      <div className={styles.headerBar}>
        <div className={styles.headerLeft}>
          <div className={styles.iconCircle}>
            <i className="fas fa-chart-pie"></i>
          </div>
          <div>
            <div className={styles.headerTitle}>
              Pemantauan Data Input Siswa (Live Analytics SPMB)
              <span className={styles.liveBadge}>
                <span className={styles.liveDot}></span> Live Update
              </span>
            </div>
            <div className={styles.headerSubtitle}>
              Pantau sebaran asal SD/MI pendaftar, wilayah domisili, laju input, dan statistik jalur secara spesifik.
            </div>
          </div>
        </div>

        <div className={styles.headerRight}>
          <button
            type="button"
            className={styles.btnPrintRekap}
            onClick={() => setShowPrintModal(true)}
            title="Cetak rekapitulasi data pendaftar per SD/MI"
          >
            <i className="fas fa-print" style={{ color: '#059669' }}></i>
            Cetak Laporan Asal SD/MI
          </button>

          <button
            type="button"
            className={styles.btnToggleCollapse}
            onClick={() => setCollapsed(prev => !prev)}
            title={collapsed ? 'Tampilkan panel analitik' : 'Sembunyikan panel analitik'}
          >
            <i className={`fas fa-chevron-${collapsed ? 'down' : 'up'}`}></i>
            {collapsed ? 'Buka Pemantauan' : 'Ciutkan'}
          </button>
        </div>
      </div>

      {/* BODY CONTENT */}
      {!collapsed && (
        <div className={styles.bodyContent}>
          {/* BARIS METRIK UTAMA */}
          <div className={styles.metricsGrid}>
            {/* Card 1: Total Pendaftar */}
            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#ecfdf5', color: '#059669' }}>
                <i className="fas fa-user-graduate"></i>
              </div>
              <div className={styles.metricInfo}>
                <div className={styles.metricLabel}>Total Pendaftar Masuk</div>
                <div className={styles.metricValue}>{stats.total} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Siswa</span></div>
                <div className={styles.metricSub}>
                  <span style={{ color: '#0284c7', fontWeight: 600 }}>♂ {stats.totalL} Laki-laki</span> ({stats.total > 0 ? Math.round((stats.totalL / stats.total) * 100) : 0}%) • <span style={{ color: '#ec4899', fontWeight: 600 }}>♀ {stats.totalP} Perempuan</span>
                </div>
              </div>
            </div>

            {/* Card 2: Asal SD/MI */}
            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#eff6ff', color: '#2563eb' }}>
                <i className="fas fa-school"></i>
              </div>
              <div className={styles.metricInfo}>
                <div className={styles.metricLabel}>Asal Sekolah Terdata</div>
                <div className={styles.metricValue}>{stats.distinctSchools} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>SD / MI</span></div>
                <div className={styles.metricSub}>
                  <strong style={{ color: '#15803d' }}>MI:</strong> {stats.totalMi} siswa ({stats.countMiSchools} sek.) • <strong style={{ color: '#0369a1' }}>SD:</strong> {stats.totalSd} siswa ({stats.countSdSchools} sek.)
                </div>
              </div>
            </div>

            {/* Card 3: Basis Wilayah */}
            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#fef3c7', color: '#d97706' }}>
                <i className="fas fa-map-marker-alt"></i>
              </div>
              <div className={styles.metricInfo}>
                <div className={styles.metricLabel}>Wilayah Pendaftar Utama</div>
                <div className={styles.metricValue}>
                  {sortedRegions[0]?.name || 'Singosari'}
                </div>
                <div className={styles.metricSub}>
                  {sortedRegions[0]?.total || 0} Siswa ({stats.total > 0 ? Math.round(((sortedRegions[0]?.total || 0) / stats.total) * 100) : 0}%) mendominasi pendaftar
                </div>
              </div>
            </div>

            {/* Card 4: Input 7 Hari Terakhir */}
            <div className={styles.metricCard}>
              <div className={styles.metricIcon} style={{ background: '#f3e8ff', color: '#9333ea' }}>
                <i className="fas fa-tachometer-alt"></i>
              </div>
              <div className={styles.metricInfo}>
                <div className={styles.metricLabel}>Input 7 Hari Terakhir</div>
                <div className={styles.metricValue}>+{stats.count7Days} <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>Siswa Baru</span></div>
                <div className={styles.metricSub}>
                  Kecepatan pendaftaran masuk aktif termonitor
                </div>
              </div>
            </div>
          </div>

          {/* TAB NAVIGATOR */}
          <div className={styles.tabNav}>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'sekolah' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('sekolah')}
            >
              <i className="fas fa-school"></i> Sebaran SD / MI Asal ({stats.distinctSchools})
            </button>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'wilayah' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('wilayah')}
            >
              <i className="fas fa-map-marked-alt"></i> Asal Wilayah / Domisili ({sortedRegions.length})
            </button>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'jalur' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('jalur')}
            >
              <i className="fas fa-layer-group"></i> Jalur &amp; Gender
            </button>
            <button
              type="button"
              className={`${styles.tabItem} ${activeTab === 'tren' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('tren')}
            >
              <i className="fas fa-chart-line"></i> Tren Waktu Input
            </button>
          </div>

          {/* TAB 1: SEBARAN SD/MI */}
          {activeTab === 'sekolah' && (
            <div>
              {/* Controls */}
              <div className={styles.schoolControls}>
                <div className={styles.schoolSearch}>
                  <i className={`fas fa-search ${styles.schoolSearchIcon}`}></i>
                  <input
                    type="text"
                    placeholder="Cari nama SD / MI..."
                    value={schoolSearch}
                    onChange={e => setSchoolSearch(e.target.value)}
                  />
                </div>

                <div className={styles.schoolFilterPills}>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${schoolTypeFilter === 'semua' ? styles.filterPillActive : ''}`}
                    onClick={() => setSchoolTypeFilter('semua')}
                  >
                    Semua ({stats.distinctSchools})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${schoolTypeFilter === 'MI' ? styles.filterPillActive : ''}`}
                    onClick={() => setSchoolTypeFilter('MI')}
                  >
                    MI ({stats.countMiSchools})
                  </button>
                  <button
                    type="button"
                    className={`${styles.filterPill} ${schoolTypeFilter === 'SD' ? styles.filterPillActive : ''}`}
                    onClick={() => setSchoolTypeFilter('SD')}
                  >
                    SD ({stats.countSdSchools})
                  </button>
                </div>

                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>Urutkan:</span>
                  <select
                    className={styles.sortSelect}
                    value={schoolSort}
                    onChange={e => setSchoolSort(e.target.value as any)}
                  >
                    <option value="terbanyak">Pendaftar Terbanyak</option>
                    <option value="abjad">Nama Sekolah (A - Z)</option>
                  </select>
                </div>
              </div>

              {/* Grid of School Cards */}
              {filteredSchools.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: '#94a3b8' }}>
                  <i className="fas fa-search fa-2x" style={{ marginBottom: 10 }}></i>
                  <p>Tidak ada sekolah yang cocok dengan pencarian &quot;{schoolSearch}&quot;</p>
                </div>
              ) : (
                <div className={styles.schoolsGrid}>
                  {filteredSchools.map((sch, idx) => {
                    const pct = stats.total > 0 ? ((sch.total / stats.total) * 100).toFixed(1) : '0';
                    const isExpanded = expandedSchool === sch.name;
                    const isActive = activeSchoolFilter?.toUpperCase() === sch.name.toUpperCase();

                    return (
                      <div
                        key={idx}
                        className={`${styles.schoolCard} ${isActive ? styles.schoolCardActive : ''}`}
                      >
                        <div className={styles.schoolCardTop}>
                          <div className={styles.schoolRankName}>
                            <span className={`${styles.schoolRank} ${idx === 0 ? styles.rankTop1 : idx === 1 ? styles.rankTop2 : idx === 2 ? styles.rankTop3 : ''}`}>
                              #{idx + 1}
                            </span>
                            <div>
                              <div className={styles.schoolName}>{sch.name}</div>
                              <span className={`${styles.schoolTypeBadge} ${sch.type === 'MI' ? styles.typeMi : sch.type === 'SD' ? styles.typeSd : styles.typeOther}`}>
                                {sch.type}
                              </span>
                            </div>
                          </div>

                          <div className={styles.schoolCountBadge}>
                            <span>{sch.total}</span>
                            <span className={styles.schoolCountLabel}>Siswa ({pct}%)</span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className={styles.progressBarContainer}>
                          <div
                            className={styles.progressBarFill}
                            style={{
                              width: `${pct}%`,
                              background: sch.type === 'MI' ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #38bdf8, #0284c7)'
                            }}
                          ></div>
                        </div>

                        {/* Card Footer */}
                        <div className={styles.schoolCardFooter}>
                          <div className={styles.genderSummary}>
                            <span title="Laki-laki"><i className="fas fa-mars" style={{ color: '#0284c7', marginRight: 3 }}></i>{sch.laki}</span>
                            <span title="Perempuan"><i className="fas fa-venus" style={{ color: '#ec4899', marginRight: 3 }}></i>{sch.perempuan}</span>
                          </div>

                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              type="button"
                              className={styles.btnSchoolAction}
                              style={{ background: isExpanded ? '#e2e8f0' : 'white' }}
                              onClick={() => setExpandedSchool(isExpanded ? null : sch.name)}
                              title="Tampilkan daftar nama siswa dari sekolah ini"
                            >
                              <i className={`fas fa-${isExpanded ? 'chevron-up' : 'users'}`}></i>
                              {isExpanded ? 'Tutup' : 'Nama Siswa'}
                            </button>

                            <button
                              type="button"
                              className={styles.btnSchoolAction}
                              style={{ background: isActive ? '#059669' : 'white', color: isActive ? 'white' : '#059669' }}
                              onClick={() => {
                                if (isActive && onClearFilters) {
                                  onClearFilters();
                                } else if (onSelectSchoolFilter) {
                                  onSelectSchoolFilter(sch.name);
                                }
                              }}
                              title="Lihat siswa dari sekolah ini di tabel rekap pendaftar"
                            >
                              <i className="fas fa-list-alt"></i>
                              {isActive ? 'Filter Aktif' : 'Lihat di Rekap'}
                            </button>
                          </div>
                        </div>

                        {/* Expand Drawer: Nama Siswa */}
                        {isExpanded && (
                          <div className={styles.studentListDrawer}>
                            <div style={{ fontWeight: 700, color: '#475569', marginBottom: 4 }}>
                              Daftar Siswa Pendaftar ({sch.students.length}):
                            </div>
                            {sch.students.map((st, si) => (
                              <div key={si} className={styles.studentListItem}>
                                <span><strong>{si + 1}.</strong> {st.nama}</span>
                                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                  ({st.jalur}) {st.tanggal}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: WILAYAH DOMISILI */}
          {activeTab === 'wilayah' && (
            <div>
              <div style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 14 }}>
                Distribusi wilayah tempat tinggal / domisili pendaftar yang terdeteksi dari isian alamat siswa:
              </div>

              <div className={styles.regionsGrid}>
                {sortedRegions.map((reg, idx) => {
                  const pct = stats.total > 0 ? ((reg.total / stats.total) * 100).toFixed(1) : '0';
                  const isActive = activeLocationFilter === reg.name;

                  return (
                    <div
                      key={idx}
                      className={styles.regionCard}
                      style={{ borderColor: isActive ? '#2563eb' : '#e2e8f0', background: isActive ? '#eff6ff' : '#f8fafc' }}
                    >
                      <div className={styles.regionHeader}>
                        <div className={styles.regionName}>
                          <i className="fas fa-map-pin" style={{ color: '#2563eb', marginRight: 8 }}></i>
                          {reg.name}
                        </div>
                        <div className={styles.regionCount}>
                          {reg.total} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>Siswa ({pct}%)</span>
                        </div>
                      </div>

                      <div className={styles.progressBarContainer}>
                        <div
                          className={styles.progressBarFill}
                          style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #60a5fa, #2563eb)' }}
                        ></div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: '0.76rem', color: '#64748b' }}>
                        <span>♂ {reg.laki} Laki-laki • ♀ {reg.perempuan} Perempuan</span>
                        <button
                          type="button"
                          className={styles.btnSchoolAction}
                          style={{ background: isActive ? '#2563eb' : 'white', color: isActive ? 'white' : '#2563eb' }}
                          onClick={() => {
                            if (isActive && onClearFilters) {
                              onClearFilters();
                            } else if (onSelectLocationFilter) {
                              onSelectLocationFilter(reg.name);
                            }
                          }}
                        >
                          <i className="fas fa-list-alt"></i> {isActive ? 'Filter Aktif' : 'Lihat di Rekap'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: JALUR & GENDER */}
          {activeTab === 'jalur' && (
            <div className={styles.twoColGrid}>
              {/* Kolom Kiri: Jalur Pendaftaran */}
              <div className={styles.subCard}>
                <div className={styles.subCardTitle}>
                  <i className="fas fa-layer-group" style={{ color: '#8b5cf6' }}></i>
                  Komposisi Jalur Pendaftaran
                </div>

                {Object.entries(stats.jalurMap)
                  .sort((a, b) => b[1] - a[1])
                  .map(([jalur, count], idx) => {
                    const pct = stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : '0';
                    return (
                      <div key={idx} className={styles.jalurItem}>
                        <div className={styles.jalurItemHeader}>
                          <span style={{ color: '#1e293b' }}>{jalur}</span>
                          <span style={{ color: '#7c3aed' }}>{count} Siswa ({pct}%)</span>
                        </div>
                        <div className={styles.progressBarContainer} style={{ margin: '4px 0 8px' }}>
                          <div
                            className={styles.progressBarFill}
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #a78bfa, #7c3aed)' }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
              </div>

              {/* Kolom Kanan: Gender & Verifikasi */}
              <div className={styles.subCard}>
                <div className={styles.subCardTitle}>
                  <i className="fas fa-venus-mars" style={{ color: '#ec4899' }}></i>
                  Rasio Gender &amp; Status Dokumen
                </div>

                {/* Gender Bars */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', fontWeight: 600, marginBottom: 4 }}>
                    <span style={{ color: '#0284c7' }}>♂ Laki-laki: {stats.totalL} ({stats.total > 0 ? Math.round((stats.totalL / stats.total) * 100) : 0}%)</span>
                    <span style={{ color: '#db2777' }}>♀ Perempuan: {stats.totalP} ({stats.total > 0 ? Math.round((stats.totalP / stats.total) * 100) : 0}%)</span>
                  </div>
                  <div style={{ height: 10, display: 'flex', borderRadius: 8, overflow: 'hidden' }}>
                    <div style={{ width: `${stats.total > 0 ? (stats.totalL / stats.total) * 100 : 50}%`, background: '#0284c7' }}></div>
                    <div style={{ width: `${stats.total > 0 ? (stats.totalP / stats.total) * 100 : 50}%`, background: '#ec4899' }}></div>
                  </div>
                </div>

                {/* Status Dokumen Quick List */}
                <div style={{ fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#dcfce7', borderRadius: 8, color: '#15803d', fontWeight: 600 }}>
                    <span><i className="fas fa-id-card" style={{ marginRight: 6 }}></i> KK Valid</span>
                    <span>{data.filter(d => (d.statusVerifikasi || '').toLowerCase() === 'valid').length} Siswa</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#e0f2fe', borderRadius: 8, color: '#0369a1', fontWeight: 600 }}>
                    <span><i className="fas fa-book" style={{ marginRight: 6 }}></i> Rapor Valid</span>
                    <span>{data.filter(d => (d.statusVerifikasiRapor || '').toLowerCase() === 'valid').length} Siswa</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: '#fef3c7', borderRadius: 8, color: '#b45309', fontWeight: 600 }}>
                    <span><i className="fas fa-clock" style={{ marginRight: 6 }}></i> Berkas Rapor Belum Lengkap</span>
                    <span>{data.filter(d => (d.statusVerifikasiRapor || '').toLowerCase() !== 'valid' && (d.statusVerifikasiRapor || '').toLowerCase() !== 'perbaikan').length} Siswa</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TREN WAKTU */}
          {activeTab === 'tren' && (
            <div>
              <div style={{ fontSize: '0.84rem', color: '#64748b', marginBottom: 14 }}>
                Jumlah input pendaftar masuk dikelompokkan berdasarkan bulan pendaftaran:
              </div>

              <div className={styles.timelineGrid}>
                {Object.entries(stats.monthMap).map(([mName, mCount], idx) => (
                  <div key={idx} className={styles.monthCard}>
                    <div className={styles.monthName}><i className="fas fa-calendar-day" style={{ color: '#059669', marginRight: 6 }}></i>{mName}</div>
                    <div className={styles.monthCount}>{mCount}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Pendaftar Masuk</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRINT MODAL REKAP ASAL SEKOLAH */}
      {showPrintModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalBox}>
            <div className={styles.modalHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                <i className="fas fa-print"></i>
                <span>Cetak Laporan Rekapitulasi Asal SD/MI SPMB</span>
              </div>
              <button
                type="button"
                className={styles.btnToggleCollapse}
                style={{ background: '#334155', color: 'white', border: 'none' }}
                onClick={() => setShowPrintModal(false)}
              >
                <i className="fas fa-times"></i> Tutup
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className="printableReport">
                {/* KOP RESMI MADRASAH */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, borderBottom: '3px double #000', paddingBottom: 10, marginBottom: 16 }}>
                  <img src="/logo.png" alt="Logo" style={{ width: 65, height: 65, objectFit: 'contain' }} />
                  <div style={{ flex: 1, textAlign: 'center' }}>
                    <div style={{ fontSize: '13pt', fontWeight: 800 }}>PANITIA PENERIMAAN MURID BARU (SPMB)</div>
                    <div style={{ fontSize: '15pt', fontWeight: 800 }}>MTs ALMAARIF 01 SINGOSARI</div>
                    <div style={{ fontSize: '9pt', color: '#333' }}>Jl. Masjid No. 33 Pagentan Singosari Malang Telp. (0341) 458776</div>
                  </div>
                </div>

                <div style={{ textAlign: 'center', marginBottom: 18 }}>
                  <div style={{ fontSize: '12pt', fontWeight: 800, textDecoration: 'underline' }}>
                    REKAPITULASI DATA ASAL SEKOLAH PENDAFTAR
                  </div>
                  <div style={{ fontSize: '10pt', color: '#444' }}>
                    Tahun Ajaran 2026/2027 • Posisi Data: {new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  </div>
                </div>

                {/* Ringkasan Singkat */}
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 14, fontSize: '9.5pt' }}>
                  <tbody>
                    <tr>
                      <td style={{ width: '25%', fontWeight: 700 }}>Total Pendaftar Masuk</td>
                      <td style={{ width: '25%' }}>: {stats.total} Siswa</td>
                      <td style={{ width: '25%', fontWeight: 700 }}>Total SD / MI Asal</td>
                      <td style={{ width: '25%' }}>: {stats.distinctSchools} Sekolah</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700 }}>Siswa dari MI</td>
                      <td>: {stats.totalMi} Siswa ({stats.countMiSchools} Madrasah)</td>
                      <td style={{ fontWeight: 700 }}>Siswa dari SD</td>
                      <td>: {stats.totalSd} Siswa ({stats.countSdSchools} Sekolah)</td>
                    </tr>
                  </tbody>
                </table>

                {/* Tabel Rekap Sekolah */}
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.5pt' }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9' }}>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', width: 36, textAlign: 'center' }}>No</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', textAlign: 'left' }}>Nama Asal SD / MI</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', width: 60, textAlign: 'center' }}>Tipe</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', width: 50, textAlign: 'center' }}>L</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', width: 50, textAlign: 'center' }}>P</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', width: 90, textAlign: 'center' }}>Total Siswa</th>
                      <th style={{ border: '1px solid #000', padding: '6px 8px', width: 80, textAlign: 'center' }}>Persentase</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.schoolsArray
                      .sort((a, b) => b.total - a.total)
                      .map((s, idx) => {
                        const pct = stats.total > 0 ? ((s.total / stats.total) * 100).toFixed(1) : '0';
                        return (
                          <tr key={idx}>
                            <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{idx + 1}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 8px', fontWeight: 600 }}>{s.name}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', fontStyle: 'italic' }}>{s.type}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{s.laki}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{s.perempuan}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center', fontWeight: 700 }}>{s.total}</td>
                            <td style={{ border: '1px solid #000', padding: '5px 8px', textAlign: 'center' }}>{pct}%</td>
                          </tr>
                        );
                      })}
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td colSpan={3} style={{ border: '2px solid #000', padding: '7px 8px', textAlign: 'center' }}>TOTAL KESELURUHAN</td>
                      <td style={{ border: '2px solid #000', padding: '7px 8px', textAlign: 'center' }}>{stats.totalL}</td>
                      <td style={{ border: '2px solid #000', padding: '7px 8px', textAlign: 'center' }}>{stats.totalP}</td>
                      <td style={{ border: '2px solid #000', padding: '7px 8px', textAlign: 'center', color: '#059669' }}>{stats.total}</td>
                      <td style={{ border: '2px solid #000', padding: '7px 8px', textAlign: 'center' }}>100%</td>
                    </tr>
                  </tbody>
                </table>

                {/* Tanda Tangan */}
                <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between', textAlign: 'center', fontSize: '10pt', breakInside: 'avoid' }}>
                  <div style={{ width: 220 }}>
                    <div>Mengetahui,</div>
                    <div style={{ fontWeight: 700 }}>Kepala MTs Almaarif 01</div>
                    <div style={{ height: 60 }}></div>
                    <div style={{ fontWeight: 700, textDecoration: 'underline' }}>Dwi Retno Palupi, M.Pd.</div>
                  </div>

                  <div style={{ width: 220 }}>
                    <div>Singosari, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                    <div style={{ fontWeight: 700 }}>Ketua Panitia SPMB</div>
                    <div style={{ height: 60 }}></div>
                    <div style={{ fontWeight: 700, textDecoration: 'underline' }}>( .................................... )</div>
                  </div>
                </div>
              </div>

              {/* Action Buttons inside Modal */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
                <button
                  type="button"
                  style={{
                    background: '#16a34a',
                    color: 'white',
                    border: 'none',
                    padding: '9px 20px',
                    borderRadius: 8,
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8
                  }}
                  onClick={() => window.print()}
                >
                  <i className="fas fa-print"></i> Cetak / Simpan PDF
                </button>
                <button
                  type="button"
                  style={{
                    background: '#64748b',
                    color: 'white',
                    border: 'none',
                    padding: '9px 16px',
                    borderRadius: 8,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                  onClick={() => setShowPrintModal(false)}
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
