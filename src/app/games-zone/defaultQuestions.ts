import { Question, Tile, PowerUpItem } from './types';

export const POWER_UP_POOL: PowerUpItem[] = [
  {
    id: 'shield',
    name: 'Perisai Kebijaksanaan',
    icon: 'fa-shield-alt',
    description: 'Menolak 1 kali penalti petak jebakan atau salah menjawab.',
    type: 'shield'
  },
  {
    id: 'boost',
    name: 'Sepatu Merkurius',
    icon: 'fa-running',
    description: 'Melompat maju langsung +2 petak pada giliran sekarang.',
    type: 'boost'
  },
  {
    id: 'time',
    name: 'Jam Pasir Kronos',
    icon: 'fa-hourglass-half',
    description: 'Menambah waktu diskusi kelompok sebanyak +60 detik saat tantangan.',
    type: 'time'
  },
  {
    id: 'multiplier',
    name: 'Kristal Poin Ganda',
    icon: 'fa-gem',
    description: 'Menggandakan perolehan Koin Energi (2x) jika jawaban berhasil benar.',
    type: 'multiplier'
  },
  {
    id: 'clue',
    name: 'Kompas Nalar',
    icon: 'fa-compass',
    description: 'Membuka petunjuk rahasia (clue) gratis dari guru saat tantangan sulit.',
    type: 'clue'
  }
];

