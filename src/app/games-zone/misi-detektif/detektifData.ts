export type EvidenceType = 'dokumen' | 'sandi' | 'deduksi' | 'forensik';

export interface DetectiveGadget {
  id: string;
  name: string;
  icon: string;
  desc: string;
  effect: 'clue' | 'time' | 'double';
  color: string;
}

export interface DetectiveTeam {
  id: string;
  name: string;
  badgeTitle: string;
  color: string;
  bgLight: string;
  borderColor: string;
  avatarIcon: string;
  score: number;
  solvedCount: number;
  wrongCount: number;
  members: string;
  gadgets: DetectiveGadget[];
}

export interface EvidenceFile {
  id: string;
  caseId: string;
  codeNumber: string; // e.g. "BUKTI #01"
  title: string;
  type: EvidenceType;
  difficulty: 'Mudah' | 'Sedang' | 'Sulit' | 'Master';
  points: number;
  timeLimit: number;
  // Document / Artifact display
  documentHeader?: string;
  documentSource?: string;
  documentText: string;
  // Cipher specific
  cipherText?: string;
  cipherHint?: string;
  cipherKeyCode?: string; // Short code to unlock padlock if typed
  // Progressive Deduction specific (3 progressive clues)
  progressiveClues?: string[];
  // Main question & answer
  question: string;
  clue: string;
  answer: string;
  explanation: string;
}

export interface CaseChapter {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  era: string;
  icon: string;
  accentColor: string;
  bgGradient: string;
  briefing: string;
  vaultCodeWord: string;
}

export interface DetectiveLog {
  id: string;
  timestamp: string;
  teamName: string;
  teamColor: string;
  text: string;
  type: 'solve' | 'fail' | 'gadget' | 'system' | 'steal';
}

export interface DetectiveSession {
  id: string;
  name: string;
  kelas: string;
  mapel: string;
  savedAt: string;
  selectedCaseId: string;
  currentTurn: number;
  round: number;
  teams: DetectiveTeam[];
  solvedEvidenceIds: string[];
  customEvidences: EvidenceFile[];
  logs: DetectiveLog[];
  winnerTeamId?: string;
}

export interface DetectiveSaveSlot {
  id: string;
  name: string;
  date: string;
  session: DetectiveSession;
}

export const INITIAL_GADGETS: DetectiveGadget[] = [
  {
    id: 'gadget-lens',
    name: 'Lensa Forensik',
    icon: 'fa-search-plus',
    desc: 'Membuka petunjuk rahasia tanpa pengurangan poin',
    effect: 'clue',
    color: '#38bdf8'
  },
  {
    id: 'gadget-uv',
    name: 'Senter UV +45d',
    icon: 'fa-flashlight',
    desc: 'Menambah waktu investigasi +45 detik',
    effect: 'time',
    color: '#a855f7'
  },
  {
    id: 'gadget-badge',
    name: 'Lencana Emas 2x',
    icon: 'fa-certificate',
    desc: 'Menggandakan poin (2x lipat) jika berhasil memecahkan bukti ini',
    effect: 'double',
    color: '#f59e0b'
  }
];

export const INITIAL_DETECTIVE_TEAMS: DetectiveTeam[] = [
  {
    id: 'squad-1',
    name: 'Skuad Rajawali Emas',
    badgeTitle: 'Divisi Arsip Kuno',
    color: '#f59e0b',
    bgLight: 'rgba(245, 158, 11, 0.14)',
    borderColor: '#fbbf24',
    avatarIcon: 'fa-user-secret',
    score: 0,
    solvedCount: 0,
    wrongCount: 0,
    members: 'Kelompok Detektif 1',
    gadgets: [...INITIAL_GADGETS]
  },
  {
    id: 'squad-2',
    name: 'Skuad Serigala Siber',
    badgeTitle: 'Divisi Forensik Teks',
    color: '#38bdf8',
    bgLight: 'rgba(56, 189, 248, 0.14)',
    borderColor: '#7dd3fc',
    avatarIcon: 'fa-glasses',
    score: 0,
    solvedCount: 0,
    wrongCount: 0,
    members: 'Kelompok Detektif 2',
    gadgets: [...INITIAL_GADGETS]
  },
  {
    id: 'squad-3',
    name: 'Skuad Harimau Kencana',
    badgeTitle: 'Divisi Kriptografi',
    color: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.14)',
    borderColor: '#34d399',
    avatarIcon: 'fa-fingerprint',
    score: 0,
    solvedCount: 0,
    wrongCount: 0,
    members: 'Kelompok Detektif 3',
    gadgets: [...INITIAL_GADGETS]
  },
  {
    id: 'squad-4',
    name: 'Skuad Garuda Merah',
    badgeTitle: 'Divisi Taktis Sejarah',
    color: '#ef4444',
    bgLight: 'rgba(239, 68, 68, 0.14)',
    borderColor: '#f87171',
    avatarIcon: 'fa-shield-alt',
    score: 0,
    solvedCount: 0,
    wrongCount: 0,
    members: 'Kelompok Detektif 4',
    gadgets: [...INITIAL_GADGETS]
  }
];

