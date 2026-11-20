export type MathGradeId = 'kelas-7' | 'kelas-8' | 'kelas-9';
export type MathChallengeType = 'forge' | 'equation' | 'geometry' | 'logic';

export interface MathTeam {
  id: number;
  name: string;
  color: string;
  bgLight: string;
  icon: string;
  score: number;
  hp: number;
  maxHp: number;
  shield: number;
  streak: number;
  sectorsOwned: number;
  skills: {
    eliminate2: boolean;
    shieldBoost: boolean;
    doubleCannon: boolean;
  };
}

export interface MathSectorItem {
  id: string;
  sectorCode: string;
  title: string;
  topic: string;
  grade: MathGradeId;
  type: MathChallengeType;
  points: number;
  cannonDamage: number;
  timeLimit: number;
  formulaBadge?: string;
  forgeNumbers?: number[];
  forgeTarget?: number;
  question: string;
  options: string[];
  answer: string;
  numericAnswer?: string;
  hint: string;
  explanation: string;
  isCriticalTower?: boolean;
}

export interface MathGradePack {
  id: MathGradeId;
  name: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  sectors: MathSectorItem[];
}

export interface MathLog {
  id: string;
  timestamp: string;
  teamName: string;
  teamColor: string;
  text: string;
  type: 'info' | 'success' | 'danger' | 'attack' | 'system';
}

export interface MathSession {
  id: string;
  name: string;
  kelas: string;
  savedAt: string;
  selectedGradeId: MathGradeId;
  currentTurn: number;
  round: number;
  teams: MathTeam[];
  sectorOwners: Record<string, number>;
  solvedSectorIds: string[];
  logs: MathLog[];
}

export interface MathSaveSlot {
  id: string;
  name: string;
  date: string;
  session: MathSession;
}

export const INITIAL_MATH_TEAMS: MathTeam[] = [
  {
    id: 0,
    name: 'Regu Al-Khawarizmi',
    color: '#06b6d4',
    bgLight: 'rgba(6, 182, 212, 0.14)',
    icon: 'fa-square-root-alt',
    score: 0,
    hp: 1000,
    maxHp: 1000,
    shield: 200,
    streak: 0,
    sectorsOwned: 0,
    skills: { eliminate2: true, shieldBoost: true, doubleCannon: true },
  },
  {
    id: 1,
    name: 'Regu Ibnu Sina',
    color: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.14)',
    icon: 'fa-drafting-compass',
    score: 0,
    hp: 1000,
    maxHp: 1000,
    shield: 200,
    streak: 0,
    sectorsOwned: 0,
    skills: { eliminate2: true, shieldBoost: true, doubleCannon: true },
  },
  {
    id: 2,
    name: 'Regu Al-Karaji',
    color: '#f59e0b',
    bgLight: 'rgba(245, 158, 11, 0.14)',
    icon: 'fa-calculator',
    score: 0,
    hp: 1000,
    maxHp: 1000,
    shield: 200,
    streak: 0,
    sectorsOwned: 0,
    skills: { eliminate2: true, shieldBoost: true, doubleCannon: true },
  },
  {
    id: 3,
    name: 'Regu Umar Khayyam',
    color: '#f43f5e',
    bgLight: 'rgba(244, 63, 94, 0.14)',
    icon: 'fa-infinity',
    score: 0,
    hp: 1000,
    maxHp: 1000,
    shield: 200,
    streak: 0,
    sectorsOwned: 0,
    skills: { eliminate2: true, shieldBoost: true, doubleCannon: true },
  },
];

