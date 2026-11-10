export interface JeopardyTeam {
  id: string;
  name: string;
  motto: string;
  color: string;
  bgLight: string;
  borderColor: string;
  avatarIcon: string;
  keyShortcut: string;
  score: number;
  correctCount: number;
  wrongCount: number;
  members: string;
  lifelines: {
    fiftyFiftyHint: boolean;
    extraTime: boolean;
    shieldNoPenalty: boolean;
  };
}

export interface JeopardyItem {
  id: string;
  points: 100 | 200 | 300 | 400 | 500;
  question: string;
  hint: string;
  answer: string;
  options?: string[]; // Optional 4 multiple-choice options for quick helper if needed
  isDailyDouble?: boolean;
}

export interface JeopardyCategory {
  id: string;
  title: string;
  icon: string;
  color: string;
  bgHeader: string;
  items: JeopardyItem[];
}

export interface JeopardyPack {
  id: string;
  name: string;
  subtitle: string;
  badge: string;
  categories: JeopardyCategory[];
}

export interface JeopardyLog {
  id: string;
  timestamp: string;
  teamName: string;
  teamColor: string;
  text: string;
  type: 'correct' | 'steal' | 'wrong' | 'system' | 'bonus';
}

export interface JeopardySession {
  id: string;
  name: string;
  kelas: string;
  mapel: string;
  savedAt: string;
  selectedPackId: string;
  currentTurn: number;
  round: number;
  teams: JeopardyTeam[];
  answeredCellIds: string[];
  dailyDoubleIds: string[];
  customCategories?: JeopardyCategory[];
  logs: JeopardyLog[];
}

export interface JeopardySaveSlot {
  id: string;
  name: string;
  date: string;
  session: JeopardySession;
}

export const INITIAL_JEOPARDY_TEAMS: JeopardyTeam[] = [
  {
    id: 'regu-1',
    name: 'Regu Kilat Biru',
    motto: 'Cepat, Tepat, Hebat!',
    color: '#38bdf8',
    bgLight: 'rgba(56, 189, 248, 0.15)',
    borderColor: '#7dd3fc',
    avatarIcon: 'fa-bolt',
    keyShortcut: '1',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    members: 'Kelompok 1',
    lifelines: { fiftyFiftyHint: true, extraTime: true, shieldNoPenalty: true }
  },
  {
    id: 'regu-2',
    name: 'Regu Bintang Emas',
    motto: 'Bersinar & Juara!',
    color: '#f59e0b',
    bgLight: 'rgba(245, 158, 11, 0.15)',
    borderColor: '#fde68a',
    avatarIcon: 'fa-star',
    keyShortcut: '2',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    members: 'Kelompok 2',
    lifelines: { fiftyFiftyHint: true, extraTime: true, shieldNoPenalty: true }
  },
  {
    id: 'regu-3',
    name: 'Regu Zamrud Hijau',
    motto: 'Kompak & Cerdas!',
    color: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.15)',
    borderColor: '#6ee7b7',
    avatarIcon: 'fa-gem',
    keyShortcut: '3',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    members: 'Kelompok 3',
    lifelines: { fiftyFiftyHint: true, extraTime: true, shieldNoPenalty: true }
  },
  {
    id: 'regu-4',
    name: 'Regu Api Merah',
    motto: 'Semangat Membara!',
    color: '#ec4899',
    bgLight: 'rgba(236, 72, 153, 0.15)',
    borderColor: '#f9a8d4',
    avatarIcon: 'fa-fire',
    keyShortcut: '4',
    score: 0,
    correctCount: 0,
    wrongCount: 0,
    members: 'Kelompok 4',
    lifelines: { fiftyFiftyHint: true, extraTime: true, shieldNoPenalty: true }
  }
];