export const CASE_CHAPTERS: CaseChapter[] = [
  {
    id: 'all',
    code: 'OPERASI GABUNGAN',
    title: 'Semua Berkas Kasus (20 Bukti Misteri)',
    subtitle: 'Gabungan seluruh misteri Sejarah Nusantara, Peradaban Islam, & Literasi Kritis',
    era: 'Lintas Zaman',
    icon: 'fa-globe-asia',
    accentColor: '#f59e0b',
    bgGradient: 'linear-gradient(135deg, #451a03 0%, #1e1b4b 100%)',
    briefing: 'Brankas Arsip Nasional terkunci! Keempat Skuad Detektif harus menganalisis 20 berkas bukti lintas zaman, memecahkan sandi rahasia, dan mengungkap kebenaran dokumen sejarah maupun literasi modern.',
    vaultCodeWord: 'NUSANTARA'
  },
  {
    id: 'case-nusantara',
    code: 'KASUS #01',
    title: 'Misteri Manuskrip & Kerajaan Nusantara',
    subtitle: 'Analisis Prasasti, Sumpah Palapa, & Jalur Rempah Maritim',
    era: 'Abad ke-7 s.d. ke-16 M',
    icon: 'fa-scroll',
    accentColor: '#d97706',
    bgGradient: 'linear-gradient(135deg, #78350f 0%, #451a03 100%)',
    briefing: 'Sejumlah fragmen lontar dan catatan pelayaran kuno ditemukan di sebuah peti kayu jati. Analisis isi teks prasasti dan pecahkan sandi kerajaan untuk membuka segel sejarah Nusantara!',
    vaultCodeWord: 'MAJAPAHIT'
  },
  {
    id: 'case-kemerdekaan',
    code: 'KASUS #02',
    title: 'Sandi Rahasia Kemerdekaan RI',
    subtitle: 'Investigasi Dokumen Pergerakan Nasional & Detik-Detik Proklamasi',
    era: '1908 – 1949',
    icon: 'fa-flag',
    accentColor: '#ef4444',
    bgGradient: 'linear-gradient(135deg, #7f1d1d 0%, #450a0a 100%)',
    briefing: 'Komunikasi radio bawah tanah para pejuang kemerdekaan disadap! Tugas detektif adalah memverifikasi keaslian naskah sejarah, mendeteksi pemalsuan tahun, dan memecahkan kode kurir pejuang.',
    vaultCodeWord: 'MERDEKA45'
  },
  {
    id: 'case-islam',
    code: 'KASUS #03',
    title: 'Jejak Emas Ilmuwan Baitul Hikmah',
    subtitle: 'Misteri Manuskrip Sains Islam & Tokoh Peradaban Dunia',
    era: 'Abad ke-8 s.d. ke-14 M',
    icon: 'fa-mosque',
    accentColor: '#10b981',
    bgGradient: 'linear-gradient(135deg, #065f46 0%, #022c22 100%)',
    briefing: 'Halaman-halaman penting dari perpustakaan agung Baitul Hikmah hilang! Gunakan petunjuk deduksi bertahap dan sandi angka Al-Khawarizmi untuk mengidentifikasi para ilmuwan peletak dasar sains modern.',
    vaultCodeWord: 'ALJABAR'
  },
  {
    id: 'case-literasi',
    code: 'KASUS #04',
    title: 'Investigasi Hoaks & Literasi Kritis',
    subtitle: 'Bedah Artikel Ilmiah, Deteksi Manipulasi Data, & Logika Bahasa',
    era: 'Era Digital Modern',
    icon: 'fa-newspaper',
    accentColor: '#38bdf8',
    bgGradient: 'linear-gradient(135deg, #0c4a6e 0%, #082f49 100%)',
    briefing: 'Sindikat disinformasi menyebarkan artikel menyesatkan dan grafik manipulatif! Skuad Detektif harus menggunakan nalar literasi kritis untuk membedakan fakta vs opini dan membongkar kebohongan teks.',
    vaultCodeWord: 'VERIFIKASI'
  }
];