export const MATH_GRADE_PACKS: MathGradePack[] = [
  // =========================================================================
  // PAKET KELAS 7 — FONDASI BILANGAN, ALJABAR & GEOMETRI DASAR
  // =========================================================================
  {
    id: 'kelas-7',
    name: 'Kelas 7 — Fondasi Aljabar',
    subtitle: 'Bilangan Bulat & Pecahan, PLSV, Perbandingan, Aritmetika Sosial, Sudut & Bangun Datar',
    badge: 'MTs Kelas 7',
    accentColor: '#06b6d4',
    sectors: [
      {
        id: 'k7-s01',
        sectorCode: 'S-01',
        title: 'Termometer Puncak',
        topic: 'Bilangan Bulat',
        grade: 'kelas-7',
        type: 'logic',
        points: 150,
        cannonDamage: 120,
        timeLimit: 45,
        formulaBadge: 'Suhu Akhir = Suhu Awal + Kenaikan − Penurunan',
        question: 'Suhu udara di puncak gunung pada malam hari tercatat −6°C. Saat siang hari suhunya naik 14°C, lalu pada sore hari turun lagi 5°C. Berapa °C suhu di puncak gunung pada sore hari?',
        options: ['A. −3°C', 'B. 3°C', 'C. 5°C', 'D. 13°C'],
        answer: 'B. 3°C',
        numericAnswer: '3',
        hint: 'Hitung berurutan dari kiri ke kanan: −6 + 14 − 5.',
        explanation: '−6 + 14 = +8°C pada siang hari. Sore hari turun 5°C: 8 − 5 = 3°C.',
      },
      {
        id: 'k7-s02',
        sectorCode: 'S-02',
        title: 'Tempa Target 24',
        topic: 'Operasi Hitung',
        grade: 'kelas-7',
        type: 'forge',
        points: 200,
        cannonDamage: 150,
        timeLimit: 60,
        formulaBadge: 'Target Angka = 24 | Kartu: [2, 3, 4, 6]',
        forgeNumbers: [2, 3, 4, 6],
        forgeTarget: 24,
        question: 'Gunakan kartu angka [2, 3, 4, 6] masing-masing tepat satu kali dengan operasi (+, −, ×, ÷) untuk menghasilkan Target 24! Manakah ekspresi berikut yang hasilnya tepat 24?',
        options: [
          'A. (6 + 4) × 2 + 3',
          'B. (6 × 4) ÷ (3 − 2)',
          'C. (4 + 3) × 6 ÷ 2',
          'D. 6 × 3 + 4 − 2',
        ],
        answer: 'B. (6 × 4) ÷ (3 − 2)',
        numericAnswer: '24',
        hint: 'Cari perkalian dua bilangan yang menghasilkan 24, lalu buat bilangan sisanya menjadi 1.',
        explanation: '(6 × 4) = 24, sedangkan (3 − 2) = 1. Maka 24 ÷ 1 = 24.',
      },
      {
        id: 'k7-s03',
        sectorCode: 'S-03',
        title: 'Kunci Linear x',
        topic: 'Aljabar & PLSV',
        grade: 'kelas-7',
        type: 'equation',
        points: 200,
        cannonDamage: 150,
        timeLimit: 60,
        formulaBadge: '3x − 7 = 2x + 9  →  Tentukan nilai (2x + 5)',
        question: 'Jika x adalah penyelesaian dari persamaan linear 3x − 7 = 2x + 9, maka nilai dari 2x + 5 adalah...',
        options: ['A. 16', 'B. 27', 'C. 37', 'D. 41'],
        answer: 'C. 37',
        numericAnswer: '37',
        hint: 'Kumpulkan suku bervariabel x di ruas kiri dan konstanta di ruas kanan terlebih dahulu.',
        explanation: '3x − 2x = 9 + 7 ⇒ x = 16. Substitusikan x = 16 ke 2x + 5 = 2(16) + 5 = 37.',
      },
      {
        id: 'k7-s04',
        sectorCode: 'S-04',
        title: 'Benteng Sudut Pelurus',
        topic: 'Garis & Sudut',
        grade: 'kelas-7',
        type: 'geometry',
        points: 250,
        cannonDamage: 170,
        timeLimit: 60,
        formulaBadge: '∠AOB + ∠BOC = 180° (Berpelurus)',
        question: 'Sudut ∠AOB dan ∠BOC saling berpelurus. Jika besar ∠AOB = (3x + 15)° dan ∠BOC = (2x + 15)°, maka besar sudut ∠AOB adalah...',
        options: ['A. 75°', 'B. 95°', 'C. 105°', 'D. 115°'],
        answer: 'C. 105°',
        numericAnswer: '105',
        hint: 'Jumlah dua sudut saling berpelurus adalah 180°.',
        explanation: '(3x + 15) + (2x + 15) = 180 ⇒ 5x + 30 = 180 ⇒ 5x = 150 ⇒ x = 30. Jadi ∠AOB = 3(30) + 15 = 105°.',
      },
      {
        id: 'k7-s05',
        sectorCode: 'S-05',
        title: 'Gudang Logistik Kurma',
        topic: 'Pecahan & Persentase',
        grade: 'kelas-7',
        type: 'logic',
        points: 200,
        cannonDamage: 150,
        timeLimit: 60,
        formulaBadge: 'Total = 48 kg | 1/3 Yatim | 25% Sisa Tetangga',
        question: 'Koperasi madrasah memiliki 48 kg kurma. Sebanyak 1/3 bagian disalurkan ke panti yatim, lalu 25% dari SISANYA diberikan kepada tetangga. Berapa kg kurma yang tersisa sekarang?',
        options: ['A. 12 kg', 'B. 18 kg', 'C. 20 kg', 'D. 24 kg'],
        answer: 'D. 24 kg',
        numericAnswer: '24',
        hint: 'Hitung dulu sisa kurma setelah dikurangi 1/3 bagian (16 kg), baru ambil 25% dari sisa itu.',
        explanation: 'Untuk yatim: 1/3 × 48 = 16 kg. Sisa sementara = 48 − 16 = 32 kg. Untuk tetangga: 25% × 32 = 8 kg. Sisa akhir = 32 − 8 = 24 kg.',
      },
      {
        id: 'k7-s06',
        sectorCode: 'S-06',
        title: 'Menara Proyek Harian',
        topic: 'Perbandingan Berbalik Nilai',
        grade: 'kelas-7',
        type: 'equation',
        points: 350,
        cannonDamage: 240,
        timeLimit: 90,
        isCriticalTower: true,
        formulaBadge: 'Beban Sisa = Pekerja × Sisa Hari Normal',
        question: 'MENARA KRITIS (2x)! Renovasi perpustakaan direncanakan selesai oleh 15 pekerja dalam 24 hari. Setelah bekerja 6 hari, pekerjaan terpaksa terhenti selama 3 hari karena hujan deras. Agar selesai tepat waktu, berapa TAMBAHAN pekerja yang diperlukan?',
        options: ['A. 2 orang', 'B. 3 orang', 'C. 4 orang', 'D. 5 orang'],
        answer: 'B. 3 orang',
        numericAnswer: '3',
        hint: 'Sisa hari normal = 24 − 6 = 18 hari. Karena terhenti 3 hari, sisa hari efektif tinggal 15 hari.',
        explanation: '15 pekerja × 18 hari = Total pekerja × 15 hari ⇒ Total pekerja = (15 × 18)/15 = 18 orang. Tambahan pekerja = 18 − 15 = 3 orang.',
      },
      {
        id: 'k7-s07',
        sectorCode: 'S-07',
        title: 'Bazar Diskon Ganda',
        topic: 'Aritmetika Sosial',
        grade: 'kelas-7',
        type: 'logic',
        points: 300,
        cannonDamage: 200,
        timeLimit: 75,
        formulaBadge: 'Diskon Ganda 20% + 10% (Bertahap)',
        question: 'Sebuah jaket almamater seharga Rp 200.000 mendapat diskon bertahap 20% + 10% pada acara bazar madrasah. Berapa harga yang harus dibayar setelah kedua diskon?',
        options: ['A. Rp 140.000', 'B. Rp 144.000', 'C. Rp 150.000', 'D. Rp 156.000'],
        answer: 'B. Rp 144.000',
        numericAnswer: '144000',
        hint: 'Diskon 20% + 10% bukan 30%! Hitung harga setelah diskon 20% dulu, lalu potong 10% dari hasil pertama.',
        explanation: 'Setelah diskon 20%: 80% × 200.000 = Rp 160.000. Diskon tambahan 10%: 90% × 160.000 = Rp 144.000.',
      },
      {
        id: 'k7-s08',
        sectorCode: 'S-08',
        title: 'Luas Benteng Aljabar',
        topic: 'Bangun Datar & Aljabar',
        grade: 'kelas-7',
        type: 'geometry',
        points: 300,
        cannonDamage: 200,
        timeLimit: 75,
        formulaBadge: 'p = (2x + 5) cm | l = (x + 1) cm | Keliling = 60 cm',
        question: 'Sebuah lapangan berbentuk persegi panjang memiliki ukuran panjang (2x + 5) cm dan lebar (x + 1) cm. Jika kelilingnya 60 cm, maka LUAS persegi panjang tersebut adalah...',
        options: ['A. 156 cm²', 'B. 168 cm²', 'C. 189 cm²', 'D. 210 cm²'],
        answer: 'C. 189 cm²',
        numericAnswer: '189',
        hint: 'Keliling = 2 × (p + l) = 60, sehingga p + l = 30. Cari x terlebih dulu.',
        explanation: '(2x + 5) + (x + 1) = 30 ⇒ 3x + 6 = 30 ⇒ x = 8. Panjang = 2(8)+5 = 21 cm, Lebar = 8+1 = 9 cm. Luas = 21 × 9 = 189 cm².',
      },
      {
        id: 'k7-s09',
        sectorCode: 'S-09',
        title: 'Tempa Target 36',
        topic: 'Operasi Campuran',
        grade: 'kelas-7',
        type: 'forge',
        points: 250,
        cannonDamage: 180,
        timeLimit: 60,
        formulaBadge: 'Target Angka = 36 | Kartu: [3, 5, 7, 8]',
        forgeNumbers: [3, 5, 7, 8],
        forgeTarget: 36,
        question: 'Rakit keempat kartu angka [3, 5, 7, 8] menggunakan operasi (+, −, ×, ÷) untuk membentuk Target 36! Manakah ekspresi berikut yang tepat bernilai 36?',
        options: [
          'A. 8 × 5 − (7 − 3)',
          'B. (8 + 5) × 3 − 7',
          'C. 7 × 5 + 8 − 3',
          'D. (7 + 3) × 5 − 8',
        ],
        answer: 'A. 8 × 5 − (7 − 3)',
        numericAnswer: '36',
        hint: 'Gunakan hasil perkalian 8 × 5 = 40, lalu kurangkan selisih kedua kartu sisanya.',
        explanation: '8 × 5 = 40 dan (7 − 3) = 4. Jadi 40 − 4 = 36.',
      },
      {
        id: 'k7-s10',
        sectorCode: 'S-10',
        title: 'Suar Mercusuar KPK',
        topic: 'FPB & KPK',
        grade: 'kelas-7',
        type: 'equation',
        points: 300,
        cannonDamage: 200,
        timeLimit: 60,
        formulaBadge: 'Periode: A = 12 dtk | B = 18 dtk | C = 24 dtk',
        question: 'Tiga lampu suar mercusuar berkedip periodik: lampu merah tiap 12 detik, kuning tiap 18 detik, dan hijau tiap 24 detik. Setelah ketiganya menyala serentak pada detik ke-0, setelah berapa detik ketiganya akan menyala serentak lagi?',
        options: ['A. 48 detik', 'B. 60 detik', 'C. 72 detik', 'D. 96 detik'],
        answer: 'C. 72 detik',
        numericAnswer: '72',
        hint: 'Cari Kelipatan Persekutuan Terkecil (KPK) dari 12, 18, dan 24.',
        explanation: '12 = 2²×3, 18 = 2×3², 24 = 2³×3. KPK = 2³ × 3² = 8 × 9 = 72 detik.',
      },
      {
        id: 'k7-s11',
        sectorCode: 'S-11',
        title: 'Logistik Netto Beras',
        topic: 'Bruto, Netto & Tara',
        grade: 'kelas-7',
        type: 'logic',
        points: 300,
        cannonDamage: 200,
        timeLimit: 60,
        formulaBadge: 'Netto = Bruto − Tara',
        question: 'Panitia bakti sosial membeli 5 karung beras dengan Bruto masing-masing 50 kg dan Tara sebesar 2%. Berapa kg total berat bersih (Netto) dari kelima karung beras tersebut?',
        options: ['A. 240 kg', 'B. 245 kg', 'C. 248 kg', 'D. 255 kg'],
        answer: 'B. 245 kg',
        numericAnswer: '245',
        hint: 'Total Bruto = 5 × 50 = 250 kg. Hitung 2% dari 250 kg sebagai Tara lalu kurangkan.',
        explanation: 'Total Bruto = 250 kg. Tara = 2% × 250 = 5 kg. Total Netto = 250 − 5 = 245 kg.',
      },
      {
        id: 'k7-s12',
        sectorCode: 'S-12',
        title: 'Menara Taman & Kolam',
        topic: 'Luas Bangun Gabungan',
        grade: 'kelas-7',
        type: 'geometry',
        points: 400,
        cannonDamage: 260,
        timeLimit: 75,
        isCriticalTower: true,
        formulaBadge: 'Persegi s = 14 m | Kolam Lingkaran d = 14 m (π = 22/7)',
        question: 'MENARA KRITIS (2x)! Sebuah taman berbentuk persegi dengan panjang sisi 14 m. Tepat di tengah taman dibuat kolam berbentuk lingkaran berdiameter 14 m. Berapa m² luas taman di LUAR kolam?',
        options: ['A. 38 m²', 'B. 42 m²', 'C. 54 m²', 'D. 84 m²'],
        answer: 'B. 42 m²',
        numericAnswer: '42',
        hint: 'Diameter 14 m berarti jari-jari r = 7 m. Luas sisa = Luas Persegi − Luas Lingkaran.',
        explanation: 'Luas Persegi = 14 × 14 = 196 m². Luas Lingkaran = (22/7) × 7 × 7 = 154 m². Sisa = 196 − 154 = 42 m².',
      },
      {
        id: 'k7-s13',
        sectorCode: 'S-13',
        title: 'Batas Pertidaksamaan',
        topic: 'PtLSV',
        grade: 'kelas-7',
        type: 'equation',
        points: 350,
        cannonDamage: 220,
        timeLimit: 60,
        formulaBadge: '4(x − 2) ≤ 2x + 6  (x bilangan bulat)',
        question: 'Nilai bilangan bulat TERBESAR x yang memenuhi pertidaksamaan 4(x − 2) ≤ 2x + 6 adalah...',
        options: ['A. 5', 'B. 6', 'C. 7', 'D. 8'],
        answer: 'C. 7',
        numericAnswer: '7',
        hint: 'Kalikan 4 ke dalam kurung dulu: 4x − 8 ≤ 2x + 6, lalu selesaikan seperti persamaan.',
        explanation: '4x − 8 ≤ 2x + 6 ⇒ 4x − 2x ≤ 6 + 8 ⇒ 2x ≤ 14 ⇒ x ≤ 7. Bilangan bulat terbesarnya adalah 7.',
      },
      {
        id: 'k7-s14',
        sectorCode: 'S-14',
        title: 'Irisan Himpunan 7A',
        topic: 'Himpunan & Diagram Venn',
        grade: 'kelas-7',
        type: 'logic',
        points: 400,
        cannonDamage: 240,
        timeLimit: 75,
        formulaBadge: 'n(S) = n(A) + n(B) − n(A∩B) + n(Komplemen)',
        question: 'Dari 36 siswa kelas 7A, terdapat 22 siswa gemar Matematika, 18 siswa gemar IPA, dan 6 siswa tidak gemar keduanya. Berapa banyak siswa yang gemar KEDUANYA (Matematika dan IPA)?',
        options: ['A. 6 siswa', 'B. 8 siswa', 'C. 10 siswa', 'D. 12 siswa'],
        answer: 'C. 10 siswa',
        numericAnswer: '10',
        hint: 'Siswa yang gemar minimal satu mapel = 36 − 6 = 30 siswa.',
        explanation: 'n(M∩I) = (22 + 18) − (36 − 6) = 40 − 30 = 10 siswa.',
      },
      {
        id: 'k7-s15',
        sectorCode: 'S-15',
        title: 'Tempa Target 50',
        topic: 'Strategi Bilangan',
        grade: 'kelas-7',
        type: 'forge',
        points: 450,
        cannonDamage: 260,
        timeLimit: 75,
        formulaBadge: 'Target Angka = 50 | Kartu: [4, 5, 6, 9]',
        forgeNumbers: [4, 5, 6, 9],
        forgeTarget: 50,
        question: 'Tantangan Tempa Angka! Susun keempat kartu [4, 5, 6, 9] tepat satu kali untuk menghasilkan Target 50. Ekspresi manakah yang bernilai tepat 50?',
        options: [
          'A. (9 + 5) × 4 − 6',
          'B. 9 × 6 − 5 + 4',
          'C. (9 − 4) × 6 + 5',
          'D. 6 × 5 + 9 × 4',
        ],
        answer: 'A. (9 + 5) × 4 − 6',
        numericAnswer: '50',
        hint: 'Coba cari bilangan yang bila dikalikan 4 hasilnya sedikit di atas 50, yaitu 56.',
        explanation: '(9 + 5) = 14, lalu 14 × 4 = 56, dan 56 − 6 = 50.',
      },
      {
        id: 'k7-s16',
        sectorCode: 'S-16',
        title: 'Bos: Rasio Tiga Sekawan',
        topic: 'Perbandingan Bertingkat',
        grade: 'kelas-7',
        type: 'equation',
        points: 500,
        cannonDamage: 320,
        timeLimit: 90,
        isCriticalTower: true,
        formulaBadge: 'Ali : Budi = 3 : 4 | Budi : Cici = 2 : 5',
        question: 'BENTENG BOS KELAS 7! Perbandingan uang Ali dan Budi adalah 3 : 4, sedangkan perbandingan uang Budi dan Cici adalah 2 : 5. Jika jumlah uang Ali dan Cici Rp 130.000, berapakah uang Budi?',
        options: ['A. Rp 30.000', 'B. Rp 40.000', 'C. Rp 50.000', 'D. Rp 60.000'],
        answer: 'B. Rp 40.000',
        numericAnswer: '40000',
        hint: 'Samakan angka rasio milik Budi (KPK dari 4 dan 2 adalah 4) menjadi Ali : Budi : Cici = 3 : 4 : 10.',
        explanation: 'Ali : Budi : Cici = 3 : 4 : 10. Jumlah bagian Ali + Cici = 3 + 10 = 13 bagian = Rp 130.000 ⇒ 1 bagian = Rp 10.000. Uang Budi = 4 × Rp 10.000 = Rp 40.000.',
      },
    ],
  },

  // =========================================================================
  // PAKET KELAS 8 — PENALARAN, RELASI & BANGUN RUANG DATAR
  // =========================================================================
  {
    id: 'kelas-8',
    name: 'Kelas 8 — Penalaran & Relasi',
    subtitle: 'Pola Bilangan, Pythagoras, Relasi & Fungsi, Gradien, SPLDV, Lingkaran, BRSD & Peluang',
    badge: 'MTs Kelas 8',
    accentColor: '#10b981',
    sectors: [
      {
        id: 'k8-s01',
        sectorCode: 'S-01',
        title: 'Sandi Fibonacci',
        topic: 'Pola Bilangan',
        grade: 'kelas-8',
        type: 'logic',
        points: 150,
        cannonDamage: 130,
        timeLimit: 45,
        formulaBadge: 'Barisan: 2, 5, 7, 12, 19, 31, ...',
        question: 'Perhatikan barisan bilangan berkode berikut: 2, 5, 7, 12, 19, 31, ... Bilangan berapakah yang tepat untuk mengisi suku selanjutnya?',
        options: ['A. 43', 'B. 48', 'C. 50', 'D. 52'],
        answer: 'C. 50',
        numericAnswer: '50',
        hint: 'Pola Fibonacci: tiap suku diperoleh dengan menjumlahkan dua suku tepat di depannya.',
        explanation: '2+5=7, 5+7=12, 7+12=19, 12+19=31. Maka suku berikutnya = 19 + 31 = 50.',
      },
      {
        id: 'k8-s02',
        sectorCode: 'S-02',
        title: 'Tempa Target 37',
        topic: 'Eksplorasi Operasi',
        grade: 'kelas-8',
        type: 'forge',
        points: 200,
        cannonDamage: 150,
        timeLimit: 60,
        formulaBadge: 'Target Angka = 37 | Kartu: [2, 4, 5, 9]',
        forgeNumbers: [2, 4, 5, 9],
        forgeTarget: 37,
        question: 'Rangkailah kartu [2, 4, 5, 9] tepat satu kali dengan operasi hitung sehingga menghasilkan Target 37! Pilihan manakah yang nilainya tepat 37?',
        options: [
          'A. 9 × 4 + 5 − 2',
          'B. (9 × 5) − (4 × 2)',
          'C. (9 + 4) × 2 + 5',
          'D. 5 × 4 + 9 + 2',
        ],
        answer: 'B. (9 × 5) − (4 × 2)',
        numericAnswer: '37',
        hint: 'Kalikan dua kartu terbesar (45) lalu kurangkan hasil kali dua kartu terkecil (8).',
        explanation: '(9 × 5) = 45 dan (4 × 2) = 8. Sehingga 45 − 8 = 37.',
      },
      {
        id: 'k8-s03',
        sectorCode: 'S-03',
        title: 'Radar Kapal Pythagoras',
        topic: 'Teorema Pythagoras',
        grade: 'kelas-8',
        type: 'geometry',
        points: 200,
        cannonDamage: 160,
        timeLimit: 60,
        formulaBadge: 'c = √(a² + b²)',
        question: 'Sebuah kapal patroli berlayar dari pelabuhan ke arah Timur sejauh 12 km, kemudian berbelok tegak lurus ke arah Utara sejauh 9 km. Berapa km jarak terpendek kapal dari pelabuhan awal?',
        options: ['A. 14 km', 'B. 15 km', 'C. 18 km', 'D. 21 km'],
        answer: 'B. 15 km',
        numericAnswer: '15',
        hint: 'Gunakan Tripel Pythagoras kelipatan dari (3, 4, 5).',
        explanation: 'c = √(12² + 9²) = √(144 + 81) = √225 = 15 km.',
      },
      {
        id: 'k8-s04',
        sectorCode: 'S-04',
        title: 'Dekoder Fungsi f(k)',
        topic: 'Relasi & Fungsi',
        grade: 'kelas-8',
        type: 'equation',
        points: 250,
        cannonDamage: 180,
        timeLimit: 60,
        formulaBadge: 'f(x) = 3x − 5 | Diketahui f(k) = 16',
        question: 'Diketahui rumus fungsi f(x) = 3x − 5. Jika f(k) = 16, maka nilai k yang memenuhi adalah...',
        options: ['A. 5', 'B. 6', 'C. 7', 'D. 8'],
        answer: 'C. 7',
        numericAnswer: '7',
        hint: 'Substitusikan x = k sehingga 3k − 5 = 16.',
        explanation: '3k − 5 = 16 ⇒ 3k = 21 ⇒ k = 7.',
      },
      {
        id: 'k8-s05',
        sectorCode: 'S-05',
        title: 'Formasi Kursi Aula',
        topic: 'Barisan Aritmetika',
        grade: 'kelas-8',
        type: 'logic',
        points: 250,
        cannonDamage: 180,
        timeLimit: 60,
        formulaBadge: 'Un = a + (n − 1)b',
        question: 'Dalam aula madrasah, baris paling depan terdapat 12 kursi. Setiap baris di belakangnya selalu bertambah 3 kursi dari baris di depannya. Berapa banyak kursi pada baris ke-10?',
        options: ['A. 36 kursi', 'B. 39 kursi', 'C. 42 kursi', 'D. 45 kursi'],
        answer: 'B. 39 kursi',
        numericAnswer: '39',
        hint: 'Gunakan U₁₀ = a + 9b dengan a = 12 dan beda b = 3.',
        explanation: 'U₁₀ = 12 + (10 − 1) × 3 = 12 + 27 = 39 kursi.',
      },
      {
        id: 'k8-s06',
        sectorCode: 'S-06',
        title: 'Menara Kritis SPLDV',
        topic: 'Sistem Persamaan Linear 2 Variabel',
        grade: 'kelas-8',
        type: 'equation',
        points: 350,
        cannonDamage: 250,
        timeLimit: 90,
        isCriticalTower: true,
        formulaBadge: '2b + 3p = 19.000 | b + 2p = 11.000',
        question: 'MENARA KRITIS (2x)! Di koperasi siswa, harga 2 buku tulis dan 3 pensil adalah Rp 19.000, sedangkan harga 1 buku tulis dan 2 pensil adalah Rp 11.000. Berapakah harga 3 buku tulis dan 1 pensil?',
        options: ['A. Rp 16.000', 'B. Rp 17.000', 'C. Rp 18.000', 'D. Rp 20.000'],
        answer: 'C. Rp 18.000',
        numericAnswer: '18000',
        hint: 'Kalikan persamaan kedua dengan 2 menjadi 2b + 4p = 22.000, lalu eliminasi dengan persamaan pertama!',
        explanation: '(2b + 4p) − (2b + 3p) = 22.000 − 19.000 ⇒ p = 3.000. Lalu b = 11.000 − 2(3.000) = 5.000. Jadi 3b + p = 15.000 + 3.000 = Rp 18.000.',
      },
      {
        id: 'k8-s07',
        sectorCode: 'S-07',
        title: 'Gradien Garis Serang',
        topic: 'Persamaan Garis Lurus',
        grade: 'kelas-8',
        type: 'geometry',
        points: 250,
        cannonDamage: 180,
        timeLimit: 60,
        formulaBadge: 'm = (y₂ − y₁) / (x₂ − x₁)',
        question: 'Berapakah gradien (kemiringan) garis lurus yang melalui titik koordinat A(−2, 5) dan titik B(4, 17)?',
        options: ['A. 1', 'B. 2', 'C. 3', 'D. 6'],
        answer: 'B. 2',
        numericAnswer: '2',
        hint: 'Hati-hati pada penyebutnya: 4 − (−2) = 4 + 2.',
        explanation: 'm = (17 − 5) / (4 − (−2)) = 12 / 6 = 2.',
      },
      {
        id: 'k8-s08',
        sectorCode: 'S-08',
        title: 'Rantai Roda GSPL',
        topic: 'Garis Singgung Lingkaran',
        grade: 'kelas-8',
        type: 'geometry',
        points: 350,
        cannonDamage: 220,
        timeLimit: 75,
        formulaBadge: 'GSPL = √(p² − (R − r)²)',
        question: 'Dua buah lingkaran memiliki jarak antar pusat p = 25 cm. Jika panjang jari-jari masing-masing lingkaran R = 14 cm dan r = 7 cm, berapa cm panjang Garis Singgung Persekutuan Luar (GSPL)-nya?',
        options: ['A. 20 cm', 'B. 21 cm', 'C. 24 cm', 'D. 26 cm'],
        answer: 'C. 24 cm',
        numericAnswer: '24',
        hint: 'Selisih jari-jari R − r = 14 − 7 = 7 cm. Pasangkan dengan jarak pusat 25 cm!',
        explanation: 'GSPL = √(25² − (14 − 7)²) = √(625 − 49) = √576 = 24 cm.',
      },
      {
        id: 'k8-s09',
        sectorCode: 'S-09',
        title: 'Nilai Siswa Susulan',
        topic: 'Statistika (Mean)',
        grade: 'kelas-8',
        type: 'logic',
        points: 300,
        cannonDamage: 200,
        timeLimit: 75,
        formulaBadge: 'Jumlah Nilai = Rata-rata × Banyak Siswa',
        question: 'Nilai rata-rata ulangan Matematika 15 siswa adalah 74. Ketika 1 siswa mengikuti ujian susulan dan nilainya digabungkan, rata-ratanya naik menjadi 75. Berapa nilai siswa susulan tersebut?',
        options: ['A. 85', 'B. 88', 'C. 90', 'D. 92'],
        answer: 'C. 90',
        numericAnswer: '90',
        hint: 'Selisihkan total nilai 16 siswa (16 × 75) dengan total nilai 15 siswa (15 × 74).',
        explanation: 'Total awal = 15 × 74 = 1.110. Total baru = 16 × 75 = 1.200. Nilai susulan = 1.200 − 1.110 = 90.',
      },
      {
        id: 'k8-s10',
        sectorCode: 'S-10',
        title: 'Tempa Target 52',
        topic: 'Operasi Strategis',
        grade: 'kelas-8',
        type: 'forge',
        points: 300,
        cannonDamage: 200,
        timeLimit: 60,
        formulaBadge: 'Target Angka = 52 | Kartu: [3, 6, 7, 8]',
        forgeNumbers: [3, 6, 7, 8],
        forgeTarget: 52,
        question: 'Susun kartu angka [3, 6, 7, 8] menggunakan operasi hitung agar bernilai tepat Target 52! Manakah rumus berikut yang benar?',
        options: [
          'A. (8 × 6) + (7 − 3)',
          'B. (7 × 6) + 8 − 3',
          'C. 8 × 7 − (6 + 3)',
          'D. (8 + 3) × 6 − 7',
        ],
        answer: 'A. (8 × 6) + (7 − 3)',
        numericAnswer: '52',
        hint: '8 × 6 = 48. Tambahkan 4 yang didapat dari selisih dua kartu lainnya.',
        explanation: '(8 × 6) = 48, dan (7 − 3) = 4. Jadi 48 + 4 = 52.',
      },
      {
        id: 'k8-s11',
        sectorCode: 'S-11',
        title: 'Sudut Pusat & Keliling',
        topic: 'Lingkaran',
        grade: 'kelas-8',
        type: 'geometry',
        points: 350,
        cannonDamage: 220,
        timeLimit: 60,
        formulaBadge: 'Sudut Pusat = 2 × Sudut Keliling',
        question: 'Sudut pusat ∠AOB dan sudut keliling ∠ACB menghadap busur AB yang sama. Jika ∠AOB = (4x + 12)° dan ∠ACB = 56°, tentukan nilai x!',
        options: ['A. 20', 'B. 22', 'C. 25', 'D. 28'],
        answer: 'C. 25',
        numericAnswer: '25',
        hint: 'Sudut pusat besarnya dua kali sudut keliling = 2 × 56° = 112°.',
        explanation: '4x + 12 = 2 × 56 ⇒ 4x + 12 = 112 ⇒ 4x = 100 ⇒ x = 25.',
      },
      {
        id: 'k8-s12',
        sectorCode: 'S-12',
        title: 'Menara Limas Persegi',
        topic: 'Bangun Ruang Sisi Datar',
        grade: 'kelas-8',
        type: 'geometry',
        points: 400,
        cannonDamage: 270,
        timeLimit: 90,
        isCriticalTower: true,
        formulaBadge: 'L = L_alas + 4 × L_segitiga tegak',
        question: 'MENARA KRITIS (2x)! Sebuah limas segi empat beraturan memiliki alas persegi dengan sisi 12 cm dan tinggi limas 8 cm. Berapa cm² luas permukaan seluruh limas tersebut?',
        options: ['A. 336 cm²', 'B. 360 cm²', 'C. 384 cm²', 'D. 420 cm²'],
        answer: 'C. 384 cm²',
        numericAnswer: '384',
        hint: 'Cari tinggi segitiga sisi tegak dengan Pythagoras dari tinggi limas (8 cm) dan setengah sisi alas (6 cm)!',
        explanation: 'Tinggi sisi tegak = √(8² + 6²) = 10 cm. Luas alas = 12×12 = 144. Luas 4 segitiga = 4 × (½×12×10) = 240. Total = 144 + 240 = 384 cm².',
      },
      {
        id: 'k8-s13',
        sectorCode: 'S-13',
        title: 'Peluang Dua Dadu',
        topic: 'Peluang Empirik & Teoretik',
        grade: 'kelas-8',
        type: 'logic',
        points: 350,
        cannonDamage: 220,
        timeLimit: 60,
        formulaBadge: 'n(S) Dua Dadu = 36',
        question: 'Dua buah dadu bermata enam dilempar undi secara bersamaan satu kali. Berapakah peluang munculnya kedua mata dadu berjumlah 9?',
        options: ['A. 1/6', 'B. 1/9', 'C. 1/12', 'D. 5/36'],
        answer: 'B. 1/9',
        hint: 'Daftarkan semua pasangan mata dadu yang berjumlah 9: (3,6), (4,5), (5,4), dan (6,3).',
        explanation: 'Ada 4 kejadian yang jumlahnya 9 dari 36 ruang sampel. Peluang P(A) = 4/36 = 1/9.',
      },
      {
        id: 'k8-s14',
        sectorCode: 'S-14',
        title: 'Pembelahan Koloni Amuba',
        topic: 'Barisan Geometri',
        grade: 'kelas-8',
        type: 'equation',
        points: 400,
        cannonDamage: 250,
        timeLimit: 75,
        formulaBadge: 'Nt = N₀ × 2ⁿ',
        question: 'Suatu jenis amuba membelah diri menjadi 2 setiap 15 menit. Jika mula-mula ada 5 ekor amuba, berapakah jumlah amuba setelah 1,5 jam?',
        options: ['A. 160 ekor', 'B. 240 ekor', 'C. 320 ekor', 'D. 640 ekor'],
        answer: 'C. 320 ekor',
        numericAnswer: '320',
        hint: '1,5 jam = 90 menit, sehingga amuba mengalami 90 ÷ 15 = 6 kali pembelahan.',
        explanation: 'Banyak pembelahan n = 6. Total = 5 × 2⁶ = 5 × 64 = 320 ekor.',
      },
      {
        id: 'k8-s15',
        sectorCode: 'S-15',
        title: 'Median + Jangkauan',
        topic: 'Statistika Penyebaran',
        grade: 'kelas-8',
        type: 'logic',
        points: 400,
        cannonDamage: 250,
        timeLimit: 75,
        formulaBadge: 'Data: 6, 8, 5, 7, 9, 8, 6, 10, 8',
        question: 'Diberikan data skor lomba: 6, 8, 5, 7, 9, 8, 6, 10, 8. Berapakah hasil penjumlahan antara Median dan Jangkauan (Range) dari data tersebut?',
        options: ['A. 12', 'B. 13', 'C. 14', 'D. 15'],
        answer: 'B. 13',
        numericAnswer: '13',
        hint: 'Urutkan terlebih dahulu ke-9 data dari yang terkecil ke terbesar!',
        explanation: 'Urutan: 5, 6, 6, 7, 8, 8, 8, 9, 10. Median (data ke-5) = 8. Jangkauan = 10 − 5 = 5. Jadi Median + Jangkauan = 8 + 5 = 13.',
      },
      {
        id: 'k8-s16',
        sectorCode: 'S-16',
        title: 'Bos: Kawat Kerangka Balok',
        topic: 'Optimasi BRSD',
        grade: 'kelas-8',
        type: 'geometry',
        points: 500,
        cannonDamage: 320,
        timeLimit: 90,
        isCriticalTower: true,
        formulaBadge: 'Panjang 1 Kerangka Balok = 4(p + l + t)',
        question: 'BENTENG BOS KELAS 8! Tono memiliki kawat sepanjang 4 meter (400 cm) untuk membuat kerangka balok identik berukuran 15 cm × 10 cm × 7 cm sebanyak mungkin. Berapa cm SISA kawat yang tidak terpakai?',
        options: ['A. 12 cm', 'B. 16 cm', 'C. 24 cm', 'D. 32 cm'],
        answer: 'B. 16 cm',
        numericAnswer: '16',
        hint: '1 kerangka balok butuh 4 × (15 + 10 + 7) = 128 cm. Cek berapa kali 128 muat ke dalam 400 cm!',
        explanation: '1 balok = 4(32) = 128 cm. Maksimal terbuat 3 balok = 3 × 128 = 384 cm. Sisa kawat = 400 − 384 = 16 cm.',
      },
    ],
  },

  // =========================================================================
  // PAKET KELAS 9 — TAKTIK TINGKAT TINGGI (EKSPONEN, KUADRAT, LENGKUNG)
  // =========================================================================
  {
    id: 'kelas-9',
    name: 'Kelas 9 — Taktik Tingkat Tinggi',
    subtitle: 'Eksponen & Bentuk Akar, Persamaan & Fungsi Kuadrat, Transformasi, Kesebangunan & BRSL',
    badge: 'MTs Kelas 9',
    accentColor: '#f59e0b',
    sectors: [
      {
        id: 'k9-s01',
        sectorCode: 'S-01',
        title: 'Reaktor Eksponen',
        topic: 'Bilangan Berpangkat',
        grade: 'kelas-9',
        type: 'equation',
        points: 150,
        cannonDamage: 130,
        timeLimit: 45,
        formulaBadge: '2⁵ + 3³ − 4²',
        question: 'Hitunglah nilai eksak dari operasi perpangkatan berikut: 2⁵ + 3³ − 4² = ...',
        options: ['A. 39', 'B. 43', 'C. 45', 'D. 51'],
        answer: 'B. 43',
        numericAnswer: '43',
        hint: 'Hitung masing-masing pangkat: 2⁵ = 32, 3³ = 27, dan 4² = 16.',
        explanation: '32 + 27 − 16 = 59 − 16 = 43.',
      },
      {
        id: 'k9-s02',
        sectorCode: 'S-02',
        title: 'Tempa Prima 41',
        topic: 'Kombinasi Bilangan Prima',
        grade: 'kelas-9',
        type: 'forge',
        points: 200,
        cannonDamage: 150,
        timeLimit: 60,
        formulaBadge: 'Target Prima = 41 | Kartu: [2, 3, 5, 7]',
        forgeNumbers: [2, 3, 5, 7],
        forgeTarget: 41,
        question: 'Gunakan keempat kartu bilangan prima [2, 3, 5, 7] tepat satu kali agar membentuk bilangan Target 41! Manakah ekspresi berikut yang benar?',
        options: [
          'A. (7 × 5) + (2 × 3)',
          'B. 7 × (5 + 2) − 3',
          'C. (7 + 5) × 3 + 2',
          'D. (7 + 3) × 5 − 2',
        ],
        answer: 'A. (7 × 5) + (2 × 3)',
        numericAnswer: '41',
        hint: 'Kalikan dua kartu terbesar (35), lalu tambahkan hasil kali dua kartu terkecil (6).',
        explanation: '(7 × 5) = 35 dan (2 × 3) = 6. Maka 35 + 6 = 41.',
      },
      {
        id: 'k9-s03',
        sectorCode: 'S-03',
        title: 'Fusi Bentuk Akar',
        topic: 'Bentuk Akar',
        grade: 'kelas-9',
        type: 'equation',
        points: 250,
        cannonDamage: 170,
        timeLimit: 60,
        formulaBadge: '√75 + 2√12 − √27',
        question: 'Bentuk paling sederhana dari operasi akar √75 + 2√12 − √27 adalah...',
        options: ['A. 4√3', 'B. 5√3', 'C. 6√3', 'D. 8√3'],
        answer: 'C. 6√3',
        hint: 'Ubah seluruh bilangan dalam akar menjadi kelipatan bilangan kuadrat kali 3.',
        explanation: '√75 = 5√3, 2√12 = 2(2√3) = 4√3, dan √27 = 3√3. Hasil = (5 + 4 − 3)√3 = 6√3.',
      },
      {
        id: 'k9-s04',
        sectorCode: 'S-04',
        title: 'Kunci Pangkat 243',
        topic: 'Persamaan Eksponen',
        grade: 'kelas-9',
        type: 'logic',
        points: 250,
        cannonDamage: 180,
        timeLimit: 60,
        formulaBadge: '3^(2x − 1) = 243  →  Nilai x² + 4',
        question: 'Diketahui persamaan eksponen 3^(2x − 1) = 243. Berapakah nilai dari x² + 4?',
        options: ['A. 8', 'B. 10', 'C. 13', 'D. 20'],
        answer: 'C. 13',
        numericAnswer: '13',
        hint: 'Ubah 243 menjadi bilangan berpangkat basis 3: 243 = 3⁵.',
        explanation: '2x − 1 = 5 ⇒ 2x = 6 ⇒ x = 3. Maka x² + 4 = 3² + 4 = 13.',
      },
      {
        id: 'k9-s05',
        sectorCode: 'S-05',
        title: 'Koordinat Refleksi',
        topic: 'Transformasi Geometri',
        grade: 'kelas-9',
        type: 'geometry',
        points: 250,
        cannonDamage: 180,
        timeLimit: 60,
        formulaBadge: 'Translasi T(a,b) → Refleksi Sumbu-X (x, −y)',
        question: 'Titik P(4, −3) ditranslasikan oleh T(−2, 5), kemudian bayangannya dicerminkan terhadap sumbu-X. Di manakah posisi akhir titik P tersebut?',
        options: ['A. (−2, 2)', 'B. (2, −2)', 'C. (−2, −2)', 'D. (2, 2)'],
        answer: 'B. (2, −2)',
        hint: 'Translasi dulu dengan menjumlahkan koordinat: (4−2, −3+5). Lalu cerminkan terhadap sumbu-X dengan mengubah tanda y!',
        explanation: 'Setelah translasi: P′(4+(−2), −3+5) = (2, 2). Dicerminkan terhadap sumbu-X: P″(2, −2).',
      },
      {
        id: 'k9-s06',
        sectorCode: 'S-06',
        title: 'Menara Kuadrat Akar',
        topic: 'Persamaan Kuadrat',
        grade: 'kelas-9',
        type: 'equation',
        points: 350,
        cannonDamage: 250,
        timeLimit: 75,
        isCriticalTower: true,
        formulaBadge: 'x² − 7x + 12 = 0  →  x₁² + x₂²',
        question: 'MENARA KRITIS (2x)! Jika x₁ dan x₂ adalah akar-akar persamaan kuadrat x² − 7x + 12 = 0, berapakah nilai dari x₁² + x₂²?',
        options: ['A. 17', 'B. 25', 'C. 37', 'D. 49'],
        answer: 'B. 25',
        numericAnswer: '25',
        hint: 'Faktorkan menjadi (x − 3)(x − 4) = 0, atau gunakan x₁² + x₂² = (x₁ + x₂)² − 2x₁x₂.',
        explanation: 'Akar-akarnya 3 dan 4, sehingga 3² + 4² = 9 + 16 = 25 (atau 7² − 2(12) = 49 − 24 = 25).',
      },
      {
        id: 'k9-s07',
        sectorCode: 'S-07',
        title: 'Bingkai Foto Sebangun',
        topic: 'Kesebangunan',
        grade: 'kelas-9',
        type: 'geometry',
        points: 350,
        cannonDamage: 220,
        timeLimit: 90,
        formulaBadge: 'l_karton / l_foto = p_karton / p_foto',
        question: 'Sebuah foto berukuran lebar 30 cm dan tinggi 40 cm ditempel pada karton yang SEBANGUN. Jika di kiri, kanan, dan atas foto masih tersisa karton selebar 3 cm, berapa cm lebar sisa karton di bagian BAWAH?',
        options: ['A. 3 cm', 'B. 4 cm', 'C. 5 cm', 'D. 6 cm'],
        answer: 'C. 5 cm',
        numericAnswer: '5',
        hint: 'Lebar karton = 30 + 3 + 3 = 36 cm. Gunakan perbandingan sebangun 36/30 = T_karton/40.',
        explanation: 'Tinggi karton = 40 × (36/30) = 48 cm. Sisa bawah = 48 − 40 − 3(atas) = 5 cm.',
      },
      {
        id: 'k9-s08',
        sectorCode: 'S-08',
        title: 'Lintasan Roket Maksimum',
        topic: 'Fungsi Kuadrat',
        grade: 'kelas-9',
        type: 'equation',
        points: 350,
        cannonDamage: 230,
        timeLimit: 75,
        formulaBadge: 'h(t) = 24t − 3t² | t_puncak = −b / 2a',
        question: 'Tinggi roket air setelah t detik dirumuskan h(t) = 24t − 3t² meter. Berapakah ketinggian MAKSIMUM (dalam meter) yang dapat dicapai roket tersebut?',
        options: ['A. 36 meter', 'B. 42 meter', 'C. 48 meter', 'D. 54 meter'],
        answer: 'C. 48 meter',
        numericAnswer: '48',
        hint: 'Tentukan waktu puncak dulu dengan t = −b / (2a) = −24 / (2 × −3) = 4 detik.',
        explanation: 'Saat t = 4 detik, tinggi maks h(4) = 24(4) − 3(4²) = 96 − 48 = 48 meter.',
      },
      {
        id: 'k9-s09',
        sectorCode: 'S-09',
        title: 'Rotasi + Dilatasi',
        topic: 'Transformasi Ganda',
        grade: 'kelas-9',
        type: 'geometry',
        points: 350,
        cannonDamage: 220,
        timeLimit: 75,
        formulaBadge: 'Rotasi +90°: (x,y)→(−y,x) | Dilatasi [O,k]: (kx,ky)',
        question: 'Titik A(3, −5) dirotasikan 90° berlawanan arah jarum jam terhadap pusat O(0,0), lalu hasilnya didilatasikan dengan faktor skala k = 2 terhadap pusat O(0,0). Koordinat bayangan akhirnya adalah...',
        options: ['A. (10, 6)', 'B. (−10, 6)', 'C. (6, −10)', 'D. (−6, 10)'],
        answer: 'A. (10, 6)',
        hint: 'Rotasi +90° mengubah (3, −5) menjadi (−(−5), 3) = (5, 3). Kemudian kalikan masing-masing dengan 2!',
        explanation: 'Rotasi +90°: A′ = (5, 3). Dilatasi skala 2: A″ = (2×5, 2×3) = (10, 6).',
      },
      {
        id: 'k9-s10',
        sectorCode: 'S-10',
        title: 'Tempa Kuadrat 81',
        topic: 'Target Eksponen & Operasi',
        grade: 'kelas-9',
        type: 'forge',
        points: 300,
        cannonDamage: 200,
        timeLimit: 60,
        formulaBadge: 'Target Angka = 81 (9²) | Kartu: [4, 6, 8, 9]',
        forgeNumbers: [4, 6, 8, 9],
        forgeTarget: 81,
        question: 'Rakit keempat kartu [4, 6, 8, 9] tepat satu kali agar menghasilkan bilangan kuadrat Target 81! Manakah ekspresi berikut yang tepat?',
        options: [
          'A. (8 + 4) × 6 + 9',
          'B. 9 × 8 + 6 − 4',
          'C. (9 + 6) × 4 + 8',
          'D. 8 × 6 + 9 × 4',
        ],
        answer: 'A. (8 + 4) × 6 + 9',
        numericAnswer: '81',
        hint: '81 = 72 + 9. Bagaimana cara membuat 72 dari kartu [4, 6, 8]?',
        explanation: '(8 + 4) = 12, dikali 6 menjadi 72, lalu 72 + 9 = 81.',
      },
      {
        id: 'k9-s11',
        sectorCode: 'S-11',
        title: 'Kapasitas Silinder Tabung',
        topic: 'Bangun Ruang Sisi Lengkung',
        grade: 'kelas-9',
        type: 'geometry',
        points: 350,
        cannonDamage: 220,
        timeLimit: 60,
        formulaBadge: 'V = π r² t (π = 22/7)',
        question: 'Sebuah wadah berbentuk tabung memiliki diameter 14 cm dan tinggi 40 cm. Berapa cm³ volume air maksimal yang dapat ditampung wadah tersebut? (π = 22/7)',
        options: ['A. 4.620 cm³', 'B. 5.280 cm³', 'C. 6.160 cm³', 'D. 7.480 cm³'],
        answer: 'C. 6.160 cm³',
        numericAnswer: '6160',
        hint: 'Diameter 14 cm berarti jari-jari r = 7 cm. Luas alas = 154 cm².',
        explanation: 'V = (22/7) × 7 × 7 × 40 = 154 × 40 = 6.160 cm³.',
      },
      {
        id: 'k9-s12',
        sectorCode: 'S-12',
        title: 'Menara Selimut Kerucut',
        topic: 'Kerucut & Pythagoras',
        grade: 'kelas-9',
        type: 'geometry',
        points: 400,
        cannonDamage: 270,
        timeLimit: 75,
        isCriticalTower: true,
        formulaBadge: 'L_selimut = π r s | s = √(r² + t²)',
        question: 'MENARA KRITIS (2x)! Sebuah topi ulang tahun berbentuk kerucut mempunyai jari-jari alas 7 cm dan tinggi 24 cm. Berapakah luas karton minimal untuk membuat selimut topi tersebut? (π = 22/7)',
        options: ['A. 440 cm²', 'B. 528 cm²', 'C. 550 cm²', 'D. 704 cm²'],
        answer: 'C. 550 cm²',
        numericAnswer: '550',
        hint: 'Cari panjang garis pelukis s dulu dengan Tripel Pythagoras (7, 24, ...)!',
        explanation: 's = √(7² + 24²) = √(49 + 576) = √625 = 25 cm. Luas selimut = (22/7) × 7 × 25 = 550 cm².',
      },
      {
        id: 'k9-s13',
        sectorCode: 'S-13',
        title: 'Diskriminan Kembar',
        topic: 'Diskriminan PK',
        grade: 'kelas-9',
        type: 'equation',
        points: 400,
        cannonDamage: 250,
        timeLimit: 75,
        formulaBadge: 'Akar Kembar ⇒ D = b² − 4ac = 0',
        question: 'Persamaan kuadrat x² − 6x + (k − 1) = 0 memiliki dua akar real yang kembar (sama). Nilai k yang memenuhi syarat tersebut adalah...',
        options: ['A. 8', 'B. 9', 'C. 10', 'D. 11'],
        answer: 'C. 10',
        numericAnswer: '10',
        hint: 'Substitusikan a = 1, b = −6, dan c = (k − 1) ke dalam D = b² − 4ac = 0.',
        explanation: '(−6)² − 4(1)(k − 1) = 0 ⇒ 36 − 4k + 4 = 0 ⇒ 40 = 4k ⇒ k = 10.',
      },
      {
        id: 'k9-s14',
        sectorCode: 'S-14',
        title: 'Rasionalkan Akar Sekawan',
        topic: 'Rasionalisasi Penyebut',
        grade: 'kelas-9',
        type: 'logic',
        points: 400,
        cannonDamage: 240,
        timeLimit: 75,
        formulaBadge: '12 / (√7 − √3) × (√7 + √3)/(√7 + √3)',
        question: 'Bentuk rasional paling sederhana dari pecahan 12 / (√7 − √3) adalah...',
        options: [
          'A. 2(√7 + √3)',
          'B. 3(√7 + √3)',
          'C. 4(√7 − √3)',
          'D. 6(√7 + √3)',
        ],
        answer: 'B. 3(√7 + √3)',
        hint: 'Kalikan pembilang dan penyebut dengan akar sekawan (√7 + √3). Penyebut menjadi 7 − 3 = 4.',
        explanation: '12(√7 + √3) / (7 − 3) = 12(√7 + √3) / 4 = 3(√7 + √3).',
      },
      {
        id: 'k9-s15',
        sectorCode: 'S-15',
        title: 'Kapsul Tabung + ½ Bola',
        topic: 'Gabungan BRSL',
        grade: 'kelas-9',
        type: 'geometry',
        points: 450,
        cannonDamage: 280,
        timeLimit: 90,
        formulaBadge: 'L_total = πr² + 2πrt + 2πr²',
        question: 'Sebuah tugu berbentuk tabung yang di atasnya ditutup kubah setengah bola tepat berimpit. Diketahui jari-jari r = 7 cm dan tinggi tabung saja t = 10 cm (π = 22/7). Hitung luas seluruh permukaan luar bangun tersebut!',
        options: ['A. 748 cm²', 'B. 854 cm²', 'C. 902 cm²', 'D. 1.056 cm²'],
        answer: 'C. 902 cm²',
        numericAnswer: '902',
        hint: 'Jumlahkan 3 bagian: Alas lingkaran (πr²) + Selimut tabung (2πrt) + ½ Bola (2πr²).',
        explanation: 'Alas = 154 cm², Selimut tabung = 2×(22/7)×7×10 = 440 cm², Kubah ½ bola = 2×154 = 308 cm². Total = 154 + 440 + 308 = 902 cm².',
      },
      {
        id: 'k9-s16',
        sectorCode: 'S-16',
        title: 'Bos: Rasio Kebalikan Akar',
        topic: 'Aljabar Akar Kuadrat',
        grade: 'kelas-9',
        type: 'equation',
        points: 500,
        cannonDamage: 350,
        timeLimit: 90,
        isCriticalTower: true,
        formulaBadge: 'x² − 6x + 3 = 0  →  p/q + q/p',
        question: 'BENTENG BOS KELAS 9! Jika p dan q adalah akar-akar dari persamaan kuadrat x² − 6x + 3 = 0, berapakah nilai eksak dari (p / q) + (q / p)?',
        options: ['A. 8', 'B. 10', 'C. 12', 'D. 14'],
        answer: 'B. 10',
        numericAnswer: '10',
        hint: 'Samakan penyebut: p/q + q/p = (p² + q²) / (p·q), lalu gunakan p + q = 6 dan p·q = 3.',
        explanation: 'p + q = 6 dan pq = 3. p² + q² = (p+q)² − 2pq = 36 − 6 = 30. Jadi (p² + q²)/pq = 30 / 3 = 10.',
      },
    ],
  },
];