export const BOARD_TILES: Tile[] = [
  { id: 0, type: 'start', title: 'Pantai Pendaratan', zone: 1, zoneName: 'Pesisir Pendaratan', description: 'Titik awal ekspedisi keempat tim penjelajah nalar.', icon: 'fa-flag-checkered', color: '#10b981' },
  { id: 1, type: 'quiz', title: 'Pohon Pengukur Waktu', zone: 1, zoneName: 'Pesisir Pendaratan', description: 'Tantangan Nalar Sains', icon: 'fa-tree', color: '#0ea5e9' },
  { id: 2, type: 'chest', title: 'Peti Karang Tua', zone: 1, zoneName: 'Pesisir Pendaratan', description: 'Dapatkan Kartu Bantuan Ekspedisi', icon: 'fa-gift', color: '#f59e0b' },
  { id: 3, type: 'quiz', title: 'Teka-Teki Bayangan Mentari', zone: 1, zoneName: 'Pesisir Pendaratan', description: 'Tantangan Nalar Sains', icon: 'fa-sun', color: '#0ea5e9' },
  { id: 4, type: 'duel', title: 'Arena Adu Nalar Cepat', zone: 1, zoneName: 'Pesisir Pendaratan', description: 'Duel Rebutan Antar Kelompok!', icon: 'fa-bolt', color: '#f97316' },
  { id: 5, type: 'quiz', title: 'Misteri Botol Terapung', zone: 1, zoneName: 'Hutan Algoritma', description: 'Tantangan Nalar Sains', icon: 'fa-flask', color: '#0ea5e9' },
  { id: 6, type: 'hazard', title: 'Rawa Lendir Membingungkan', zone: 1, zoneName: 'Hutan Algoritma', description: 'Pecahkan teka-teki kilat atau mundur 1 langkah!', icon: 'fa-exclamation-triangle', color: '#ef4444' },
  { id: 7, type: 'quiz', title: 'Pola Jejak Kaki Purba', zone: 1, zoneName: 'Hutan Algoritma', description: 'Tantangan Pola & Matematika Kritis', icon: 'fa-paw', color: '#0ea5e9' },
  { id: 8, type: 'chest', title: 'Peti Rahasia Rimba', zone: 1, zoneName: 'Hutan Algoritma', description: 'Dapatkan Kartu Bantuan Ekspedisi', icon: 'fa-gift', color: '#f59e0b' },
  { id: 9, type: 'quiz', title: 'Simfoni Suara Hutan', zone: 1, zoneName: 'Hutan Algoritma', description: 'Tantangan Akustik & Getaran Bunyi', icon: 'fa-music', color: '#0ea5e9' },
  { id: 10, type: 'gatekeeper', title: 'Gerbang Penjaga Zona 1', zone: 1, zoneName: 'Gerbang Batu Sphinx', description: 'Boss Challenge: Membuka Gerbang Hutan!', icon: 'fa-dungeon', color: '#8b5cf6' },

  { id: 11, type: 'quiz', title: 'Jembatan Tali Berat Seimbang', zone: 2, zoneName: 'Sungai Fisika Terapan', description: 'Tantangan Mekanika & Keseimbangan', icon: 'fa-balance-scale', color: '#0ea5e9' },
  { id: 12, type: 'chest', title: 'Peti Air Terjun Biru', zone: 2, zoneName: 'Sungai Fisika Terapan', description: 'Dapatkan Kartu Bantuan Ekspedisi', icon: 'fa-gift', color: '#f59e0b' },
  { id: 13, type: 'quiz', title: 'Teka-Teki Kincir Aliran Air', zone: 2, zoneName: 'Sungai Fisika Terapan', description: 'Tantangan Tekanan & Aliran Fluida', icon: 'fa-water', color: '#0ea5e9' },
  { id: 14, type: 'duel', title: 'Arena Adu Argumen Cepat', zone: 2, zoneName: 'Sungai Fisika Terapan', description: 'Duel Rebutan Antar Kelompok!', icon: 'fa-bolt', color: '#f97316' },
  { id: 15, type: 'quiz', title: 'Lensa Embun Pagi', zone: 2, zoneName: 'Rawa Logika', description: 'Tantangan Optik & Pembiasan Cahaya', icon: 'fa-eye', color: '#0ea5e9' },
  { id: 16, type: 'hazard', title: 'Kabut Gas Berat Menyesatkan', zone: 2, zoneName: 'Rawa Logika', description: 'Analisis kerapatan massa gas!', icon: 'fa-smog', color: '#ef4444' },
  { id: 17, type: 'quiz', title: 'Paradoks Jam Bandul', zone: 2, zoneName: 'Rawa Logika', description: 'Tantangan Periode & Gravitasi', icon: 'fa-clock', color: '#0ea5e9' },
  { id: 18, type: 'chest', title: 'Peti Lumut Berkilau', zone: 2, zoneName: 'Rawa Logika', description: 'Dapatkan Kartu Bantuan Ekspedisi', icon: 'fa-gift', color: '#f59e0b' },
  { id: 19, type: 'quiz', title: 'Teka-Teki Termometer Alami', zone: 2, zoneName: 'Rawa Logika', description: 'Tantangan Kalor & Pemuaian', icon: 'fa-thermometer-half', color: '#0ea5e9' },
  { id: 20, type: 'gatekeeper', title: 'Gerbang Penjaga Zona 2', zone: 2, zoneName: 'Kuil Air Terjun Abadi', description: 'Boss Challenge: Membuka Aliran Bendungan!', icon: 'fa-dungeon', color: '#8b5cf6' },

  { id: 21, type: 'quiz', title: 'Gua Kristal Pembias Cahaya', zone: 3, zoneName: 'Tebing Kimia Kristal', description: 'Tantangan Sudut Pantul Spektrum', icon: 'fa-gem', color: '#0ea5e9' },
  { id: 22, type: 'chest', title: 'Peti Tambang Emas Purba', zone: 3, zoneName: 'Tebing Kimia Kristal', description: 'Dapatkan Kartu Bantuan Ekspedisi', icon: 'fa-gift', color: '#f59e0b' },
  { id: 23, type: 'quiz', title: 'Uji Asam Basa Alami Tanaman', zone: 3, zoneName: 'Tebing Kimia Kristal', description: 'Tantangan Indikator Alami Kimia', icon: 'fa-vial', color: '#0ea5e9' },
  { id: 24, type: 'duel', title: 'Adu Nalar Menyeberang Tebing', zone: 3, zoneName: 'Tebing Kimia Kristal', description: 'Duel Rebutan Antar Kelompok!', icon: 'fa-bolt', color: '#f97316' },
  { id: 25, type: 'quiz', title: 'Teka-Teki Campuran Zat Murni', zone: 3, zoneName: 'Kawah Belerang Hangat', description: 'Tantangan Pemisahan Campuran', icon: 'fa-filter', color: '#0ea5e9' },
  { id: 26, type: 'hazard', title: 'Asap Geiser Belerang', zone: 3, zoneName: 'Kawah Belerang Hangat', description: 'Pecahkan teka-teki gas atau mundur 1 petak!', icon: 'fa-fire-alt', color: '#ef4444' },
  { id: 27, type: 'quiz', title: 'Kerapatan Batu Meteorit', zone: 3, zoneName: 'Kawah Belerang Hangat', description: 'Tantangan Massa Jenis & Archimedes', icon: 'fa-meteor', color: '#0ea5e9' },
  { id: 28, type: 'chest', title: 'Peti Fosil Purba', zone: 3, zoneName: 'Kawah Belerang Hangat', description: 'Dapatkan Kartu Bantuan Ekspedisi', icon: 'fa-gift', color: '#f59e0b' },
  { id: 29, type: 'quiz', title: 'Misteri Magnet Bumi Lembah', zone: 3, zoneName: 'Kawah Belerang Hangat', description: 'Tantangan Medan Magnet & Arah Mata Angin', icon: 'fa-magnet', color: '#0ea5e9' },
  { id: 30, type: 'gatekeeper', title: 'Gerbang Penjaga Zona 3', zone: 3, zoneName: 'Tangga Langit Berawan', description: 'Boss Challenge: Sandi Aksara Kuno!', icon: 'fa-dungeon', color: '#8b5cf6' },

  { id: 31, type: 'quiz', title: 'Jalan Setapak Gravitasi Nol', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Tantangan Nalar Hukum Newton', icon: 'fa-rocket', color: '#0ea5e9' },
  { id: 32, type: 'chest', title: 'Peti Pusaka Langit', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Dapatkan Kartu Bantuan Ekspedisi', icon: 'fa-gift', color: '#f59e0b' },
  { id: 33, type: 'quiz', title: 'Paradoks Dua Jam Atom', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Tantangan Relativitas Waktu & Logika', icon: 'fa-hourglass-end', color: '#0ea5e9' },
  { id: 34, type: 'duel', title: 'Duel Cakar Naga Terakhir', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Duel Rebutan Penentu Koin Puncak!', icon: 'fa-bolt', color: '#f97316' },
  { id: 35, type: 'quiz', title: 'Rantai Ekosistem Melayang', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Tantangan Keseimbangan Biosfer', icon: 'fa-leaf', color: '#0ea5e9' },
  { id: 36, type: 'hazard', title: 'Angin Puyuh Nalar Tinggi', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Ujian konsentrasi kelompok!', icon: 'fa-wind', color: '#ef4444' },
  { id: 37, type: 'quiz', title: 'Teka-Teki Saklar Rahasia', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Tantangan Rangkaian Listrik Logis', icon: 'fa-lightbulb', color: '#0ea5e9' },
  { id: 38, type: 'chest', title: 'Peti Mahkota Pengetahuan', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Dapatkan Kartu Bantuan Terkuat', icon: 'fa-gift', color: '#f59e0b' },
  { id: 39, type: 'quiz', title: 'Teka-Teki Bintang Penuntun', zone: 4, zoneName: 'Puncak Kebijaksanaan', description: 'Tantangan Astronomi & Navigasi', icon: 'fa-star', color: '#0ea5e9' },
  { id: 40, type: 'finish', title: 'Kuil Mahkota Kebijaksanaan', zone: 4, zoneName: 'Takhta Pemenang', description: 'PUNCAK EKSPEDISI: Penentuan Sang Juara Sejati!', icon: 'fa-crown', color: '#eab308' }
];

export const DEFAULT_QUESTIONS: Question[] = [
  // ZONA 1 (Level Dasar & Observasi Kritis)
  {
    id: 'q1',
    title: 'Teka-Teki Es & Air Penuh',
    category: 'Sains Eksperimen',
    difficulty: 'Mudah',
    points: 100,
    bonusSteps: 1,
    question: 'Sebuah gelas diisi air dingin sampai pas di bibir gelas, lalu di dalamnya diapungkan sebuah bongkahan es batu besar yang sebagian menonjol keluar. Ketika seluruh es batu mencair sempurna, apakah airnya akan tumpah, berkurang, atau tetap pas di bibir gelas? Diskusikan alasannya secara ilmiah!',
    contextClue: 'Ingat prinsip Hukum Archimedes dan volume air saat membeku vs mencair.',
    correctAnswer: 'Air TIDAK akan tumpah (tetap pas persis di bibir gelas).',
    explanation: 'Ketika es terapung, es menggantikan volume air yang massanya sama persis dengan massa es tersebut (Hukum Archimedes). Saat es mencair menjadi air cair, volumenya menyusut persis mengisi ruang rongga air yang sebelumnya ia gantikan saat masih terapung. Sehingga permukaan air tetap konstan.'
  },
  {
    id: 'q2',
    title: 'Misteri 3 Saklar & 1 Lampu',
    category: 'Logika & Nalar',
    difficulty: 'Menantang',
    points: 150,
    bonusSteps: 2,
    question: 'Di lantai 1 ada 3 buah saklar (A, B, C). Hanya ada 1 saklar yang menyalakan lampu pijar di lantai 2. Anda berada di lantai 1, dan lampu di lantai 2 tertutup pintu rapat. Anda hanya diizinkan naik ke lantai 2 SATU KALI SAJA untuk memeriksa. Bagaimana cara memastikan saklar mana yang benar-benar tersambung ke lampu?',
    contextClue: 'Lampu pijar tidak hanya menghasilkan cahaya, tetapi juga menghasilkan bentuk energi lain.',
    correctAnswer: 'Nyalakan saklar A selama 10 menit, lalu matikan saklar A dan segera nyalakan saklar B. Naiklah ke lantai 2.',
    explanation: 'Jika lampu menyala, berarti saklar B. Jika lampu mati tapi bohlamnya PANAS saat disentuh, berarti saklar A. Jika lampu mati dan bohlamnya DINGIN, berarti saklar C. Dengan memanfaatkan energi panas lampu, 1 kali kunjungan sudah cukup pasti!'
  },
  {
    id: 'q3',
    title: 'Teka-Teki Kapal Tenggelam & Paku',
    category: 'Sains Eksperimen',
    difficulty: 'Mudah',
    points: 100,
    bonusSteps: 1,
    question: 'Sebuah paku besi kecil berbobot 5 gram langsung tenggelam ketika dijatuhkan ke laut. Tetapi kapal induk perang berbobot 50.000 ton yang terbuat dari baja yang sama bisa mengapung di atas laut. Jelaskan mengapa hal ini terjadi berdasarkan konsep sains fisika!',
    contextClue: 'Perhatikan bentuk paku pejal dibandingkan bentuk lambung kapal yang berongga udara.',
    correctAnswer: 'Karena Massa Jenis Rata-Rata kapal induk lebih kecil daripada massa jenis air laut.',
    explanation: 'Kapal memiliki lambung yang berongga sangat besar berisi udara. Meskipun baja sangat padat, volume total kapal yang sangat besar membuat massa jenis rata-ratanya (Massa / Volume) jauh lebih kecil dari massa jenis air. Sedangkan paku pejal tidak memiliki rongga, sehingga massa jenisnya lebih besar dari air laut.'
  },
  {
    id: 'q4',
    title: 'Paradoks Menimbang Kucing & Anjing',
    category: 'Matematika Kritis',
    difficulty: 'Sedang',
    points: 120,
    bonusSteps: 1,
    question: 'Kucing + Bebek = 10 kg. Bebek + Anjing = 20 kg. Kucing + Anjing = 24 kg. Berapa kilogram total berat Kucing + Bebek + Anjing jika ditimbang bersamaan di satu timbangan?',
    contextClue: 'Jumlahkan ketiga persamaan sekaligus, perhatikan berapa kali masing-masing hewan muncul.',
    correctAnswer: '27 kg (Kucing = 7 kg, Bebek = 3 kg, Anjing = 17 kg)',
    explanation: 'Jika dijumlahkan semua: (Kucing+Bebek) + (Bebek+Anjing) + (Kucing+Anjing) = 10 + 20 + 24 = 54 kg. Di sini setiap hewan terhitung 2 kali (2 Kucing + 2 Bebek + 2 Anjing = 54 kg). Maka total ketiganya adalah 54 / 2 = 27 kg.'
  },
  {
    id: 'q5',
    title: 'Eksperimen Dua Balon Udara',
    category: 'Sains Eksperimen',
    difficulty: 'Sedang',
    points: 120,
    bonusSteps: 1,
    question: 'Dua balon identik digantung berdampingan dengan jarak 5 cm. Jika seorang siswa meniup kencang udara di celah sempit TEPAT DI ANTARA kedua balon tersebut, apakah kedua balon akan saling menjauh atau justru saling mendekat menempel? Jelaskan hukum fisikanya!',
    contextClue: 'Ingat Hukum Bernoulli tentang kecepatan fluida udara dan tekanan!',
    correctAnswer: 'Kedua balon akan SALING MENDEKAT (saling menempel).',
    explanation: 'Hukum Bernoulli menyatakan: semakin cepat aliran fluida (udara), maka tekanannya semakin rendah. Ketika ditiup kencang, tekanan udara di antara kedua balon menurun drastis. Tekanan udara di bagian luar balon yang lebih tinggi mendorong kedua balon ke dalam hingga saling mendekat.'
  },

  // ZONA 2 (Fisika Terapan & Rawa Logika)
  {
    id: 'q6',
    title: 'Misteri Botol Hangat vs Botol Dingin',
    category: 'Sains Eksperimen',
    difficulty: 'Sedang',
    points: 130,
    bonusSteps: 1,
    question: 'Di meja kelas diletakkan segelas es teh manis. Beberapa menit kemudian, bagian dinding luar gelas dipenuhi butiran-butiran air (basah). Dari manakah butiran air di dinding luar tersebut berasal? Apakah merembes dari es teh di dalam gelas?',
    contextClue: 'Perhatikan udara di sekitar gelas yang mengandung uap air tak kasat mata.',
    correctAnswer: 'Bukan dari dalam gelas, melainkan dari proses KONDENSASI (pengembunan) uap air di udara sekitar gelas.',
    explanation: 'Udara di sekitar kita mengandung uap air hangat. Ketika uap air ini bersentuhan dengan dinding gelas yang suhunya sangat dingin, uap air melepaskan kalor dan suhunya turun hingga mencapai titik embun, lalu berubah wujud menjadi tetesan air cair (kondensasi).'
  },
  {
    id: 'q7',
    title: 'Teka-Teki Dua Lilin Tertutup',
    category: 'Sains Eksperimen',
    difficulty: 'Menantang',
    points: 160,
    bonusSteps: 2,
    question: 'Di dalam toples kaca tertutup rapat terdapat dua lilin menyala: satu lilin pendek (5 cm) dan satu lilin panjang (15 cm). Ketika toples ditutup rapat, lilin mana yang akan MATI LEBIH DULU? Diskusikan alasannya dengan cermat!',
    contextClue: 'Gas Karbon Dioksida panas hasil pembakaran memiliki sifat pemuaian massa jenis.',
    correctAnswer: 'Lilin TINGGI / PANJANG akan mati lebih dahulu!',
    explanation: 'Gas Karbon Dioksida (CO2) hasil pembakaran lilin bersuhu sangat panas. Gas panas memiliki massa jenis lebih ringan sehingga bergerak naik dan berkumpul di bagian atas toples. Gas CO2 di atas mendesak gas oksigen ke bawah, sehingga lilin tinggi kekurangan oksigen lebih cepat dan padam lebih dahulu.'
  },
  {
    id: 'q8',
    title: 'Teka-Teki Menyeberang Sungai Serigala, Kambing & Sayur',
    category: 'Logika & Nalar',
    difficulty: 'Menantang',
    points: 160,
    bonusSteps: 2,
    question: 'Seorang petani harus menyeberangkan seekor Serigala, seekor Kambing, dan sekeranjang Sayur melintasi sungai menggunakan perahu kecil. Perahu hanya muat petani dan 1 bawaan. Jika ditinggal berdua tanpa petani: Serigala akan memakan Kambing, dan Kambing akan memakan Sayur. Bagaimana urutan langkah petani menyeberangkan ketiganya dengan aman?',
    contextClue: 'Petani boleh membawa kembali hewan yang sudah diseberangkan ke seberang awal jika diperlukan.',
    correctAnswer: '1. Bawa Kambing ke seberang. 2. Petani kembali sendiri. 3. Bawa Serigala ke seberang. 4. Bawa Kambing kembali ke pulau awal. 5. Bawa Sayur ke seberang. 6. Petani kembali sendiri. 7. Bawa Kambing ke seberang.',
    explanation: 'Kuncinya adalah menyeberangkan kambing terlebih dahulu, lalu saat menyeberangkan serigala, kambing dibawa pulang kembali sementara agar tidak dimakan serigala, lalu diganti menyeberangkan sayur, dan terakhir menyeberangkan kambing kembali.'
  },
  {
    id: 'q9',
    title: 'Tantangan Gravitasi Bulu & Bola Bowling',
    category: 'Sains Eksperimen',
    difficulty: 'Sedang',
    points: 130,
    bonusSteps: 1,
    question: 'Jika sehelai bulu ayam dan sebuah bola bowling dijatuhkan bersamaan dari ketinggian 10 meter di dalam RUANGAN HAMPA UDARA (vakum mutlak), benda mana yang akan menyentuh tanah terlebih dahulu? Berikan penjelasannya!',
    contextClue: 'Apa faktor utama yang biasanya memperlambat bulu jatuh di udara biasa?',
    correctAnswer: 'Keduanya akan jatuh dan menyentuh tanah SECARA BERSAMAAN pada detik yang sama.',
    explanation: 'Menurut Hukum Gravitasi Newton (percobaan Galileo Galilei), percepatan gravitasi bumi menarik semua benda dengan percepatan yang sama (g ≈ 9.8 m/s²) tanpa memandang massa benda. Di ruang hampa, tidak ada hambatan udara gesekan, sehingga bulu jatuh secepat bola bowling.'
  },
  {
    id: 'q10',
    title: 'Boss Gatekeeper 1: Sandi Pembagian Takaran Air',
    category: 'Teka-Teki Kelompok',
    difficulty: 'Boss Gatekeeper',
    points: 250,
    bonusSteps: 3,
    question: '[BOSS GATEKEEPER] Penjaga gerbang memberi Anda ember berisi air tak terbatas, tetapi Anda hanya memiliki 2 ember takaran: ember 5 Liter dan ember 3 Liter (keduanya tanpa garis skala). Anda diminta menakar TEPAT 4 LITER AIR untuk membuka gerbang. Tuliskan langkah runtutnya!',
    contextClue: 'Gunakan selisih kapasitas 5 liter dan 3 liter bolak-balik.',
    correctAnswer: '1. Isi penuh ember 5L. 2. Tuang ke ember 3L sampai penuh (sisa 2L di ember 5L). 3. Buang air di ember 3L. 4. Tuang 2L tadi ke ember 3L. 5. Isi penuh ember 5L. 6. Tuang ke ember 3L sampai penuh (hanya butuh 1L karena sudah ada 2L). 7. Sisa di ember 5L tepat 4 Liter!',
    explanation: 'Langkah matematika: 5 - 3 = 2L. Pindahkan 2L ke ember kecil. Isi lagi 5L, tuang 1L ke ember kecil hingga penuh (3L). Maka sisa di ember besar adalah 5 - 1 = 4L presisi.'
  },

  // ZONA 3 (Kimia Kristal, Gelombang, & Matematika Terapan)
  {
    id: 'q11',
    title: 'Misteri Minyak, Air & Sabun Cuci',
    category: 'Sains Eksperimen',
    difficulty: 'Sedang',
    points: 140,
    bonusSteps: 1,
    question: 'Minyak goreng dan air tidak pernah bisa bersatu dan selalu membentuk dua lapisan terpisah. Mengapa ketika kita menambahkan beberapa tetes sabun cuci cair dan mengocoknya, minyak dan air bisa menyatu membentuk larutan keruh? Konsep kimia apa yang bekerja?',
    contextClue: 'Molekul sabun memiliki dua ujung dengan sifat berbeda (satu suka air, satu suka minyak).',
    correctAnswer: 'Sabun bertindak sebagai EMULSIFIER (zat pengemulsi) yang memiliki sifat amfifilik (hidrofilik dan hidrofobik).',
    explanation: 'Molekul sabun memiliki kepala polar yang suka air (hidrofilik) dan ekor non-polar yang mengikat molekul minyak (hidrofobik/lipofilik). Sabun membentuk misel yang membungkus tetesan minyak sehingga minyak dapat terdispersi secara stabil di dalam air.'
  },
  {
    id: 'q12',
    title: 'Teka-Teki Tali Pembakar Waktu',
    category: 'Logika & Nalar',
    difficulty: 'Menantang',
    points: 170,
    bonusSteps: 2,
    question: 'Anda diberi 2 utas tali khusus. Setiap tali membutuhkan waktu tepat 60 MENIT untuk habis terbakar dari ujung ke ujung, tetapi tali terbakar dengan kecepatan TIDAK MERATA (ada bagian tebal dan tipis). Bagaimana cara mengukur waktu tepat 45 MENIT hanya dengan menggunakan kedua tali dan korek api?',
    contextClue: 'Apa yang terjadi jika seutas tali dibakar dari kedua ujungnya sekaligus?',
    correctAnswer: 'Bakar Tali 1 di KEDUA ujungnya sekaligus, dan bakar Tali 2 di SATU ujung saja. Saat Tali 1 habis (30 menit), segera bakar ujung lain dari Tali 2 (sisa 15 menit). Total = 30 + 15 = 45 menit!',
    explanation: 'Jika seutas tali 60 menit dibakar dari kedua ujungnya sekaligus, ia akan habis terbakar dalam tepat 30 menit. Pada saat 30 menit itu, Tali 2 masih memiliki durasi 30 menit. Begitu ujung kedua Tali 2 dinyalakan, sisa 30 menit tersebut akan habis dalam separuh waktu (15 menit). 30 + 15 = 45 menit tepat!'
  },
  {
    id: 'q13',
    title: 'Misteri Suara Sendok & Benang',
    category: 'Sains Eksperimen',
    difficulty: 'Mudah',
    points: 110,
    bonusSteps: 1,
    question: 'Ikatkan sebuah sendok logam di tengah benang jahit panjang. Sumbatkan kedua ujung benang ke telinga Anda dengan jari, lalu ayunkan sendok hingga membentur tepi meja. Mengapa suara yang terdengar di telinga terdengar seperti bunyi lonceng katedral gereja raksasa yang sangat keras dan bergema?',
    contextClue: 'Zat padat vs gas: medium mana yang merambatkan gelombang bunyi paling cepat dan paling rapat?',
    correctAnswer: 'Karena gelombang bunyi merambat melalui ZAT PADAT (benang), di mana partikelnya jauh lebih rapat dibandingkan melalui udara (gas).',
    explanation: 'Bunyi adalah gelombang mekanik yang membutuhkan medium perambatan. Partikel pada zat padat (benang dan tulang jari) sangat rapat, sehingga transfer energi getaran terjadi jauh lebih efisien, minim redaman, menghasilkan suara dentang yang sangat keras dan dalam dibanding melalui udara.'
  },
  {
    id: 'q14',
    title: 'Paradoks Kapal Udara Panas',
    category: 'Sains Eksperimen',
    difficulty: 'Sedang',
    points: 140,
    bonusSteps: 1,
    question: 'Mengapa balon udara raksasa diterbangkan dengan menyalakan api pemanas udara di bagian bawah kantong balon? Mengapa udara panas bisa mengangkat beban penumpang yang beratnya beratus-ratus kilogram ke angkasa?',
    contextClue: 'Pikirkan apa yang terjadi pada kerapatan partikel gas saat suhunya dipanaskan.',
    correctAnswer: 'Udara yang dipanaskan memuai sehingga massa jenisnya mengecil dan lebih ringan dari udara dingin di luar, menghasilkan GAYA APUNG ke atas.',
    explanation: 'Ketika udara di dalam kantong balon dipanaskan, partikel udara bergerak lebih cepat dan renggang, sehingga udara memuai. Sebagian udara keluar dari lubang bawah, membuat massa total udara di dalam balon berkurang drastis. Karena massa jenis udara panas di dalam balon lebih kecil daripada udara atmosfer dingin di sekitarnya, timbullah gaya angkat Archimedes yang kuat.'
  },
  {
    id: 'q15',
    title: 'Boss Gatekeeper 2: Sandi 9 Koin & 1 Timbangan',
    category: 'Matematika Kritis',
    difficulty: 'Boss Gatekeeper',
    points: 260,
    bonusSteps: 3,
    question: '[BOSS GATEKEEPER] Terdapat 9 koin emas yang bentuk dan warnanya identik. 8 koin memiliki berat asli yang sama persis, sedangkan 1 KOIN ADALAH PALSU YANG LEBIH BERAT. Anda hanya memiliki timbangan jungkat-jungkit dua lengan. Bagaimana cara menemukan koin palsu tersebut hanya dalam 2 KALI PENIMBANGAN?',
    contextClue: 'Bagi 9 koin menjadi 3 kelompok yang sama banyak (3, 3, 3).',
    correctAnswer: 'Timbang 3 koin vs 3 koin. Jika seimbang, koin palsu ada di 3 koin yang tidak ditimbang. Jika berat sebelah, koin palsu ada di sisi yang lebih berat. Pada penimbangan ke-2: dari kelompok 3 koin tersangka, timbang 1 koin vs 1 koin. Jika seimbang, koin palsu adalah yang tersisa!',
    explanation: 'Metode eliminasi sepertiga (Divide and Conquer): 9 koin dibagi 3-3-3. Penimbangan 1 menyaring tersangka dari 9 menjadi 3 koin. Penimbangan 2 menyaring tersangka dari 3 menjadi 1 koin palsu secara pasti!'
  },

  // ZONA 4 (Puncak Nalar, Astronomi, Relativitas, & Pemecahan Masalah Tingkat Tinggi)
  {
    id: 'q16',
    title: 'Misteri Siang & Malam di Kutub',
    category: 'Studi Kasus Alam',
    difficulty: 'Sedang',
    points: 150,
    bonusSteps: 1,
    question: 'Di wilayah lingkaran Kutub Utara seperti Norwegia Utara, ada fenomena "Midnight Sun" di mana matahari tidak pernah terbenam selama 24 jam penuh saat musim panas. Apa penyebab astronomis utama fenomena ini terjadi?',
    contextClue: 'Perhatikan sumbu rotasi bumi yang tidak tegak lurus melainkan memiliki kemiringan sudut tertentu.',
    correctAnswer: 'Kemiringan sumbu rotasi Bumi sebesar 23,5 derajat terhadap bidang orbitnya (ekliptika).',
    explanation: 'Karena poros Bumi miring 23,5°, saat bumi mengitari matahari di musim panas belahan utara, Kutub Utara condong terus-menerus menghadap ke arah matahari. Sehingga saat bumi berputar pada porosnya, daerah kutub utara selalu terpapar sinar matahari tanpa malam selama berbulan-bulan.'
  },
  {
    id: 'q17',
    title: 'Teka-Teki Dua Bersaudara di Pulau Waktu',
    category: 'Logika & Nalar',
    difficulty: 'Menantang',
    points: 180,
    bonusSteps: 2,
    question: 'Di sebuah pulau misteri, ada 2 penjaga gerbang kembar: Penjaga A SELALU BERKATA JUJUR, dan Penjaga B SELALU BERKATA BOHONG. Anda tidak tahu siapa yang jujur dan siapa yang bohong. Hanya SATU gerbang yang menuju puncak kemenangan, satu lagi menuju jurang. Anda hanya boleh mengajukan SATU PERTANYAAN pada SALAH SATU penjaga. Apa pertanyaannya?',
    contextClue: 'Ajukan pertanyaan tentang apa yang akan dikatakan oleh saudaranya (negasi x positif = negasi).',
    correctAnswer: '"Jika aku bertanya pada saudaramu gerbang mana yang benar, gerbang mana yang akan ia tunjuk?" Lalu pilih gerbang SEBALIKNYA.',
    explanation: 'Jika Anda bertanya pada si jujur, dia akan dengan jujur memberi tahu bahwa si pembohong akan menunjuk pintu jurang. Jika Anda bertanya pada si pembohong, dia akan berbohong tentang jawaban si jujur dan menunjuk pintu jurang juga! Keduanya pasti menunjuk pintu jurang, sehingga Anda tinggal memilih pintu sebaliknya!'
  },
  {
    id: 'q18',
    title: 'Eksperimen Bayangan Cermin Tanpa Batas',
    category: 'Sains Eksperimen',
    difficulty: 'Sedang',
    points: 140,
    bonusSteps: 1,
    question: 'Dua buah cermin datar diletakkan berhadapan sejajar satu sama lain. Sebuah lilin diletakkan di tengah-tengahnya. Mengapa bayangan lilin yang tampak di dalam cermin tampak tidak berhingga (banyak sekali lorong lilin), dan mengapa bayangan yang semakin jauh warnanya terlihat semakin redup kehijauan?',
    contextClue: 'Pantulan berulang dan sifat material kaca cermin biasa yang menyerap sedikit cahaya merah-biru.',
    correctAnswer: 'Terjadi pemantulan cahaya berulang kali tanpa henti antar kedua cermin. Kaca cermin terbuat dari silika yang sedikit menyerap spektrum cahaya lain dan memantulkan hijau (hijau paling dominan pada pantulan puluhan kali).',
    explanation: 'Cahaya dipantulkan bolak-balik berulang kali antar permukaan cermin datar sejajar. Setiap pantulan tidak 100% sempurna (cermin menyerap sekitar 2-5% cahaya). Kaca cermin standar memiliki sedikit rona kehijauan, sehingga setelah dipantulkan puluhan kali, rona hijau menjadi jelas dan bayangan semakin redup.'
  },
  {
    id: 'q19',
    title: 'Paradoks Menyeberang Jembatan di Tengah Malam',
    category: 'Teka-Teki Kelompok',
    difficulty: 'Menantang',
    points: 190,
    bonusSteps: 2,
    question: '4 anggota tim harus menyeberangi jembatan gantung reyot di malam gelap gulita. Hanya ada 1 obor penerang (wajib dibawa saat menyeberang). Jembatan hanya muat maksimal 2 orang sekaligus. Kecepatan tiap orang: Orang A (1 menit), B (2 menit), C (7 menit), D (10 menit). Jika 2 orang jalan bersama, kecepatan mengikuti yang paling lambat. Berapa waktu MINIMAL agar keempatnya sampai di seberang?',
    contextClue: 'Dua orang yang paling lambat (C dan D) sebaiknya menyeberang bersama-sama agar waktu tidak terbuang dua kali.',
    correctAnswer: '17 MENIT! (Langkah: A & B menyeberang = 2 mnt, A balik bawa obor = 1 mnt, C & D menyeberang = 10 mnt, B balik bawa obor = 2 mnt, A & B menyeberang = 2 mnt. Total: 2 + 1 + 10 + 2 + 2 = 17 menit)',
    explanation: 'Trik terbaik adalah memasangkan dua orang paling lambat (C & D: 10 menit) secara bersamaan sehingga penalti 10 menit hanya dihitung satu kali, sementara orang yang cepat (A dan B) bertugas mengantar-jemput obor.'
  },
  {
    id: 'q20',
    title: 'Boss Gatekeeper Final: Formula Mahkota Sains',
    category: 'Sains Eksperimen',
    difficulty: 'Boss Gatekeeper',
    points: 300,
    bonusSteps: 4,
    question: '[BOSS GATEKEEPER FINAL] Di puncak gunung kuil, air mendidih pada suhu 85°C (bukan 100°C). Mengapa telur ayam yang direbus di air mendidih puncak gunung membutuhkan waktu lebih lama untuk matang dibanding direbus di air mendidih tepi pantai? Padahal airnya sama-sama mendidih dengan gelembung besar!',
    contextClue: 'Apakah kematangan makanan ditentukan oleh suhu air atau gelembung mendidihnya?',
    correctAnswer: 'Karena titik didih air di puncak gunung lebih rendah akibat tekanan udara atmosfer yang rendah. Yang mematangkan telur adalah SUHU PANAS AIR (85°C), bukan status gelembung mendidihnya.',
    explanation: 'Di dataran tinggi, tekanan udara luar lebih rendah, sehingga molekul air lebih mudah menguap pada suhu yang lebih rendah (85°C). Memasak adalah proses transfer energi termal untuk mendenaturasi protein telur. Karena suhunya hanya 85°C dibanding 100°C di pantai, laju pemasakan protein jauh lebih lambat sehingga butuh waktu lebih lama.'
  },

  // SOAL DUEL REBUTAN KILAT (SPEED & BUZZER)
  {
    id: 'duel1',
    title: 'Duel: Benda Jatuh di Bulan',
    category: 'Logika & Nalar',
    difficulty: 'Sedang',
    points: 150,
    bonusSteps: 2,
    question: '[DUEL REBUTAN] Astronot Apollo 15 di Bulan menjatuhkan sebuah palu geologi dan sehelai bulu burung elang dari ketinggian yang sama. Benda mana yang jatuh lebih dulu dan mengapa astronot tidak mendengar suara dentuman saat palu menyentuh tanah Bulan?',
    contextClue: 'Dua hal: gravitasi tanpa udara, dan perambatan gelombang bunyi.',
    correctAnswer: 'Keduanya jatuh BERSAMAAN (karena tidak ada hambatan udara), dan TIDAK ADA SUARA karena Bulan hampa udara sehingga gelombang bunyi tidak dapat merambat.',
    explanation: 'Di bulan tidak ada atmosfer (hampa udara). Gravitasi menarik semua benda dengan percepatan seragam. Dan bunyi adalah gelombang mekanik yang mutlak memerlukan partikel medium untuk merambat, sehingga suara tidak ada di ruang angkasa vakum.'
  },
  {
    id: 'duel2',
    title: 'Duel: Teka-Teki Air & Es Batu Mengapung',
    category: 'Logika & Nalar',
    difficulty: 'Sedang',
    points: 150,
    bonusSteps: 2,
    question: '[DUEL REBUTAN] Hampir semua zat di bumi ketika berubah wujud dari cair menjadi padat akan menyusut dan menjadi lebih berat (tenggelam). Namun mengapa AIR justru MEMUAI ketika membeku menjadi es dan mengapung? Apa sebutan keanehan sifat air ini?',
    contextClue: 'Fenomena ini terjadi antara suhu 0°C sampai 4°C.',
    correctAnswer: 'ANOMALI AIR (Sifat Anomali Air) karena terbentuknya struktur kisi kristal heksagonal dengan rongga udara antar molekul.',
    explanation: 'Saat air membeku di bawah 4°C, ikatan hidrogen antar molekul air membentuk struktur kristal kisi terbuka berbentuk heksagonal yang berongga. Rongga ini membuat volume es bertambah sekitar 9% dan massa jenisnya menjadi lebih kecil dari air cair, sehingga es mengapung. Fenomena ini krusial agar danau kutub tidak membeku sampai ke dasar!'
  },
  {
    id: 'duel3',
    title: 'Duel: Teka-Teki Logika Roda Berputar',
    category: 'Matematika Kritis',
    difficulty: 'Sedang',
    points: 150,
    bonusSteps: 2,
    question: '[DUEL REBUTAN] Sebuah roda gigi A memiliki 24 gigi dan terhubung langsung memutar roda gigi B yang memiliki 12 gigi. Jika roda gigi A berputar 10 kali putaran searah jarum jam, berapa kali roda gigi B berputar dan ke arah mana putarannya?',
    contextClue: 'Perhatikan rasio jumlah gigi dan arah putaran roda gigi yang saling bersentuhan.',
    correctAnswer: 'Roda gigi B berputar 20 KALI, dengan arah BERLAWANAN JARUM JAM!',
    explanation: 'Dua roda gigi yang saling bertaut selalu berputar ke arah yang berlawanan. Rasio perputarannya berbanding terbalik dengan jumlah gigi: (24 gigi / 12 gigi) * 10 putaran = 20 kali putaran berlawanan jarum jam.'
  }
];