export const DEFAULT_EVIDENCE_FILES: EvidenceFile[] = [
  // ==================== KASUS #01: NUSANTARA ====================
  {
    id: 'ev-01',
    caseId: 'case-nusantara',
    codeNumber: 'BUKTI #01',
    title: 'Fragmen Lontar Sumpah Sang Mahapatih',
    type: 'dokumen',
    difficulty: 'Sedang',
    points: 120,
    timeLimit: 75,
    documentHeader: 'ARSIP LONTAR KERAJAAN • TAHUN 1336 M (1258 SAKA)',
    documentSource: 'Kutipan Kitab Pararaton - Balairung Trowulan',
    documentText: `"Sira Gajah Mada patih Amangkubhumi tan ayun amuktia palapa, sira Gajah Mada: Lamun huwus kalah Nusantara isun amukti palapa, lamun kalah ring Gurun, ring Seran, Tanjung Pura, ring Haru, ring Pahang, Dompo, ring Bali, Sunda, Palembang, Tumasik, samana isun amukti palapa."`,
    question: 'Berdasarkan analisis dokumen Kitab Pararaton di atas, apa makna simbolis dari ungkapan "tan ayun amuktia palapa" (tidak akan menikmati palapa) yang diucapkan Gajah Mada, dan wilayah negara modern mana yang dulunya disebut "Tumasik"?',
    clue: 'Amukti Palapa berarti menikmati kesenangan/istirahat/rempah, sedangkan Tumasik adalah pulau kecil di ujung selatan Semenanjung Malaya.',
    answer: 'Berpuasa/pantang menikmati kesenangan (istirahat) sebelum menyatukan Nusantara; dan "Tumasik" adalah Singapura.',
    explanation: 'Gajah Mada bersumpah tidak akan menikmati kenyamanan duniawi sebelum seluruh wilayah kepulauan Nusantara bersatu di bawah Majapahit. Nama "Tumasik" (Temasek) dalam naskah tersebut merujuk pada wilayah Singapura saat ini.'
  },
  {
    id: 'ev-02',
    caseId: 'case-nusantara',
    codeNumber: 'BUKTI #02',
    title: 'Sandi Pelayaran Kapal Jung Sriwijaya',
    type: 'sandi',
    difficulty: 'Sedang',
    points: 140,
    timeLimit: 90,
    documentHeader: 'PESAN RAHASIA SYAHBANDAR • SELAT MALAKA',
    documentSource: 'Papan Kayu Terukir Sandi Geser (+3)',
    documentText: 'Para pedagang rempah menemukan papan kayu berisi sandi geser mundur 3 huruf (Setiap huruf pada sandi digeser MUNDUR 3 langkah di abjad A-Z untuk menemukan huruf aslinya, contoh: D -> A, E -> B).',
    cipherText: 'V U L Z L M D B D',
    cipherHint: 'Geser setiap huruf MUNDUR 3 langkah di abjad: V(-3)=S, U(-3)=R, L(-3)=I...',
    cipherKeyCode: 'SRIWIJAYA',
    question: 'Pecahkan kode sandi "V U L Z L M D B D" di atas untuk mengungkap nama kemaharajaan maritim penguasa jalur perdagangan Selat Malaka!',
    clue: 'Huruf pertama V dikurangi 3 huruf adalah S. Huruf kedua U dikurangi 3 adalah R.',
    answer: 'SRIWIJAYA',
    explanation: 'Dengan menggeser mundur 3 huruf: V->S, U->R, L->I, Z->W, L->I, M->J, D->A, B->Y, D->A = SRIWIJAYA, kerajaan maritim besar yang berpusat di Palembang sejak abad ke-7 M.'
  },
  {
    id: 'ev-03',
    caseId: 'case-nusantara',
    codeNumber: 'BUKTI #03',
    title: 'Misteri Komoditas Emas Hijau Maluku',
    type: 'deduksi',
    difficulty: 'Mudah',
    points: 100,
    timeLimit: 60,
    documentHeader: 'BERKAS DEDUKSI 3 PETUNJUK • JALUR REMPAH',
    documentSource: 'Catatan Kargo Pelabuhan Ternate & Banda Neira',
    documentText: 'Identifikasi komoditas sejarah yang mengubah peta penjelajahan samudra dunia berdasarkan 3 bukti bertahap berikut:',
    progressiveClues: [
      'BUKTI PRIMER #1: Pada abad ke-16, komoditas ini nilainya di pasar Eropa lebih mahal daripada emas dengan berat yang sama, dan hanya tumbuh secara endemik di gugusan pulau vulkanik kecil di Kepulauan Maluku.',
      'BUKTI SEKUNDER #2: Demi memonopoli tanaman ini di Kepulauan Banda, VOC rela menukar Pulau Run (di Maluku) dengan Pulau Manhattan (kini New York, Amerika Serikat) kepada Inggris dalam Perjanjian Breda tahun 1667.',
      'BUKTI KUNCI #3: Biji buah ini menghasilkan dua rempah sekaligus: bijinya sendiri dan selaput merah pembungkus bijinya yang disebut "Fuli" (Mace).'
    ],
    question: 'Rempah legendaris Nusantara apakah yang dimaksud oleh ketiga bukti forensik di atas?',
    clue: 'Tumbuh subur di Kepulauan Banda (Banda Neira) dan bijinya keras beraroma hangat.',
    answer: 'Buah Pala (dan Cengkeh / Fokus utama: Pala / Nutmeg)',
    explanation: 'Buah Pala (Myristica fragrans) adalah rempah endemik Kepulauan Banda yang memicu perebutan besar bangsa Eropa hingga melahirkan Perjanjian Breda (1667) yang menukar Pulau Run dengan Manhattan.'
  },
  {
    id: 'ev-04',
    caseId: 'case-nusantara',
    codeNumber: 'BUKTI #04',
    title: 'Forensik Prasasti Yupa Kutai',
    type: 'forensik',
    difficulty: 'Sulit',
    points: 150,
    timeLimit: 75,
    documentHeader: 'UJI KEASLIAN DOKUMEN SEJARAH • KALIMANTAN TIMUR',
    documentSource: 'Laporan Kurator Museum (Terdapat 2 Kesalahan Fakta)',
    documentText: `"Prasasti Yupa dari Kerajaan Kutai Martadipura merupakan bukti tertulis tertua di Indonesia yang berasal dari abad ke-4 Masehi. Prasasti berbentuk tiang batu ini ditulis menggunakan Aksara Jawa Kuno dan Bahasa Melayu Kuno. Di dalamnya tertulis silsilah Raja Kudungga, putranya Aswawarman, serta cucunya Raja Mulawarman yang menyedekahkan 20.000 ekor sapi kepada kaum Brahmana."`,
    question: 'Detektif! Dalam laporan kurator di atas terdapat KESALAHAN FATAL mengenai aksara dan bahasa yang digunakan pada Prasasti Yupa. Temukan kesalahan tersebut dan sebutkan aksara serta bahasa yang benar!',
    clue: 'Prasasti Yupa belum menggunakan aksara Jawa maupun bahasa Melayu, melainkan aksara dari India Selatan dan bahasa kitab suci Hindu.',
    answer: 'Salah pada "Aksara Jawa Kuno dan Bahasa Melayu Kuno". Yang benar adalah Aksara Pallawa dan Bahasa Sanskerta.',
    explanation: 'Prasasti Yupa (abad ke-4 M) ditulis menggunakan Aksara Pallawa dan Bahasa Sanskerta, bukan Aksara Jawa Kuno maupun Bahasa Melayu Kuno.'
  },
  {
    id: 'ev-05',
    caseId: 'case-nusantara',
    codeNumber: 'BUKTI #05',
    title: 'Jejak Sang Pangeran Diponegoro',
    type: 'deduksi',
    difficulty: 'Sedang',
    points: 130,
    timeLimit: 75,
    documentHeader: 'PROFIL TOKOH & MANUSKRIP • WARISAN DUNIA UNESCO',
    documentSource: 'Arsip Memory of the World (1825–1830)',
    documentText: 'Temukan nama tokoh pahlawan nasional dan judul naskah otobiografi yang ditulisnya berdasarkan 3 bukti berikut:',
    progressiveClues: [
      'BUKTI PRIMER #1: Beliau memimpin perang besar selama 5 tahun (1825–1830) menggunakan strategi perang gerilya yang membuat kas keuangan pemerintah kolonial Belanda nyaris bangkrut.',
      'BUKTI SEKUNDER #2: Pemicu meletusnya perlawanan adalah pemasangan patok-patok jalan secara sepihak oleh Belanda yang melewati makam leluhurnya di Tegalrejo.',
      'BUKTI KUNCI #3: Saat diasingkan ke Manado dan Makassar, beliau menulis sendiri naskah sejarah hidupnya setebal более dari 1.000 halaman berjudul "Babad ..." yang diakui UNESCO sebagai Memory of the World.'
    ],
    question: 'Siapakah nama asli (kecil/gelar) pahlawan tersebut dan di kota manakah beliau wafat serta dimakamkan?',
    clue: 'Nama kecilnya Bendara Raden Mas Mustahar (Ontowiryo), dan beliau wafat di Sulawesi Selatan.',
    answer: 'Pangeran Diponegoro (BRM Mustahar / Ontowiryo), wafat dan dimakamkan di Makassar.',
    explanation: 'Pangeran Diponegoro (lahir dengan nama BRM Mustahar / Raden Mas Ontowiryo) menulis Babad Diponegoro di pengasingan dan wafat di Benteng Rotterdam, Makassar pada 8 Januari 1855.'
  },

  // ==================== KASUS #02: KEMERDEKAAN RI ====================
  {
    id: 'ev-06',
    caseId: 'case-kemerdekaan',
    codeNumber: 'BUKTI #06',
    title: 'Anomali Naskah Ketik Proklamasi',
    type: 'forensik',
    difficulty: 'Sedang',
    points: 130,
    timeLimit: 75,
    documentHeader: 'ANALISIS FORENSIK DOKUMEN • JL. IMAM BONJOL NO. 1',
    documentSource: 'Perbandingan Naskah Klad (Tulisan Tangan) vs Naskah Otentik (Ketikan Sayuti Melik)',
    documentText: `Saat mengetik naskah Proklamasi pada dini hari 17 Agustus 1945 di rumah Laksamana Maeda, Sayuti Melik melakukan 3 perubahan redaksional dari naskah tulisan tangan Ir. Soekarno:\n1. Kata "Tempoh" diubah menjadi "Tempo"\n2. Wakil2 bangsa Indonesia diubah menjadi "Atas nama bangsa Indonesia"\n3. Penulisan tanggal diubah menjadi: "Djakarta, hari 17 boelan 8 tahoen '05"`,
    question: 'Mengapa pada naskah Proklamasi yang diketik tertulis "tahoen \'05" (tahun 05) dan bukan "tahoen \'45"? Jelaskan sistem penanggalan apa yang digunakan saat itu!',
    clue: 'Saat itu Indonesia masih berada di bawah pendudukan militer Jepang yang memiliki kalender kekaisaran sendiri.',
    answer: 'Karena menggunakan tahun penanggalan Jepang (Kouki / Jimmu), yaitu tahun 2605 (ditulis singkat \'05), yang setara dengan tahun 1945 Masehi.',
    explanation: 'Pada masa pendudukan Jepang, kalender resmi yang berlaku adalah tahun Sumera/Jimmu (660 tahun lebih awal dari Masehi). Tahun 1945 M bertepatan dengan tahun 2605 kalender Jepang, sehingga disingkat menjadi tahoen \'05.'
  },
  {
    id: 'ev-07',
    caseId: 'case-kemerdekaan',
    codeNumber: 'BUKTI #07',
    title: 'Sandi Kurir Peristiwa Rengasdengklok',
    type: 'sandi',
    difficulty: 'Sedang',
    points: 140,
    timeLimit: 90,
    documentHeader: 'TELEGRAM BAWAH TANAH PEMUDA • 16 AGUSTUS 1945',
    documentSource: 'Markas PETA Kempetai - Sandi Angka (A=1, B=2, ... Z=26)',
    documentText: 'Golongan muda mengirimkan kode lokasi tempat diamankannya Soekarno dan Hatta agar tidak terpengaruh janji Jepang. Terjemahkan urutan angka berikut menjadi huruf (A=1, B=2, C=3, dst.):',
    cipherText: '18 - 5 - 14 - 7 - 1 - 19 - 4 - 5 - 14 - 7 - 11 - 12 - 15 - 11',
    cipherHint: '1=A, 4=D, 5=E, 7=G, 11=K, 12=L, 14=N, 15=O, 18=R, 19=S',
    cipherKeyCode: 'RENGASDENGKLOK',
    question: 'Pecahkan sandi angka di atas dan jelaskan ALASAN UTAMA mengapa golongan muda membawa Soekarno-Hatta ke tempat tersebut pada 16 Agustus 1945!',
    clue: 'Nama sebuah kecamatan di Kabupaten Karawang, Jawa Barat.',
    answer: 'RENGASDENGKLOK. Alasannya untuk mendesak agar Proklamasi segera dilaksanakan oleh kekuatan bangsa Indonesia sendiri dan menjauhkan Soekarno-Hatta dari pengaruh Jepang.',
    explanation: 'Kode angka tersebut membentuk kata RENGASDENGKLOK. Golongan muda (Sukarni, Wikana, Chaerul Saleh) mengamankan Soekarno-Hatta ke sana agar proklamasi kemerdekaan tidak dilakukan melalui PPKI bentukan Jepang.'
  },
  {
    id: 'ev-08',
    caseId: 'case-kemerdekaan',
    codeNumber: 'BUKTI #08',
    title: 'Surat Kabar Penyulut Pertempuran Surabaya',
    type: 'dokumen',
    difficulty: 'Sedang',
    points: 120,
    timeLimit: 75,
    documentHeader: 'ARSIP SIARAN RADIO & SELEBARAN • SURABAYA, NOVEMBER 1945',
    documentSource: 'Ultimatum Mayor Jenderal Mansergh (9 November 1945)',
    documentText: `"Seluruh pimpinan dan pemuda Indonesia di Surabaya harus menyerahkan senjata paling lambat pukul 06.00 pagi tanggal 10 November 1945 dengan tangan di atas kepala. Apabila ultimatum ini tidak dipatuhi, tentara Sekutu akan menggempur Surabaya dari darat, laut, dan udara."`,
    question: 'Analisis sebab-akibat sejarah: Peristiwa terbunuhnya perwira tinggi Inggris siapakah pada 30 Oktober 1945 di sekitar Jembatan Merah yang memicu kemarahan Inggris hingga mengeluarkan ultimatum di atas?',
    clue: 'Seorang Brigadir Jenderal pimpinan pasukan AFNEI (Inggris) di Jawa Timur.',
    answer: 'Brigadir Jenderal A.W.S. Mallaby',
    explanation: 'Tewasnya Brigjen A.W.S. Mallaby dalam insiden baku tembak di dekat Gedung Internatio/Jembatan Merah pada 30 Oktober 1945 membuat penggantinya, Mayjen Robert Mansergh, mengeluarkan ultimatum 10 November 1945.'
  },
  {
    id: 'ev-09',
    caseId: 'case-kemerdekaan',
    codeNumber: 'BUKTI #09',
    title: 'Deduksi Tokoh Diplomasi & Pengibar Sang Saka',
    type: 'deduksi',
    difficulty: 'Mudah',
    points: 110,
    timeLimit: 60,
    documentHeader: 'BERKAS IDENTIFIKASI TOKOH BANGSA • 1928 & 1945',
    documentSource: 'Arsip Kongres Pemuda II & Pegangsaan Timur 56',
    documentText: 'Temukan sosok tokoh pemuda penting dalam sejarah Indonesia melalui 3 bukti berikut:',
    progressiveClues: [
      'BUKTI PRIMER #1: Pada peristiwa Proklamasi 17 Agustus 1945 di Pegangsaan Timur 56, beliau adalah salah satu dari tiga pemuda yang bertugas mengibarkan bendera Merah Putih bersama Abdul Latief Hendraningrat dan Tri Murti.',
      'BUKTI SEKUNDER #2: Sebelum tahun 1945, beliau juga berperan sangat penting dalam Kongres Pemuda II tanggal 28 Oktober 1928 di gedung Indonesische Clubgebouw.',
      'BUKTI KUNCI #3: Beliau adalah pencipta lagu kebangsaan "Indonesia Raya" yang memperdengarkan lagu tersebut pertama kali dengan gesekan biola!'
    ],
    question: 'Perhatikan dengan kritis Bukti #1 dan Bukti #3! Apakah pengibar bendera (Suhud Sastro Kusumo) dan pencipta lagu Indonesia Raya adalah orang yang sama? Koreksi kontradiksi pada berkas di atas!',
    clue: 'Hati-hati! Pencipta lagu Indonesia Raya wafat pada tahun 1938 (sebelum Proklamasi 1945).',
    answer: 'Kontradiksi! Pengibar bendera tahun 1945 adalah Suhud Sastro Kusumo (bersama Latief Hendraningrat & SK Trimurti), sedangkan pencipta lagu Indonesia Raya dengan biola tahun 1928 adalah W.R. Supratman (yang sudah wafat tahun 1938).',
    explanation: 'Ketelitian detektif diuji di sini! W.R. Supratman wafat di Surabaya pada 17 Agustus 1938, tujuh tahun sebelum Proklamasi. Pengibar bendera pada 17 Agustus 1945 adalah Latief Hendraningrat, Suhud Sastro Kusumo, dan S.K. Trimurti.'
  },
  {
    id: 'ev-10',
    caseId: 'case-kemerdekaan',
    codeNumber: 'BUKTI #10',
    title: 'Misteri Siaran Radio Pemerintah Darurat (PDRI)',
    type: 'dokumen',
    difficulty: 'Sulit',
    points: 150,
    timeLimit: 80,
    documentHeader: 'TELEGRAM MANDAT PRESIDEN • YOGYAKARTA, 19 DESEMBER 1948',
    documentSource: 'Arsip Agresi Militer Belanda II',
    documentText: `"Kami, Presiden Republik Indonesia, memberitahukan bahwa pada hari Minggu tanggal 19 Desember 1948 pukul 06.00 pagi Belanda telah memulai serangannya atas Ibu Kota Yogyakarta. Jika dalam keadaan pemerintah tidak dapat menjalankan kewajibannya lagi, kami menguasakan kepada Mr. Sjafruddin Prawiranegara untuk membentuk Pemerintah Darurat Republik Indonesia..."`,
    question: 'Di provinsi/kota manakah Mr. Sjafruddin Prawiranegara mendirikan Pemerintah Darurat Republik Indonesia (PDRI) untuk menyelamatkan eksistensi RI di mata dunia, dan apa nama pemancar radio gerilya di hutan Rimba Raya/Bidar Alam yang menyiarkan kabar bahwa RI masih berdiri?',
    clue: 'Berada di Sumatera Barat (Bukittinggi), dengan radio portabel AURI yang terkenal.',
    answer: 'Di Bukittinggi (Sumatera Barat); dipancarkan melalui Radio YBJ-6 (di Bidar Alam) dan Radio Rimba Raya (di Aceh).',
    explanation: 'Ketika Yogyakarta jatuh dan Soekarno-Hatta ditawan diasingkan ke Bangka, PDRI di Bukittinggi (Sumatera Barat) yang dipimpin Sjafruddin Prawiranegara menjadi bukti sah bahwa Republik Indonesia masih berdaulat.'
  },

  // ==================== KASUS #03: PERADABAN ISLAM ====================
  {
    id: 'ev-11',
    caseId: 'case-islam',
    codeNumber: 'BUKTI #11',
    title: 'Manuskrip Sang Bapak Aljabar & Algoritma',
    type: 'deduksi',
    difficulty: 'Mudah',
    points: 110,
    timeLimit: 60,
    documentHeader: 'BERKAS ILMUWAN BAITUL HIKMAH • BAGHDAD ABAD KE-9',
    documentSource: 'Katalog Perpustakaan Khalifah Al-Ma\'mun',
    documentText: 'Identifikasi ilmuwan Muslim legendaris berdasarkan 3 bukti peninggalannya berikut:',
    progressiveClues: [
      'BUKTI PRIMER #1: Beliau memperkenalkan sistem penomoran desimal (angka 0 sampai 9) ke dunia Barat sehingga angka tersebut dikenal sebagai Angka Arab.',
      'BUKTI SEKUNDER #2: Nama belakang beliau ketika dilatinkan menjadi "Algorismi", yang menjadi asal-usul istilah "Algoritma" dalam ilmu komputer modern.',
      'BUKTI KUNCI #3: Karya monumentalnya berjudul "Al-Kitab al-Mukhtasar fi Hisab al-Jabr wal-Muqabalah" melahirkan cabang matematika yang kita pelajari hingga hari ini.'
    ],
    question: 'Siapakah nama ilmuwan Muslim tersebut dan cabang matematika apa yang lahir dari judul kitabnya?',
    clue: 'Berasal dari wilayah Khawarizm (Uzbekistan) dan melahirkan ilmu Al-Jabr.',
    answer: 'Muhammad bin Musa Al-Khawarizmi, Bapak Aljabar (dan Algoritma).',
    explanation: 'Al-Khawarizmi (780–850 M) adalah matematikawan dan astronom di Baitul Hikmah Baghdad yang meletakkan dasar ilmu Aljabar (dari kata Al-Jabr) dan Algoritma.'
  },
  {
    id: 'ev-12',
    caseId: 'case-islam',
    codeNumber: 'BUKTI #12',
    title: 'Sandi Balik Kitab Kedokteran Dunia',
    type: 'sandi',
    difficulty: 'Sedang',
    points: 140,
    timeLimit: 90,
    documentHeader: 'ENKRIPSI MANUSKRIP MEDIS • ABAD KE-11 M',
    documentSource: 'Sandi Cermin Terbalik (Baca dari Kanan ke Kiri)',
    documentText: 'Sebuah kitab kedokteran yang menjadi rujukan utama universitas-universitas di Eropa selama 500 tahun disembunyikan namanya dengan sandi cermin per kata. Susun kembali hurufnya dengan membaca tiap kata dari belakang!',
    cipherText: 'NUNAQ-LA IF BITH-LA (Oleh: ANIS UNBI)',
    cipherHint: 'Balik urutan huruf tiap kata: NUNAQ-LA -> AL-QANUN...',
    cipherKeyCode: 'IBNUSINA',
    question: 'Apa nama asli kitab tersebut beserta nama ilmuwan penulisnya (baik nama Islamnya maupun julukannya di dunia Barat)?',
    clue: 'Di dunia Barat beliau dikenal dengan nama "Avicenna".',
    answer: 'Kitab Al-Qanun fi al-Thibb (The Canon of Medicine) karya Ibnu Sina (Avicenna).',
    explanation: 'Ibnu Sina (Avicenna, 980–1037 M) menulis ensiklopedia medis Al-Qanun fi al-Thibb yang menjelaskan penularan penyakit, karantina, dan farmakologi jauh sebelum kedokteran modern.'
  },
  {
    id: 'ev-13',
    caseId: 'case-islam',
    codeNumber: 'BUKTI #13',
    title: 'Eksperimen Kamar Gelap (Camera Obscura)',
    type: 'dokumen',
    difficulty: 'Sedang',
    points: 130,
    timeLimit: 75,
    documentHeader: 'CATATAN LABORATORIUM OPTIK • KAIRO, TAHUN 1015 M',
    documentSource: 'Kitab Al-Manazir (Buku Optik)',
    documentText: `"Selama berabad-abad, filsuf Yunani mengira mata manusia bisa melihat karena mata memancarkan sinar ke benda. Melalui eksperimen lubang kecil pada ruang gelap (Qamara), aku membuktikan bahwa cahayalah yang bergerak lurus memantul dari benda lalu masuk ke dalam mata manusia."`,
    question: 'Siapakah ilmuwan Muslim penulis "Kitab Al-Manazir" yang membantah teori Yunani kuno tersebut dan dari kata bahasa Arab apakah istilah "Kamera" modern berasal?',
    clue: 'Di Barat beliau dikenal sebagai Alhazen. Perhatikan kata "Qamara" pada teks.',
    answer: 'Ibnu al-Haitham (Alhazen). Istilah "Kamera" berasal dari kata bahasa Arab "Qamara" (ruang gelap / Camera Obscura).',
    explanation: 'Ibnu al-Haitham (Alhazen) dijuluki Bapak Optik Modern. Eksperimen ruang gelapnya (Qamara) menjadi dasar penciptaan kamera fotografi dan metode ilmiah eksperimental.'
  },
  {
    id: 'ev-14',
    caseId: 'case-islam',
    codeNumber: 'BUKTI #14',
    title: 'Jejak Wali Songo & Strategi Kebudayaan',
    type: 'dokumen',
    difficulty: 'Mudah',
    points: 110,
    timeLimit: 60,
    documentHeader: 'ARSIP DAKWAH NUSANTARA • JAWA ABAD KE-15',
    documentSource: 'Babad Tanah Jawi & Serat Walisana',
    documentText: `Dalam menyebarkan ajaran Islam di tanah Jawa, salah seorang Wali Songo menggunakan media pertunjukan wayang kulit dan gamelan (Sekaten). Beliau tidak meminta upah uang dari penonton yang ingin menyaksikan wayang, melainkan hanya meminta penonton mengucapkan kalimat "Kalimosodo".`,
    question: 'Siapakah nama Wali Songo yang berdakwah dengan pendekatan budaya wayang tersebut (sebutkan juga nama aslinya), dan kalimat "Kalimosodo" merupakan akulturasi dari istilah Islam apa?',
    clue: 'Putra Bupati Tuban (Arya Wilatikta) yang makamnya berada di Kadilangu, Demak.',
    answer: 'Sunan Kalijaga (Raden Said). "Kalimosodo" adalah akulturasi dari "Kalimat Syahadat".',
    explanation: 'Sunan Kalijaga (Raden Said) menggunakan wayang kulit, tembang (Lir-Ilir), dan gamelan untuk berdakwah secara damai. Jimat Kalimosodo dimaknai sebagai dua Kalimat Syahadat.'
  },
  {
    id: 'ev-15',
    caseId: 'case-islam',
    codeNumber: 'BUKTI #15',
    title: 'Forensik Peta Dunia & Kapal Terbang Andalusia',
    type: 'forensik',
    difficulty: 'Sulit',
    points: 150,
    timeLimit: 80,
    documentHeader: 'VERIFIKASI PENEMUAN SEJARAH ISLAM • CORDOBA & ISTANBUL',
    documentSource: 'Arsip Museum Sejarah Sains Islam',
    documentText: `Perhatikan 2 klaim catatan sejarah berikut:\nKLAIM A: "Pada abad ke-9 di Cordoba (Andalusia/Spanyol), ilmuwan Abbas bin Firnas berhasil melakukan uji coba terbang menggunakan sayap buatan berbulu di hadapan khalayak ramai, seribu tahun sebelum Wright Bersaudara."\nKLAIM B: "Pada tahun 1513, Laksamana Piri Reis menggambar peta dunia yang sangat akurat termasuk garis pantai Amerika Selatan karena beliau menggunakan foto satelit luar angkasa milik Kesultanan Turki Utsmani."`,
    question: 'Gunakan nalar kritis sejarahmu! Manakah klaim yang FAKTA SEJARAH dan manakah klaim yang MENGANDUNG ANAKRONISME (ketidakmungkinan zaman)? Bagaimana sebenarnya Piri Reis menyusun peta akurat tersebut pada tahun 1513?',
    clue: 'Apakah pada tahun 1513 sudah ada satelit luar angkasa?',
    answer: 'Klaim A adalah Fakta Sejarah. Klaim B mengandung anakronisme ("foto satelit luar angkasa" belum ada di abad ke-16); Piri Reis menyusun petanya dengan menggabungkan sekitar 20 peta kuno (termasuk peta pelaut Arab, Portugis, dan peta asli Christopher Columbus).',
    explanation: 'Laksamana Piri Reis menulis langsung di catatan tepi petanya tahun 1513 bahwa ia mengompilasi ~20 peta sumber dari berbagai pelaut dunia, bukan menggunakan satelit.'
  },

  // ==================== KASUS #04: LITERASI KRITIS & ANTI-HOAKS ====================
  {
    id: 'ev-16',
    caseId: 'case-literasi',
    codeNumber: 'BUKTI #16',
    title: 'Bedah Berita Hoaks: "Minum Air Garam Menyembuhkan Semua Virus"',
    type: 'forensik',
    difficulty: 'Mudah',
    points: 110,
    timeLimit: 60,
    documentHeader: 'LABORATORIUM CEK FAKTA DIGITAL • PESAN BERANTAI WHATSAPP',
    documentSource: 'Tangkapan Layar Pesan Viral',
    documentText: `"PENTING!! SEBARKAN KE 20 GRUP SEKARANG JUGA!! Menurut seorang profesor terkenal di luar negeri (yang namanya dirahasiakan oleh pihak rumah sakit), meminum 5 sendok makan garam dapur murni setiap pagi terbukti 100% mematikan seluruh virus di dalam darah dalam waktu 3 menit!! Jangan percaya dokter karena mereka menyembunyikan rahasia ini!!"`,
    question: 'Sebutkan minimal 3 CIRI BAHASA MANIPULATIF / HOAKS yang tampak jelas pada teks pesan berantai di atas, dan apa bahaya medis jika seseorang menelan 5 sendok makan garam murni sekaligus?',
    clue: 'Perhatikan penggunaan tanda seru berlebihan, sumber anonim ("profesor yang dirahasiakan"), klaim 100% instan, dan ajakan menyebarkan secara paksa.',
    answer: 'Ciri hoaks: (1) Sumber tidak jelas/anonim ("profesor yang namanya dirahasiakan"), (2) Klaim ekstrem/muluk ("100% dalam 3 menit"), (3) Nada provokatif/mendesak ("SEBARKAN KE 20 GRUP!!") & teori konspirasi. Bahaya medis: memicu hipernatremia, dehidrasi berat, hingga lonjakan tekanan darah ekstrem.',
    explanation: 'Literasi kritis mengajarkan metode SIFT: periksa otoritas sumber, waspadai klaim "100% sembuh instan", dan kenali pola bahasa emosional/provokatif pada pesan berantai.'
  },
  {
    id: 'ev-17',
    caseId: 'case-literasi',
    codeNumber: 'BUKTI #17',
    title: 'Membedakan Kalimat Fakta vs Opini dalam Teks Laporan',
    type: 'dokumen',
    difficulty: 'Sedang',
    points: 120,
    timeLimit: 70,
    documentHeader: 'ANALISIS TEKS EDITORIAL • JURNAL LINGKUNGAN MADRASAH',
    documentSource: 'Artikel "Transformasi Ruang Hijau Sekolah"',
    documentText: `(1) Berdasarkan pengukuran tim peneliti siswa pada tanggal 12 Oktober 2026, suhu rata-rata di halaman sekolah yang ditanami pohon trembesi tercatat 28,4 derajat Celcius.\n(2) Sebaliknya, area parkir beraspal tanpa pepohonan memiliki suhu mencapai 34,2 derajat Celcius pada jam yang sama.\n(3) Menurut kami, pohon trembesi adalah tanaman paling indah dan paling nyaman di dunia dibandingkan seluruh pohon lainnya.\n(4) Pemerintah daerah seharusnya memberikan sanksi paling berat kepada sekolah yang halaman depannya terasa kurang sejuk.`,
    question: 'Kelompokkan keempat kalimat bernomor di atas: manakah yang merupakan KALIMAT FAKTA dan manakah yang merupakan KALIMAT OPINI? Jelaskan indikator kebahasaannya!',
    clue: 'Fakta memuat data terukur/kuantitatif yang dapat diverifikasi, sedangkan opini memuat kata sifat subjektif ("paling indah", "menurut kami", "seharusnya").',
    answer: 'Kalimat Fakta: (1) dan (2) karena memuat data pengukuran suhu dan waktu yang objektif. Kalimat Opini: (3) dan (4) karena bersifat subjektif ("Menurut kami", "paling indah", "seharusnya", "kurang sejuk").',
    explanation: 'Kalimat (1) dan (2) menyajikan data kuantitatif hasil observasi, sedangkan kalimat (3) dan (4) menyajikan penilaian subjektif dan saran penulis.'
  },
  {
    id: 'ev-18',
    caseId: 'case-literasi',
    codeNumber: 'BUKTI #18',
    title: 'Jebakan Statistik: Korelasi Bukan Berarti Sebab-Akibat!',
    type: 'forensik',
    difficulty: 'Sulit',
    points: 150,
    timeLimit: 85,
    documentHeader: 'INVESTIGASI LOGIKA DATA & GRAFIK • JURNAL STATISTIK',
    documentSource: 'Studi Kasus Kesesatan Berpikir (Logical Fallacy)',
    documentText: `Sebuah grafik statistik di kota pantai menunjukkan data nyata bahwa: "Setiap bulan ketika angka penjualan Es Krim meningkat drastis, angka kejadian kasus sengatan matahari (sunburn) di pantai juga meningkat drastis." Berdasarkan data tersebut, seorang reporter menyimpulkan: "Makan es krim adalah penyebab utama kulit manusia terbakar sinar matahari!"`,
    question: 'Analisis kesalahan logika (logical fallacy) pada kesimpulan reporter di atas! Mengapa kedua data tersebut naik bersamaan, dan variabel tersembunyi (faktor ketiga) apakah yang sebenarnya menyebabkan keduanya naik?',
    clue: 'Apakah es krim yang membuat kulit terbakar, atau ada faktor cuaca/musim yang memicu keduanya?',
    answer: 'Kesalahan logika: Menganggap korelasi sebagai kausalitas (sebab-akibat). Faktor ketiganya adalah MUSIM PANAS / CUACA TERIK: saat cuaca sangat panas, orang lebih banyak membeli es krim sekaligus lebih banyak berjemur di pantai sehingga terkena sunburn.',
    explanation: 'Dalam literasi numerasi dan sains, "Correlation does not imply causation" (dua hal yang naik bersamaan belum tentu saling menyebabkan, melainkan dipengaruhi oleh variabel perancu/ketiga yaitu cuaca panas).'
  },
  {
    id: 'ev-19',
    caseId: 'case-literasi',
    codeNumber: 'BUKTI #19',
    title: 'Sandi Anagram Istilah Literasi Kritis',
    type: 'sandi',
    difficulty: 'Sedang',
    points: 130,
    timeLimit: 75,
    documentHeader: 'PUZZLE KRIPTOGRAFI BAHASA • LABORATORIUM BAHASA',
    documentSource: 'Sandi Anagram (Huruf Diacak)',
    documentText: 'Susun kembali huruf-huruf yang teracak berikut menjadi satu kata baku Bahasa Indonesia (10 huruf) yang berarti: "Pemeriksaan tentang kebenaran laporan, pernyataan, atau data berdasarkan bukti yang sahih":',
    cipherText: 'V - I - K - A - R - I - S - F - E - I',
    cipherHint: 'Kata ini berawalan huruf V dan berakhiran -SI (10 huruf).',
    cipherKeyCode: 'VERIFIKASI',
    question: 'Susun ke-10 huruf di atas menjadi kata yang tepat, lalu jelaskan mengapa langkah ini wajib dilakukan sebelum membagikan informasi di media sosial!',
    clue: 'V E R I F I _ _ _ _',
    answer: 'VERIFIKASI. Wajib dilakukan (tabayyun) agar kita tidak ikut menyebarkan fitnah, hoaks, atau disinformasi yang merugikan orang lain.',
    explanation: 'Verifikasi (atau dalam konsep Islam dikenal sebagai Tabayyun - QS. Al-Hujurat: 6) adalah pilar utama literasi digital untuk memastikan kebenaran informasi sebelum bertindak.'
  },
  {
    id: 'ev-20',
    caseId: 'case-literasi',
    codeNumber: 'BUKTI #20',
    title: 'Kasus Puncak: Misteri Alibi Pencurian Manuskrip Perpustakaan',
    type: 'deduksi',
    difficulty: 'Master',
    points: 180,
    timeLimit: 90,
    documentHeader: 'BERKAS INTEROGASI SAKSI • KASUS PUNCAK DETEKTIF',
    documentSource: 'Berita Acara Pemeriksaan Perpustakaan Madrasah',
    documentText: 'Sebuah ensiklopedia langka hilang dari ruang baca pada hari Jumat siang. Tiga saksi memberikan keterangan alibi berikut:',
    progressiveClues: [
      'ALIBI SAKSI A (Raka): "Saat kejadian pukul 11.45 WIB hari Jumat, saya sedang mengikuti salat Jumat berjamaah di masjid sekolah sampai pukul 12.30 WIB."',
      'ALIBI SAKSI B (Dimas): "Saya tidak masuk ke ruang perpustakaan sama sekali. Saya hanya membaca buku sejarah di teras taman sambil memotret pelangi yang muncul tepat di atas matahari pada pukul 12.00 siang bolong."',
      'ALIBI SAKSI C (Bima): "Pukul 12.05 WIB saya melihat Dimas keluar tergesa-gesa dari pintu belakang perpustakaan sambil membawa tas besar."'
    ],
    question: 'Berdasarkan hukum fisika optik dan ketelitian literasi, siapakah yang BERBOHONG dalam alibinya dan mengapa pernyataannya mustahil terjadi secara ilmiah?',
    clue: 'Perhatikan alibi Saksi B tentang posisi "pelangi tepat di atas matahari pada pukul 12.00 siang". Di manakah pelangi selalu terbentuk relatif terhadap posisi matahari?',
    answer: 'Saksi B (Dimas) berbohong! Secara fisika optik, pelangi hanya bisa terlihat membelakangi matahari (berlawanan arah dengan matahari) dengan sudut sekitar 42 derajat, sehingga MUSTAHIL muncul tepat di atas matahari pada pukul 12.00 siang.',
    explanation: 'Deduksi sempurna! Pembiasan cahaya pada tetesan hujan membentuk pelangi di arah yang berlawanan dengan matahari. Saat matahari tepat di atas kepala (pukul 12.00 siang), pelangi tidak dapat terbentuk di langit atas maupun tepat di arah matahari.'
  }
];