// =========================================================================
// PROCEDURAL DYNAMIC QUESTION GENERATOR (SOAL TAK TERBATAS SESUAI KELAS)
// =========================================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildMcqOptions(correctValue: number, unit: string = '', offsets: number[] = [-6, -2, 4, 8]): { options: string[]; answer: string } {
  const wrongSet = new Set<number>();
  const candidates = [...offsets, -4, 2, -3, 6, 10, -8, 12];
  for (const off of candidates) {
    if (wrongSet.size >= 3) break;
    const val = correctValue + off;
    if (val !== correctValue) wrongSet.add(val);
  }
  const allVals = [correctValue, ...Array.from(wrongSet).slice(0, 3)];
  // Shuffle
  for (let i = allVals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allVals[i], allVals[j]] = [allVals[j], allVals[i]];
  }
  const labels = ['A', 'B', 'C', 'D'];
  const suffix = unit ? ` ${unit}` : '';
  const options = allVals.map((v, idx) => `${labels[idx]}. ${v}${suffix}`);
  const correctIdx = allVals.indexOf(correctValue);
  return {
    options,
    answer: options[correctIdx],
  };
}

export function generateDynamicMathQuestion(grade: MathGradeId, points: number = 300): MathSectorItem {
  const uid = `dyn-${grade}-${Date.now()}-${randInt(100, 999)}`;
  const variant = randInt(1, 3);

  if (grade === 'kelas-7') {
    if (variant === 1) {
      // PLSV: ax + b = c -> nilai dx + e
      const a = randInt(2, 6);
      const x = randInt(3, 12);
      const b = randInt(-10, 15);
      const c = a * x + b;
      const d = randInt(2, 4);
      const e = randInt(1, 9);
      const target = d * x + e;
      const bSign = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
      const mcq = buildMcqOptions(target, '', [-4, 4, 8]);
      return {
        id: uid,
        sectorCode: 'DYN',
        title: 'Generator PLSV Dinamis',
        topic: 'Aljabar Kelas 7',
        grade: 'kelas-7',
        type: 'equation',
        points,
        cannonDamage: Math.round(points * 0.7),
        timeLimit: 60,
        formulaBadge: `${a}x ${bSign} = ${c}  →  Tentukan ${d}x + ${e}`,
        question: `[SOAL DINAMIS] Jika x merupakan penyelesaian dari ${a}x ${bSign} = ${c}, maka berapakah nilai dari ${d}x + ${e}?`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(target),
        hint: `Pindahkan konstanta ${bSign} ke ruas kanan lalu bagi dengan ${a} untuk mendapat nilai x.`,
        explanation: `${a}x = ${c} − (${b}) = ${a * x} ⇒ x = ${x}. Maka ${d}(${x}) + ${e} = ${target}.`,
      };
    } else if (variant === 2) {
      // Aritmetika sosial diskon tunggal
      const hargaRibuan = randInt(8, 30) * 10; // 80rb - 300rb
      const diskon = [10, 15, 20, 25, 30][randInt(0, 4)];
      const bayar = (hargaRibuan * 1000 * (100 - diskon)) / 100;
      const mcq = buildMcqOptions(bayar, '', [-10000, 10000, 20000]);
      return {
        id: uid,
        sectorCode: 'DYN',
        title: 'Generator Diskon Cepat',
        topic: 'Aritmetika Sosial Kelas 7',
        grade: 'kelas-7',
        type: 'logic',
        points,
        cannonDamage: Math.round(points * 0.7),
        timeLimit: 60,
        formulaBadge: `Harga = Rp ${hargaRibuan}.000 | Diskon = ${diskon}%`,
        question: `[SOAL DINAMIS] Sebuah tas sekolah bertuliskan harga Rp ${hargaRibuan}.000 dengan diskon ${diskon}%. Berapa rupiah harga yang harus dibayar?`,
        options: mcq.options.map(o => o.replace(/(\d+)$/, (_, n) => `Rp ${Number(n).toLocaleString('id-ID')}`)),
        answer: mcq.answer.replace(/(\d+)$/, (_, n) => `Rp ${Number(n).toLocaleString('id-ID')}`),
        numericAnswer: String(bayar),
        hint: `Bayar = (100% − ${diskon}%) × harga awal.`,
        explanation: `Potongan = ${diskon}% × Rp ${hargaRibuan}.000 = Rp ${(hargaRibuan * 10 * diskon).toLocaleString('id-ID')}. Bayar = Rp ${bayar.toLocaleString('id-ID')}.`,
      };
    } else {
      // Sudut berpenyiku
      const x = randInt(8, 22);
      const a1 = 2 * x + 4;
      const a2 = 90 - a1;
      const mcq = buildMcqOptions(a2, '°', [-6, 6, 12]);
      return {
        id: uid,
        sectorCode: 'DYN',
        title: 'Generator Sudut Penyiku',
        topic: 'Garis & Sudut Kelas 7',
        grade: 'kelas-7',
        type: 'geometry',
        points,
        cannonDamage: Math.round(points * 0.7),
        timeLimit: 60,
        formulaBadge: `∠A + ∠B = 90° | ∠A = ${a1}°`,
        question: `[SOAL DINAMIS] Sudut A dan Sudut B saling BERPENYIKU (jumlahnya 90°). Jika besar Sudut A = ${a1}°, berapakah besar Sudut B?`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(a2),
        hint: 'Dua sudut berpenyiku berjumlah 90°.',
        explanation: `∠B = 90° − ${a1}° = ${a2}°.`,
      };
    }
  }

  if (grade === 'kelas-8') {
    if (variant === 1) {
      // Fungsi f(x) = ax + b -> hitung f(p) + f(q)
      const a = randInt(2, 5);
      const b = randInt(-7, 9);
      const p = randInt(2, 6);
      const ans = a * p + b;
      const bStr = b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`;
      const mcq = buildMcqOptions(ans, '', [-3, 3, 6]);
      return {
        id: uid,
        sectorCode: 'DYN',
        title: 'Generator Fungsi Linear',
        topic: 'Relasi & Fungsi Kelas 8',
        grade: 'kelas-8',
        type: 'equation',
        points,
        cannonDamage: Math.round(points * 0.7),
        timeLimit: 60,
        formulaBadge: `f(x) = ${a}x ${bStr} | Hitung f(${p})`,
        question: `[SOAL DINAMIS] Diketahui fungsi f(x) = ${a}x ${bStr}. Berapakah nilai bayangan dari f(${p})?`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(ans),
        hint: `Ganti setiap huruf x dengan angka ${p}.`,
        explanation: `f(${p}) = ${a}(${p}) ${bStr} = ${ans}.`,
      };
    } else if (variant === 2) {
      // Tripel Pythagoras scaled
      const triples = [
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
        [7, 24, 25],
      ];
      const base = triples[randInt(0, triples.length - 1)];
      const k = randInt(1, 3);
      const a = base[0] * k;
      const b = base[1] * k;
      const c = base[2] * k;
      const mcq = buildMcqOptions(c, 'cm', [-2, 2, 4]);
      return {
        id: uid,
        sectorCode: 'DYN',
        title: 'Generator Tripel Pythagoras',
        topic: 'Pythagoras Kelas 8',
        grade: 'kelas-8',
        type: 'geometry',
        points,
        cannonDamage: Math.round(points * 0.7),
        timeLimit: 60,
        formulaBadge: `c = √(${a}² + ${b}²)`,
        question: `[SOAL DINAMIS] Sebuah segitiga siku-siku memiliki panjang kedua sisi penyikunya adalah ${a} cm dan ${b} cm. Berapa cm panjang sisi miring (hipotenusa)-nya?`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(c),
        hint: `Gunakan rumus c = √(${a}² + ${b}²).`,
        explanation: `c = √(${a * a} + ${b * b}) = √${c * c} = ${c} cm.`,
      };
    } else {
      // Barisan Aritmetika
      const a = randInt(4, 15);
      const b = randInt(3, 8);
      const n = randInt(8, 14);
      const un = a + (n - 1) * b;
      const mcq = buildMcqOptions(un, '', [-b, b, 2 * b]);
      return {
        id: uid,
        sectorCode: 'DYN',
        title: 'Generator Barisan Aritmetika',
        topic: 'Pola Bilangan Kelas 8',
        grade: 'kelas-8',
        type: 'logic',
        points,
        cannonDamage: Math.round(points * 0.7),
        timeLimit: 60,
        formulaBadge: `${a}, ${a + b}, ${a + 2 * b}, ...  →  Suku ke-${n}`,
        question: `[SOAL DINAMIS] Tentukan suku ke-${n} (U${n}) dari barisan aritmetika berikut: ${a}, ${a + b}, ${a + 2 * b}, ${a + 3 * b}, ...`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(un),
        hint: `Suku pertama a = ${a} dan beda b = ${b}. Gunakan Un = a + (n − 1)b.`,
        explanation: `U${n} = ${a} + (${n} − 1)×${b} = ${a} + ${(n - 1) * b} = ${un}.`,
      };
    }
  }

  // KELAS 9
  if (variant === 1) {
    // Persamaan Kuadrat: jumlah akar + hasil kali akar
    const r1 = randInt(2, 7);
    const r2 = randInt(2, 8);
    const B = -(r1 + r2);
    const C = r1 * r2;
    const sumSq = r1 * r1 + r2 * r2;
    const mcq = buildMcqOptions(sumSq, '', [-4, 4, 8]);
    return {
      id: uid,
      sectorCode: 'DYN',
      title: 'Generator Kuadrat x₁² + x₂²',
      topic: 'Persamaan Kuadrat Kelas 9',
      grade: 'kelas-9',
      type: 'equation',
      points,
      cannonDamage: Math.round(points * 0.7),
      timeLimit: 75,
      formulaBadge: `x² − ${r1 + r2}x + ${C} = 0  →  x₁² + x₂²`,
      question: `[SOAL DINAMIS] Akar-akar persamaan kuadrat x² − ${Math.abs(B)}x + ${C} = 0 adalah x₁ dan x₂. Hitunglah nilai x₁² + x₂²!`,
      options: mcq.options,
      answer: mcq.answer,
      numericAnswer: String(sumSq),
      hint: `Gunakan identitas x₁² + x₂² = (x₁ + x₂)² − 2x₁x₂ dengan x₁+x₂ = ${r1 + r2} dan x₁x₂ = ${C}.`,
      explanation: `(${r1 + r2})² − 2(${C}) = ${(r1 + r2) ** 2} − ${2 * C} = ${sumSq}.`,
    };
  } else if (variant === 2) {
    // Translasi titik
    const x0 = randInt(-6, 8);
    const y0 = randInt(-6, 8);
    const tx = randInt(-5, 7) || 3;
    const ty = randInt(-5, 7) || -2;
    const x1 = x0 + tx;
    const y1 = y0 + ty;
    const ansSum = x1 + y1;
    const mcq = buildMcqOptions(ansSum, '', [-3, 3, 6]);
    return {
      id: uid,
      sectorCode: 'DYN',
      title: 'Generator Koordinat Translasi',
      topic: 'Transformasi Kelas 9',
      grade: 'kelas-9',
      type: 'geometry',
      points,
      cannonDamage: Math.round(points * 0.7),
      timeLimit: 60,
      formulaBadge: `A(${x0}, ${y0}) + T(${tx}, ${ty}) = A'(x', y')`,
      question: `[SOAL DINAMIS] Titik A(${x0}, ${y0}) digeser oleh translasi T(${tx}, ${ty}) menghasilkan bayangan A'(x', y'). Berapakah nilai dari (x' + y')?`,
      options: mcq.options,
      answer: mcq.answer,
      numericAnswer: String(ansSum),
      hint: `x' = ${x0} + (${tx}) dan y' = ${y0} + (${ty}), lalu jumlahkan x' dan y'.`,
      explanation: `A' = (${x1}, ${y1}), maka x' + y' = ${x1} + (${y1}) = ${ansSum}.`,
    };
  } else {
    // Luas Permukaan Bola (kelipatan 7)
    const r = randInt(1, 2) * 7; // 7 atau 14
    const luas = 4 * 22 * (r / 7) * r;
    const mcq = buildMcqOptions(luas, 'cm²', [-154, 154, 308]);
    return {
      id: uid,
      sectorCode: 'DYN',
      title: 'Generator Luas Bola',
      topic: 'Bangun Ruang Sisi Lengkung Kelas 9',
      grade: 'kelas-9',
      type: 'geometry',
      points,
      cannonDamage: Math.round(points * 0.7),
      timeLimit: 60,
      formulaBadge: `L_bola = 4 π r² | r = ${r} cm (π = 22/7)`,
      question: `[SOAL DINAMIS] Hitunglah luas permukaan sebuah bola pejal yang berjari-jari r = ${r} cm! (Gunakan π = 22/7)`,
      options: mcq.options,
      answer: mcq.answer,
      numericAnswer: String(luas),
      hint: `L = 4 × (22/7) × ${r} × ${r}.`,
      explanation: `L = 4 × (22/7) × ${r} × ${r} = ${luas} cm².`,
    };
  }
}