export const JEOPARDY_PACKS: JeopardyPack[] = [
  // =========================================================================
  // PAKET 1: EDISI UMUM MADRASAH CERIA (KELAS 7 - 9 SEMUA MAPEL)
  // =========================================================================
  {
    id: 'pack-umum',
    name: 'Paket 1: Gebyar Madrasah Ceria (Umum Kelas 7–9)',
    subtitle: 'Sains, Khazanah Islam, Wawasan Nusantara, Bahasa, & Matematika Cepat',
    badge: 'POPULER • KELAS 7-9',
    categories: [
      {
        id: 'cat-sains',
        title: 'SAINS & ALAM',
        icon: 'fa-flask',
        color: '#38bdf8',
        bgHeader: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        items: [
          {
            id: 'u-sains-100',
            points: 100,
            question: 'Proses tumbuhan hijau memasak makanannya sendiri dengan bantuan cahaya matahari dan klorofil disebut apa?',
            hint: 'Diawali dengan kata "Foto..."',
            answer: 'Fotosintesis',
            options: ['Fotosintesis', 'Respirasi', 'Evaporasi', 'Adaptasi']
          },
          {
            id: 'u-sains-200',
            points: 200,
            question: 'Planet apakah di Tata Surya kita yang terkenal memiliki cincin indah yang mengelilinginya dan merupakan planet terbesar kedua?',
            hint: 'Berada setelah planet Jupiter.',
            answer: 'Planet Saturnus',
            options: ['Jupiter', 'Saturnus', 'Uranus', 'Mars']
          },
          {
            id: 'u-sains-300',
            points: 300,
            question: 'Perubahan wujud benda dari benda PADAT langsung menjadi GAS tanpa mencair terlebih dahulu (contohnya kapur barus yang mengecil) disebut...',
            hint: 'Mencair, membeku, menguap, mengembun, atau ...?',
            answer: 'Menyublim',
            options: ['Mengembun', 'Menyublim', 'Mengkristal', 'Menguap']
          },
          {
            id: 'u-sains-400',
            points: 400,
            question: 'Bagian sel tumbuhan maupun hewan yang berfungsi sebagai "pembangkit energi" (tempat respirasi sel menghasilkan energi ATP) adalah...',
            hint: 'Namanya berawalan huruf M (Mito...).',
            answer: 'Mitokondria',
            options: ['Ribosom', 'Lisosom', 'Mitokondria', 'Vakuola']
          },
          {
            id: 'u-sains-500',
            points: 500,
            question: 'Ketika kita berada di dalam mobil yang melaju kencang lalu mobil direm mendadak, tubuh kita otomatis terdorong ke depan. Peristiwa ini adalah contoh Hukum Kelembaman atau Hukum ... Newton.',
            hint: 'Hukum Newton ke-1, ke-2, atau ke-3?',
            answer: 'Hukum I Newton (Hukum Kelembaman / Inersia)',
            options: ['Hukum I Newton', 'Hukum II Newton', 'Hukum III Newton', 'Hukum Archimedes']
          }
        ]
      },
      {
        id: 'cat-islam',
        title: 'KHAZANAH ISLAM',
        icon: 'fa-mosque',
        color: '#10b981',
        bgHeader: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        items: [
          {
            id: 'u-islam-100',
            points: 100,
            question: 'Sifat wajib bagi Rasul yang berarti "Dapat Dipercaya" (juga menjadi gelar Nabi Muhammad SAW sejak muda yaitu Al-Amin) adalah...',
            hint: 'Shiddiq, Amanah, Tabligh, Fathonah.',
            answer: 'Amanah (Dapat Dipercaya)',
            options: ['Shiddiq', 'Amanah', 'Tabligh', 'Fathonah']
          },
          {
            id: 'u-islam-200',
            points: 200,
            question: 'Terdapat 5 orang Nabi dan Rasul yang memiliki ketabahan luar biasa sehingga diberi gelar "Ulul Azmi". Sebutkan minimal 3 di antaranya!',
            hint: 'Singkatan terkenalnya adalah NIMIM (Nuh, Ibrahim, Musa, Isa, Muhammad).',
            answer: 'Nabi Nuh AS, Nabi Ibrahim AS, Nabi Musa AS, Nabi Isa AS, dan Nabi Muhammad SAW.',
            options: ['Nuh, Ibrahim, Musa, Isa, Muhammad', 'Adam, Idris, Nuh, Hud, Saleh', 'Daud, Sulaiman, Ayub, Yusuf, Yunus', 'Ismail, Ishaq, Yakub, Zakaria, Yahya']
          },
          {
            id: 'u-islam-300',
            points: 300,
            question: 'Dalam ilmu Tajwid, apabila ada Nun Sukun (نْ) atau Tanwin bertemu dengan huruf Ba (ب), maka cara membacanya membalik menjadi bunyi "Mim" disertai dengung. Hukum bacaan apakah ini?',
            hint: 'Izhar, Idgham, Iqlab, atau Ikhfa?',
            answer: 'Iqlab',
            options: ['Izhar Halqi', 'Idgham Bighunnah', 'Iqlab', 'Ikhfa Haqiqi']
          },
          {
            id: 'u-islam-400',
            points: 400,
            question: 'Saat Nabi Muhammad SAW melaksanakan hijrah dari Makkah menuju Yatsrib (Madinah), siapakah sahabat setia yang menemani beliau bersembunyi di dalam Gua Tsur?',
            hint: 'Beliau juga merupakan Khalifah pertama dalam Khulafaur Rasyidin.',
            answer: 'Abu Bakar Ash-Shiddiq r.a.',
            options: ['Abu Bakar Ash-Shiddiq', 'Umar bin Khattab', 'Utsman bin Affan', 'Ali bin Abi Thalib']
          },
          {
            id: 'u-islam-500',
            points: 500,
            question: 'Salat sunnah 2 rakaat yang dikerjakan ketika seseorang baru saja masuk ke dalam masjid SEBELUM duduk untuk menghormati masjid disebut salat sunnah...',
            hint: 'Diawali dengan kata "Tahiyyatul..."',
            answer: 'Salat Sunnah Tahiyyatul Masjid',
            options: ['Salat Dhuha', 'Salat Tahiyyatul Masjid', 'Salat Istikharah', 'Salat Rawatib']
          }
        ]
      },
      {
        id: 'cat-nusantara',
        title: 'WAWASAN NUSANTARA',
        icon: 'fa-globe-asia',
        color: '#f59e0b',
        bgHeader: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        items: [
          {
            id: 'u-nus-100',
            points: 100,
            question: 'Rumah adat "Gadang" yang memiliki atap melengkung runcing menyerupai tanduk kerbau berasal dari provinsi mana?',
            hint: 'Ibu kota provinsinya adalah Kota Padang.',
            answer: 'Sumatera Barat',
            options: ['Sumatera Utara', 'Sumatera Barat', 'Riau', 'Jambi']
          },
          {
            id: 'u-nus-200',
            points: 200,
            question: 'Pada perisai Burung Garuda Pancasila, sila ke-4 ("Kerakyatan yang dipimpin oleh hikmat kebijaksanaan dalam permusyawaratan/perwakilan") dilambangkan dengan gambar apa?',
            hint: 'Bintang, Rantai, Pohon Beringin, Kepala Banteng, atau Padi dan Kapas?',
            answer: 'Kepala Banteng',
            options: ['Pohon Beringin', 'Kepala Banteng', 'Rantai Emas', 'Padi dan Kapas']
          },
          {
            id: 'u-nus-300',
            points: 300,
            question: 'Siapakah tokoh Bapak Pendidikan Nasional Indonesia yang mendirikan perguruan Taman Siswa dan terkenal dengan semboyan "Tut Wuri Handayani"?',
            hint: 'Nama kecil beliau adalah Raden Mas Soewardi Soerjaningrat.',
            answer: 'Ki Hajar Dewantara',
            options: ['Ki Hajar Dewantara', 'Dr. Wahidin Sudirohusodo', 'H.O.S. Tjokroaminoto', 'K.H. Ahmad Dahlan']
          },
          {
            id: 'u-nus-400',
            points: 400,
            question: 'Indonesia dibagi menjadi 3 daerah waktu: WIB, WITA, dan WIT. Jika di Jakarta (WIB) saat ini pukul 09.00 pagi, maka pukul berapakah saat ini di Jayapura, Papua (WIT)?',
            hint: 'WIT lebih cepat 2 jam dibandingkan WIB.',
            answer: 'Pukul 11.00 siang WIT',
            options: ['Pukul 08.00', 'Pukul 10.00', 'Pukul 11.00', 'Pukul 12.00']
          },
          {
            id: 'u-nus-500',
            points: 500,
            question: 'Organisasi kerja sama negara-negara Asia Tenggara (ASEAN) didirikan pada 8 Agustus 1967 di Bangkok. Siapakah nama Menteri Luar Negeri yang mewakili Indonesia menandatangani Deklarasi Bangkok?',
            hint: 'Beliau juga pernah menjabat sebagai Wakil Presiden RI ke-3.',
            answer: 'Adam Malik',
            options: ['Adam Malik', 'Soebandrio', 'Ali Alatas', 'Sutan Sjahrir']
          }
        ]
      },
      {
        id: 'cat-bahasa',
        title: 'BAHASA & SASTRA',
        icon: 'fa-book-open',
        color: '#a855f7',
        bgHeader: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
        items: [
          {
            id: 'u-bhs-100',
            points: 100,
            question: 'Apa ANTONIM (lawan kata) dari kata "OPTIMIS"?',
            hint: 'Sikap mudah putus asa atau selalu khawatir gagal.',
            answer: 'Pesimis',
            options: ['Pesimis', 'Realistis', 'Dinamis', 'Aktif']
          },
          {
            id: 'u-bhs-200',
            points: 200,
            question: 'Dalam puisi lama berbentuk PANTUN, baris ke-1 dan ke-2 disebut SAMPIRAN. Disebut apakah baris ke-3 dan ke-4 yang mengandung pesan utama pantun?',
            hint: 'Terdiri dari 3 huruf.',
            answer: 'Isi',
            options: ['Tema', 'Isi', 'Rima', 'Amanat']
          },
          {
            id: 'u-bhs-300',
            points: 300,
            question: 'Perhatikan kalimat berikut: "Suara teriakan penonton di stadion itu mengguncang membelah angkasa!" Kalimat yang melebih-lebihkan kenyataan tersebut menggunakan majas apa?',
            hint: 'Personifikasi, Metafora, atau Hiperbola?',
            answer: 'Majas Hiperbola',
            options: ['Majas Personifikasi', 'Majas Metafora', 'Majas Hiperbola', 'Majas Litotes']
          },
          {
            id: 'u-bhs-400',
            points: 400,
            question: 'English Challenge! Terjemahkan kalimat berikut ke dalam Bahasa Indonesia yang tepat: "My brother goes to the library every Tuesday to borrow history books."',
            hint: 'Library = perpustakaan, Tuesday = hari Selasa, borrow = meminjam.',
            answer: 'Saudara laki-lakiku pergi ke perpustakaan setiap hari Selasa untuk meminjam buku-buku sejarah.',
            options: [
              'Saudara laki-lakiku pergi ke perpustakaan setiap Selasa untuk meminjam buku sejarah.',
              'Saudara laki-lakiku pergi ke toko buku setiap Kamis untuk membeli buku sejarah.',
              'Temanku membaca buku sejarah di perpustakaan setiap hari Selasa.',
              'Kakakku mengembalikan buku sejarah ke perpustakaan pada hari Selasa.'
            ]
          },
          {
            id: 'u-bhs-500',
            points: 500,
            question: 'Di antara 4 penulisan kata di bawah ini, manakah yang merupakan KATA BAKU sesuai KBBI (Kamus Besar Bahasa Indonesia): (A) Apotik, (B) Praktek, (C) Risiko, atau (D) Nasehat?',
            hint: 'Apotek, Praktik, Risiko, Nasihat.',
            answer: '(C) Risiko (Bentuk baku dari resiko. Yang lain baku-nya: Apotek, Praktik, Nasihat).',
            options: ['Apotik', 'Praktek', 'Risiko', 'Nasehat']
          }
        ]
      },
      {
        id: 'cat-matematika',
        title: 'MATEMATIKA & LOGIKA',
        icon: 'fa-calculator',
        color: '#ec4899',
        bgHeader: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
        items: [
          {
            id: 'u-mat-100',
            points: 100,
            question: 'Hitung cepat! Berapakah hasil dari: 25 × 4 + 50 - 30 ?',
            hint: 'Kerjakan perkalian 25 × 4 terlebih dahulu.',
            answer: '120 (Karena 100 + 50 - 30 = 120)',
            options: ['100', '110', '120', '130']
          },
          {
            id: 'u-mat-200',
            points: 200,
            question: 'Sebuah taman berbentuk persegi panjang memiliki panjang 12 meter dan lebar 8 meter. Berapakah KELILING taman tersebut?',
            hint: 'Rumus keliling persegi panjang = 2 × (panjang + lebar).',
            answer: '40 meter (Karena 2 × (12 + 8) = 2 × 20 = 40 m)',
            options: ['20 meter', '40 meter', '80 meter', '96 meter']
          },
          {
            id: 'u-mat-300',
            points: 300,
            question: 'Perhatikan barisan bilangan berikut: 3, 7, 11, 15, 19, ... Berapakah dua bilangan selanjutnya pada pola tersebut?',
            hint: 'Setiap suku ditambah 4.',
            answer: '23 dan 27',
            options: ['21 dan 25', '22 dan 26', '23 dan 27', '24 dan 28']
          },
          {
            id: 'u-mat-400',
            points: 400,
            question: 'Sebuah jaket di toko olahraga tertulis harga Rp200.000, dan hari ini mendapat diskon (potongan harga) sebesar 25%. Berapakah uang yang harus dibayar untuk membeli jaket tersebut?',
            hint: '25% dari 200.000 adalah 50.000.',
            answer: 'Rp150.000 (Harga Rp200.000 dikurangi diskon Rp50.000)',
            options: ['Rp125.000', 'Rp150.000', 'Rp175.000', 'Rp180.000']
          },
          {
            id: 'u-mat-500',
            points: 500,
            question: 'Teka-Teki Logika! Jika 3 ekor kucing dapat menangkap 3 ekor tikus dalam waktu 3 menit, maka berapa menit waktu yang dibutuhkan oleh 10 ekor kucing untuk menangkap 10 ekor tikus secara bersamaan?',
            hint: 'Jangan terjebak! Setiap kucing bekerja menangkap tikusnya masing-masing secara serentak.',
            answer: 'Tetap 3 menit! (Karena ke-10 kucing menangkap tikusnya masing-masing secara bersamaan)',
            options: ['1 menit', '3 menit', '10 menit', '30 menit']
          }
        ]
      }
    ]
  },

  // =========================================================================
  // PAKET 2: EDISI SPESIAL SAINS & MATEMATIKA SMP/MTs (KELAS 7 - 9)
  // =========================================================================
  {
    id: 'pack-sains-mat',
    name: 'Paket 2: Olimpiade Ceria Sains & Matematika (Kelas 7–9)',
    subtitle: 'Biologi, Fisika Sehari-hari, Aljabar Ringan, Geometri, & Logika',
    badge: 'IPA & MATEMATIKA',
    categories: [
      {
        id: 'sm-biologi',
        title: 'BIOLOGI SERU',
        icon: 'fa-seedling',
        color: '#10b981',
        bgHeader: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        items: [
          {
            id: 'sm-bio-100',
            points: 100,
            question: 'Hubungan timbal balik yang saling menguntungkan antara lebah yang menghisap nektar dan bunga yang terbantu penyerbukannya disebut simbiosis apa?',
            hint: 'Mutualisme, Komensalisme, atau Parasitisme?',
            answer: 'Simbiosis Mutualisme',
            options: ['Mutualisme', 'Komensalisme', 'Parasitisme', 'Amensalisme']
          },
          {
            id: 'sm-bio-200',
            points: 200,
            question: 'Organ pernapasan manusia tempat terjadinya pertukaran gas oksigen (O2) dan karbon dioksida (CO2) yang berbentuk gelembung-gelembung halus seperti buah anggur di paru-paru disebut...',
            hint: 'Bronkus, Bronkiolus, atau Alveolus?',
            answer: 'Alveolus',
            options: ['Trakea', 'Bronkus', 'Alveolus', 'Diafragma']
          },
          {
            id: 'sm-bio-300',
            points: 300,
            question: 'Pembuluh angkut pada tumbuhan yang bertugas mengangkut air dan mineral dari AKAR menuju ke DAUN adalah pembuluh...',
            hint: 'Xilem (pembuluh kayu) atau Floem (pembuluh tapis)?',
            answer: 'Xilem (Pembuluh Kayu)',
            options: ['Xilem', 'Floem', 'Stomata', 'Kambium']
          },
          {
            id: 'sm-bio-400',
            points: 400,
            question: 'Enzim di dalam lambung manusia yang berfungsi mengubah protein menjadi pepton adalah enzim...',
            hint: 'Ingat singkatan isi lambung: Pe-Re-HCl (Pepsin, Renin, Asam Klorida).',
            answer: 'Enzim Pepsin',
            options: ['Amilase / Ptialin', 'Pepsin', 'Lipase', 'Tripsin']
          },
          {
            id: 'sm-bio-500',
            points: 500,
            question: 'Dalam pewarisan sifat (Genetika Mendel), sifat yang selalu tampak/muncul menutupi sifat pasangannya dan ditulis dengan huruf kapital (misal: M untuk warna Merah) disebut sifat...',
            hint: 'Lawan dari sifat Resesif.',
            answer: 'Sifat Dominan',
            options: ['Dominan', 'Resesif', 'Intermediet', 'Kromosom']
          }
        ]
      },
      {
        id: 'sm-fisika',
        title: 'FISIKA & ENERGI',
        icon: 'fa-bolt',
        color: '#38bdf8',
        bgHeader: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        items: [
          {
            id: 'sm-fis-100',
            points: 100,
            question: 'Alat ukur yang digunakan untuk mengukur suhu suatu benda secara tepat adalah...',
            hint: 'Satuan ukurnya bisa Celcius, Reamur, Fahrenheit, atau Kelvin.',
            answer: 'Termometer',
            options: ['Barometer', 'Termometer', 'Speedometer', 'Amperemeter']
          },
          {
            id: 'sm-fis-200',
            points: 200,
            question: 'Sendok logam yang dicelupkan ke dalam segelas teh panas lama-kelamaan ujung gagangnya ikut terasa panas. Perpindahan kalor melalui zat padat tanpa disertai perpindahan partikelnya ini disebut...',
            hint: 'Konduksi, Konveksi, atau Radiasi?',
            answer: 'Konduksi',
            options: ['Konduksi', 'Konveksi', 'Radiasi', 'Isolasi']
          },
          {
            id: 'sm-fis-300',
            points: 300,
            question: 'Jika seorang siswa bersepeda menempuh jarak 120 meter dalam waktu 20 detik, berapakah kelajuan (kecepatan) rata-rata sepeda tersebut?',
            hint: 'Rumus v = s / t (Jarak dibagi Waktu).',
            answer: '6 meter/detik (m/s)',
            options: ['4 m/s', '6 m/s', '8 m/s', '10 m/s']
          },
          {
            id: 'sm-fis-400',
            points: 400,
            question: 'Pada rangkaian listrik di rumah kita, lampu-lampu dipasang sedemikian rupa sehingga jika 1 lampu kamar dimatikan, lampu di ruang tamu TIDAK ikut mati. Rangkaian apakah yang digunakan?',
            hint: 'Rangkaian Seri atau Rangkaian Paralel?',
            answer: 'Rangkaian Paralel',
            options: ['Rangkaian Seri', 'Rangkaian Paralel', 'Rangkaian Tertutup', 'Rangkaian Magnetik']
          },
          {
            id: 'sm-fis-500',
            points: 500,
            question: 'Buah kelapa yang masih menggantung diam di atas pohon yang tinggi menyimpan energi karena ketinggiannya. Energi apakah namanya?',
            hint: 'Energi Kinetik atau Energi Potensial Gravitasi?',
            answer: 'Energi Potensial (Gravitasi)',
            options: ['Energi Kinetik', 'Energi Potensial', 'Energi Kalor', 'Energi Kimia']
          }
        ]
      },
      {
        id: 'sm-aljabar',
        title: 'HITUNG & ALJABAR',
        icon: 'fa-superscript',
        color: '#f59e0b',
        bgHeader: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        items: [
          {
            id: 'sm-alj-100',
            points: 100,
            question: 'Berapakah hasil dari operasi bilangan bulat berikut: (-15) + 25 ?',
            hint: 'Utang 15 dibayar 25.',
            answer: '10 (Positif 10)',
            options: ['-40', '-10', '10', '40']
          },
          {
            id: 'sm-alj-200',
            points: 200,
            question: 'Jika diketahui persamaan: 2x + 5 = 17, maka berapakah nilai x ?',
            hint: '2x = 17 - 5 = 12.',
            answer: 'x = 6',
            options: ['x = 4', 'x = 5', 'x = 6', 'x = 11']
          },
          {
            id: 'sm-alj-300',
            points: 300,
            question: 'Berapakah nilai dari: 2 pangkat 4 (2⁴) ditambah 3 pangkat 2 (3²) ?',
            hint: '2⁴ = 16 dan 3² = 9.',
            answer: '25 (Karena 16 + 9 = 25)',
            options: ['14', '22', '25', '32']
          },
          {
            id: 'sm-alj-400',
            points: 400,
            question: 'Perbandingan kelereng Andi dan Budi adalah 2 : 3. Jika jumlah kelereng mereka berdua adalah 25 butir, berapakah jumlah kelereng Budi?',
            hint: 'Jumlah perbandingan = 2 + 3 = 5. Kelereng Budi = (3/5) × 25.',
            answer: '15 butir (Andi 10 butir, Budi 15 butir)',
            options: ['10 butir', '12 butir', '15 butir', '18 butir']
          },
          {
            id: 'sm-alj-500',
            points: 500,
            question: 'Dalam satu kelas yang terdiri dari 30 siswa, 18 siswa gemar futsal, 15 siswa gemar basket, dan 5 siswa gemar KEDUANYA. Berapa siswa yang TIDAK gemar futsal maupun basket?',
            hint: 'Hanya futsal = 18-5 = 13. Hanya basket = 15-5 = 10. Total yang gemar = 13 + 10 + 5 = 28.',
            answer: '2 siswa (Karena 30 - 28 = 2 siswa)',
            options: ['2 siswa', '3 siswa', '5 siswa', '7 siswa']
          }
        ]
      },
      {
        id: 'sm-geometri',
        title: 'GEOMETRI & RUANG',
        icon: 'fa-shapes',
        color: '#a855f7',
        bgHeader: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
        items: [
          {
            id: 'sm-geo-100',
            points: 100,
            question: 'Berapakah total jumlah ketiga sudut di dalam sebuah bangun datar SEGITIGA apa pun?',
            hint: '90 derajat, 180 derajat, atau 360 derajat?',
            answer: '180 derajat (180°)',
            options: ['90°', '180°', '270°', '360°']
          },
          {
            id: 'sm-geo-200',
            points: 200,
            question: 'Sebuah segitiga memiliki alas 10 cm dan tinggi 8 cm. Berapakah LUAS segitiga tersebut?',
            hint: 'Rumus luas segitiga = ½ × alas × tinggi.',
            answer: '40 cm²',
            options: ['18 cm²', '40 cm²', '80 cm²', '100 cm²']
          },
          {
            id: 'sm-geo-300',
            points: 300,
            question: 'Sebuah bangun ruang KUBUS memiliki panjang rusuk 5 cm. Berapakah VOLUME kubus tersebut?',
            hint: 'Volume kubus = s × s × s (5 × 5 × 5).',
            answer: '125 cm³',
            options: ['25 cm³', '75 cm³', '125 cm³', '150 cm³']
          },
          {
            id: 'sm-geo-400',
            points: 400,
            question: 'Berdasarkan Teorema Pythagoras, jika sebuah segitiga siku-siku memiliki sisi tegak 3 cm dan sisi alas 4 cm, berapakah panjang sisi miringnya (hipotenusa)?',
            hint: 'Tripel Pythagoras paling terkenal: 3, 4, dan ...?',
            answer: '5 cm (Karena √(3² + 4²) = √(9 + 16) = √25 = 5)',
            options: ['5 cm', '6 cm', '7 cm', '12 cm']
          },
          {
            id: 'sm-geo-500',
            points: 500,
            question: 'Sebuah lingkaran memiliki jari-jari (r) sepanjang 7 cm. Dengan menggunakan π = 22/7, berapakah LUAS lingkaran tersebut?',
            hint: 'Luas lingkaran = π × r × r = (22/7) × 7 × 7.',
            answer: '154 cm²',
            options: ['44 cm²', '88 cm²', '154 cm²', '308 cm²']
          }
        ]
      },
      {
        id: 'sm-logika',
        title: 'TEBAK NALAR CERIA',
        icon: 'fa-brain',
        color: '#ec4899',
        bgHeader: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
        items: [
          {
            id: 'sm-log-100',
            points: 100,
            question: 'Benda apakah yang lebih berat: 1 kilogram kapas atau 1 kilogram besi?',
            hint: 'Perhatikan satuan berat keduanya!',
            answer: 'Sama berat! (Sama-sama 1 kilogram)',
            options: ['1 kg besi', '1 kg kapas', 'Sama berat (1 kg)', 'Tergantung angin']
          },
          {
            id: 'sm-log-200',
            points: 200,
            question: 'Dalam sebuah lomba lari, kamu berhasil menyalip peserta yang berada di posisi ke-2. Sekarang kamu berada di posisi ke berapa?',
            hint: 'Jika kamu menyalip orang ke-2, kamu menggantikan posisinya.',
            answer: 'Posisi ke-2! (Bukan ke-1, karena yang disalip adalah posisi ke-2)',
            options: ['Posisi ke-1', 'Posisi ke-2', 'Posisi ke-3', 'Juara Umum']
          },
          {
            id: 'sm-log-300',
            points: 300,
            question: 'Ibu Rina memiliki 4 orang anak perempuan: Lala, Lili, Lulu, dan ... Siapakah nama anak keempat?',
            hint: 'Baca kembali kalimat pertama soal dengan teliti!',
            answer: 'Rina! ("Ibu Rina memiliki 4 orang anak...")',
            options: ['Lele', 'Lolo', 'Rina', 'Lela']
          },
          {
            id: 'sm-log-400',
            points: 400,
            question: 'Ada 12 bulan dalam satu tahun. Beberapa bulan memiliki 31 hari, beberapa memiliki 30 hari. Berapa banyak bulan dalam setahun yang memiliki tanggal 28?',
            hint: 'Apakah bulan Januari, Maret, April juga melewati tanggal 28?',
            answer: 'Semua 12 bulan! (Setiap bulan dari Januari s.d. Desember pasti memiliki tanggal 28)',
            options: ['Hanya 1 bulan (Februari)', '6 bulan', '7 bulan', 'Semua 12 bulan']
          },
          {
            id: 'sm-log-500',
            points: 500,
            question: 'Seekor katak terjebak di dasar sumur sedalam 10 meter. Setiap pagi katak melompat naik 3 meter, namun setiap malam ia tergelincir turun 2 meter. Pada hari ke berapakah katak berhasil keluar mencapai bibir sumur?',
            hint: 'Setiap hari bersihnya naik 1 meter. Di akhir hari ke-7 posisinya sudah di 7 meter. Lalu pada pagi hari ke-8 ia melompat +3 meter...',
            answer: 'Hari ke-8! (Karena di akhir hari ke-7 ia di ketinggian 7 meter, lalu pagi hari ke-8 melompat naik 3 meter langsung mencapai 10 meter dan keluar!)',
            options: ['Hari ke-8', 'Hari ke-9', 'Hari ke-10', 'Hari ke-12']
          }
        ]
      }
    ]
  },

  // =========================================================================
  // PAKET 3: EDISI PAI, BAHASA INGGRIS & SOSIAL KEBANGSAAN (KELAS 7 - 9)
  // =========================================================================
  {
    id: 'pack-pai-sosial',
    name: 'Paket 3: Arena PAI, English & Kebangsaan (Kelas 7–9)',
    subtitle: 'Al-Qur\'an & Fikih, Sejarah Islam, English Fun, Pancasila, & Geografi',
    badge: 'PAI, BAHASA & IPS',
    categories: [
      {
        id: 'ps-fikih',
        title: 'QUR\'AN & FIKIH',
        icon: 'fa-quran',
        color: '#10b981',
        bgHeader: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
        items: [
          {
            id: 'ps-fik-100',
            points: 100,
            question: 'Surah apakah yang merupakan surah pertama dalam urutan mushaf Al-Qur\'an dan wajib dibaca pada setiap rakaat salat?',
            hint: 'Artinya "Pembukaan" dan terdiri dari 7 ayat.',
            answer: 'Surah Al-Fatihah',
            options: ['Surah Al-Baqarah', 'Surah Al-Fatihah', 'Surah Al-Ikhlas', 'Surah Al-Alaq']
          },
          {
            id: 'ps-fik-200',
            points: 200,
            question: 'Apabila seseorang sedang bepergian jauh (musafir) atau tidak menemukan air karena sakit, ia diperbolehkan bersuci menggantikan wudhu menggunakan debu yang suci. Disebut apakah cara bersuci ini?',
            hint: 'Wudhu, Mandi Wajib, atau Tayamum?',
            answer: 'Tayamum',
            options: ['Istinja', 'Tayamum', 'Thaharah Air', 'Mandi Sunnah']
          },
          {
            id: 'ps-fik-300',
            points: 300,
            question: 'Mengumpulkan dua salat fardhu (misalnya salat Dzuhur dan Ashar) untuk dikerjakan dalam satu waktu salat karena sedang dalam perjalanan jauh disebut salat...',
            hint: 'Salat Jamak atau Salat Qashar?',
            answer: 'Salat Jamak (Jamak Taqdim / Jamak Takhir)',
            options: ['Salat Jamak', 'Salat Qashar', 'Salat Khauf', 'Salat Jenazah']
          },
          {
            id: 'ps-fik-400',
            points: 400,
            question: 'Zakat yang wajib dikeluarkan oleh setiap jiwa umat Islam menjelang Hari Raya Idul Fitri berupa makanan pokok (beras) seberat 2,5 kg atau 3,5 liter disebut zakat...',
            hint: 'Zakat Mal atau Zakat Fitrah?',
            answer: 'Zakat Fitrah',
            options: ['Zakat Mal', 'Zakat Fitrah', 'Zakat Profesi', 'Sedekah Jariyah']
          },
          {
            id: 'ps-fik-500',
            points: 500,
            question: 'Dalam ibadah Haji, berdiam diri di Padang Arafah pada tanggal 9 Dzulhijjah yang merupakan rukun puncak ibadah haji ("Haji adalah Arafah") disebut ibadah...',
            hint: 'Thawaf, Sa\'i, Wukuf, atau Tahallul?',
            answer: 'Wukuf di Padang Arafah',
            options: ['Thawaf Ifadah', 'Sa\'i', 'Wukuf di Arafah', 'Melontar Jumrah']
          }
        ]
      },
      {
        id: 'ps-ski',
        title: 'SEJARAH ISLAM (SKI)',
        icon: 'fa-star-and-crescent',
        color: '#f59e0b',
        bgHeader: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
        items: [
          {
            id: 'ps-ski-100',
            points: 100,
            question: 'Pada tanggal 12 Rabiul Awal Tahun Gajah, Nabi Muhammad SAW dilahirkan di kota...',
            hint: 'Kota suci tempat berdirinya Ka\'bah.',
            answer: 'Kota Makkah',
            options: ['Makkah', 'Madinah', 'Thaif', 'Yerusalem']
          },
          {
            id: 'ps-ski-200',
            points: 200,
            question: 'Masjid pertama yang dibangun oleh Nabi Muhammad SAW bersama para sahabat ketika tiba di daerah Quba (dekat Madinah) saat perjalanan hijrah adalah...',
            hint: 'Namanya sesuai dengan nama desa tempat masjid itu berdiri.',
            answer: 'Masjid Quba',
            options: ['Masjid Nabawi', 'Masjid Quba', 'Masjid Qiblatain', 'Masjidil Haram']
          },
          {
            id: 'ps-ski-300',
            points: 300,
            question: 'Siapakah Khalifah kedua dari Khulafaur Rasyidin yang mendapat gelar "Al-Faruq" (Pembeda antara yang hak dan yang batil) serta menetapkan kalender tahun Hijriah?',
            hint: 'Abu Bakar, Umar bin Khattab, Utsman bin Affan, atau Ali bin Abi Thalib?',
            answer: 'Umar bin Khattab r.a.',
            options: ['Abu Bakar Ash-Shiddiq', 'Umar bin Khattab', 'Utsman bin Affan', 'Ali bin Abi Thalib']
          },
          {
            id: 'ps-ski-400',
            points: 400,
            question: 'Kerajaan Islam pertama di Nusantara yang terletak di pesisir utara Aceh dan didirikan oleh Sultan Malik Al-Saleh pada abad ke-13 adalah Kerajaan...',
            hint: 'Samudera Pasai, Demak, atau Gowa-Tallo?',
            answer: 'Kerajaan Samudera Pasai',
            options: ['Kerajaan Demak', 'Kerajaan Samudera Pasai', 'Kesultanan Banten', 'Kesultanan Ternate']
          },
          {
            id: 'ps-ski-500',
            points: 500,
            question: 'Panglima Islam pemberani yang berhasil membebaskan kota suci Baitul Maqdis (Yerusalem) pada masa Perang Salib dengan penuh kasih sayang dan toleransi adalah...',
            hint: 'Beliau merupakan pendiri Dinasti Ayyubiyah.',
            answer: 'Shalahuddin Al-Ayyubi (Saladin)',
            options: ['Thariq bin Ziyad', 'Shalahuddin Al-Ayyubi', 'Muhammad Al-Fatih', 'Harun Ar-Rasyid']
          }
        ]
      },
      {
        id: 'ps-english',
        title: 'ENGLISH FUN',
        icon: 'fa-language',
        color: '#38bdf8',
        bgHeader: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
        items: [
          {
            id: 'ps-eng-100',
            points: 100,
            question: 'What is the opposite (lawan kata) of the word "EXPENSIVE" (Mahal) in English?',
            hint: 'Berawalan huruf C (Murah).',
            answer: 'Cheap (Murah)',
            options: ['Cheap', 'Fast', 'Heavy', 'Large']
          },
          {
            id: 'ps-eng-200',
            points: 200,
            question: 'Lengkapi kalimat bahasa Inggris berikut dengan kata kerja lampau (Past Tense) yang benar: "Yesterday, Siti and her friends ... (pergi) to the museum."',
            hint: 'Bentuk ke-2 (Verb 2) dari kata "Go".',
            answer: 'Went ("Yesterday, Siti and her friends went to the museum")',
            options: ['Go', 'Goes', 'Going', 'Went']
          },
          {
            id: 'ps-eng-300',
            points: 300,
            question: 'I am a profession. I work in a hospital, I wear a white coat, and I examine sick patients to help them get well. Who am I?',
            hint: 'A teacher, a chef, a pilot, or a doctor?',
            answer: 'A Doctor (Dokter)',
            options: ['A Teacher', 'A Doctor', 'An Architect', 'A Pilot']
          },
          {
            id: 'ps-eng-400',
            points: 400,
            question: 'Jika sekarang jam menunjukkan pukul 07.30 (Setengah Delapan), bagaimanakah cara mengucapkannya dalam Bahasa Inggris?',
            hint: 'Half past ...',
            answer: 'Half past seven (atau Seven thirty)',
            options: ['A quarter past seven', 'Half past seven', 'Half past eight', 'A quarter to eight']
          },
          {
            id: 'ps-eng-500',
            points: 500,
            question: 'Jika kamu melihat rambu peringatan di laboratorium bertuliskan "DO NOT LITTER", apakah arti larangan tersebut dalam Bahasa Indonesia?',
            hint: 'Litter = sampah yang berserakan.',
            answer: 'Dilarang membuang sampah sembarangan!',
            options: [
              'Dilarang berisik di ruangan',
              'Dilarang membuang sampah sembarangan',
              'Dilarang membawa makanan dan minuman',
              'Dilarang menginjak rumput'
            ]
          }
        ]
      },
      {
        id: 'ps-pkn',
        title: 'PANCASILA & PKN',
        icon: 'fa-shield-alt',
        color: '#a855f7',
        bgHeader: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)',
        items: [
          {
            id: 'ps-pkn-100',
            points: 100,
            question: 'Apakah bunyi semboyan bangsa Indonesia yang tertulis pada pita yang dicengkeram oleh Burung Garuda Pancasila?',
            hint: 'Artinya: Berbeda-beda tetapi tetap satu jua.',
            answer: 'Bhinneka Tunggal Ika',
            options: ['Tut Wuri Handayani', 'Bhinneka Tunggal Ika', 'Kartika Eka Paksi', 'Jalesveva Jayamahe']
          },
          {
            id: 'ps-pkn-200',
            points: 200,
            question: 'Setiap tanggal berapakah bangsa Indonesia memperingati Hari Lahir Pancasila?',
            hint: 'Bertepatan dengan pidato Ir. Soekarno pada sidang BPUPKI tahun 1945 di awal bulan Juni.',
            answer: '1 Juni',
            options: ['20 Mei', '1 Juni', '17 Agustus', '1 Oktober']
          },
          {
            id: 'ps-pkn-300',
            points: 300,
            question: 'Membantu korban bencana alam dan menjenguk teman sekelas yang sedang sakit merupakan contoh pengamalan Pancasila terutama sila ke-...',
            hint: 'Kemanusiaan yang adil dan beradab.',
            answer: 'Sila ke-2 ("Kemanusiaan yang adil dan beradab")',
            options: ['Sila ke-1', 'Sila ke-2', 'Sila ke-4', 'Sila ke-5']
          },
          {
            id: 'ps-pkn-400',
            points: 400,
            question: 'Hukum dasar tertulis tertinggi yang menjadi sumber dari segala peraturan perundang-undangan di Negara Kesatuan Republik Indonesia adalah...',
            hint: 'Disahkan oleh PPKI pada tanggal 18 Agustus 1945.',
            answer: 'UUD Negara Republik Indonesia Tahun 1945 (UUD 1945)',
            options: ['Peraturan Pemerintah', 'UUD 1945', 'Keputusan Presiden', 'Peraturan Daerah']
          },
          {
            id: 'ps-pkn-500',
            points: 500,
            question: 'Dalam sistem ketatanegaraan Indonesia, lembaga negara yang bertugas membuat Undang-Undang bersama Presiden serta mengawasi jalannya pemerintahan adalah...',
            hint: 'DPR, MA, atau MK?',
            answer: 'DPR (Dewan Perwakilan Rakyat)',
            options: ['DPR (Dewan Perwakilan Rakyat)', 'MA (Mahkamah Agung)', 'BPK (Badan Pemeriksa Keuangan)', 'KPU']
          }
        ]
      },
      {
        id: 'ps-geografi',
        title: 'JELAJAH INDONESIA',
        icon: 'fa-map-marked-alt',
        color: '#ec4899',
        bgHeader: 'linear-gradient(135deg, #db2777 0%, #be185d 100%)',
        items: [
          {
            id: 'ps-geo-100',
            points: 100,
            question: 'Secara geografis, kepulauan Indonesia terletak di antara dua samudra besar dunia, yaitu Samudra Hindia dan Samudra...',
            hint: 'Samudra terluas di dunia yang berada di sebelah timur laut Indonesia.',
            answer: 'Samudra Pasifik',
            options: ['Samudra Atlantik', 'Samudra Pasifik', 'Samudra Arktik', 'Samudra Antartika']
          },
          {
            id: 'ps-geo-200',
            points: 200,
            question: 'Danau vulkanik terbesar di Indonesia dan Asia Tenggara yang di tengahnya terdapat Pulau Samosir terletak di Provinsi Sumatera Utara. Apakah nama danau tersebut?',
            hint: 'Danau Singkarak, Danau Toba, atau Danau Sentani?',
            answer: 'Danau Toba',
            options: ['Danau Toba', 'Danau Maninjau', 'Danau Singkarak', 'Danau Poso']
          },
          {
            id: 'ps-geo-300',
            points: 300,
            question: 'Garis khayal lintang 0 derajat (0°) yang membelah bumi menjadi belahan bumi utara dan selatan serta melewati Kota Pontianak di Kalimantan Barat disebut garis...',
            hint: 'Garis Khatulistiwa / Ekuator.',
            answer: 'Garis Khatulistiwa (Ekuator)',
            options: ['Garis Bujur Timur', 'Garis Khatulistiwa (Ekuator)', 'Garis Wallace', 'Garis Balik Utara']
          },
          {
            id: 'ps-geo-400',
            points: 400,
            question: 'Hewan purba kadal raksasa endemik Indonesia yang hanya hidup di habitat aslinya di Pulau Komodo, Rinca, dan Flores berada di provinsi mana?',
            hint: 'NTB atau NTT?',
            answer: 'Nusa Tenggara Timur (NTT)',
            options: ['Bali', 'Nusa Tenggara Barat (NTB)', 'Nusa Tenggara Timur (NTT)', 'Maluku']
          },
          {
            id: 'ps-geo-500',
            points: 500,
            question: 'Sungai terpanjang di Indonesia yang membentang sepanjang 1.143 kilometer di Provinsi Kalimantan Barat adalah Sungai...',
            hint: 'Sungai Musi, Sungai Mahakam, atau Sungai Kapuas?',
            answer: 'Sungai Kapuas',
            options: ['Sungai Musi', 'Sungai Bengawan Solo', 'Sungai Mahakam', 'Sungai Kapuas']
          }
        ]
      }
    ]
  }
];