export interface BlitzQuestion {
  prompt: string;
  answer: number;
  choices: number[];
}

export function generateBlitzQuestion(grade: MathGradeId): BlitzQuestion {
  let prompt = '';
  let answer = 0;

  if (grade === 'kelas-7') {
    const mode = randInt(1, 3);
    if (mode === 1) {
      const a = randInt(-18, 25);
      const b = randInt(-15, 20);
      const op = randInt(0, 1) === 0 ? '+' : '−';
      answer = op === '+' ? a + b : a - b;
      prompt = `${a < 0 ? `(${a})` : a} ${op} ${b < 0 ? `(${b})` : b} = ?`;
    } else if (mode === 2) {
      const a = randInt(2, 6);
      const x = randInt(2, 12);
      const b = randInt(1, 15);
      const rhs = a * x + b;
      answer = x;
      prompt = `${a}x + ${b} = ${rhs}, nilai x = ?`;
    } else {
      const pct = [10, 20, 25, 50][randInt(0, 3)];
      const base = randInt(2, 12) * 20;
      answer = (pct * base) / 100;
      prompt = `${pct}% dari ${base} = ?`;
    }
  } else if (grade === 'kelas-8') {
    const mode = randInt(1, 3);
    if (mode === 1) {
      const a = randInt(2, 5);
      const x = randInt(-3, 7);
      const b = randInt(-8, 10);
      answer = a * x + b;
      prompt = `Jika f(x) = ${a}x ${b >= 0 ? `+ ${b}` : `− ${Math.abs(b)}`}, maka f(${x}) = ?`;
    } else if (mode === 2) {
      const a = randInt(3, 12);
      const b = randInt(2, 9);
      answer = a * a + b * b;
      prompt = `${a}² + ${b}² = ?`;
    } else {
      const x1 = randInt(1, 5);
      const y1 = randInt(2, 8);
      const m = randInt(2, 5);
      const dx = randInt(2, 4);
      const x2 = x1 + dx;
      const y2 = y1 + m * dx;
      answer = m;
      prompt = `Gradien garis A(${x1},${y1}) dan B(${x2},${y2}) = ?`;
    }
  } else {
    const mode = randInt(1, 3);
    if (mode === 1) {
      const p1 = randInt(2, 6);
      const p2 = randInt(1, 4);
      answer = Math.pow(2, p1) + Math.pow(3, p2);
      prompt = `2^${p1} + 3^${p2} = ?`;
    } else if (mode === 2) {
      const r1 = randInt(2, 8);
      const r2 = randInt(1, 7);
      const sum = r1 + r2;
      const prod = r1 * r2;
      answer = r1 >= r2 ? r1 : r2;
      prompt = `Akar terbesar dari x² − ${sum}x + ${prod} = 0 adalah ?`;
    } else {
      const k = randInt(6, 15);
      answer = k * k;
      prompt = `Jika √x = ${k}, maka nilai x = ?`;
    }
  }

  const wrongSet = new Set<number>();
  const offsets = [-5, -3, -2, -1, 1, 2, 3, 4, 6, 8, -7, 10];
  for (const off of offsets) {
    if (wrongSet.size >= 3) break;
    const candidate = answer + off;
    if (candidate !== answer) wrongSet.add(candidate);
  }
  const choices = [answer, ...Array.from(wrongSet).slice(0, 3)];
  for (let i = choices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choices[i], choices[j]] = [choices[j], choices[i]];
  }

  return { prompt, answer, choices };
}
