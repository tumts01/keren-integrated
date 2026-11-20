export type GalaxyGradeId = 'kelas-7' | 'kelas-8' | 'kelas-9';

export type VisualDiagramType =
  | 'balance_scale'
  | 'right_triangle'
  | 'cartesian'
  | 'circle_sector'
  | 'solid_3d'
  | 'venn_set';

export interface VisualConfig {
  type: VisualDiagramType;
  leftPan?: string;
  rightPan?: string;
  scaleCaption?: string;
  sideA?: string;
  sideB?: string;
  sideC?: string;
  angleLabel?: string;
  points?: Array<{ x: number; y: number; label: string; color?: string }>;
  drawLine?: boolean;
  drawParabola?: { a: number; b: number; c: number };
  radiusLabel?: string;
  angleDeg?: number;
  sectorLabel?: string;
  shape3d?: 'cylinder' | 'cone' | 'sphere' | 'cuboid' | 'pyramid';
  dim1?: string;
  dim2?: string;
  dim3?: string;
  setA?: { label: string; val: string };
  setB?: { label: string; val: string };
  intersectionVal?: string;
  outsideVal?: string;
  totalVal?: string;
}

export interface GalaxyTeam {
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
  skills: {
    eliminate2: boolean;
    shieldBoost: boolean;
    nova2x: boolean;
  };
}

export interface GalaxyMissionItem {
  id: string;
  code: string;
  title: string;
  topic: string;
  grade: GalaxyGradeId;
  points: number;
  laserDamage: number;
  timeLimit: number;
  visualConfig: VisualConfig;
  question: string;
  options: string[];
  answer: string;
  numericAnswer?: string;
  hint: string;
  explanation: string;
  isBossMeteor?: boolean;
}

export interface GalaxyGradePack {
  id: GalaxyGradeId;
  name: string;
  subtitle: string;
  badge: string;
  accentColor: string;
  missions: GalaxyMissionItem[];
}

export interface GalaxyLog {
  id: string;
  timestamp: string;
  teamName: string;
  teamColor: string;
  text: string;
  type: 'info' | 'success' | 'danger' | 'attack' | 'system';
}

export interface GalaxySession {
  id: string;
  name: string;
  savedAt: string;
  selectedGradeId: GalaxyGradeId;
  currentTurn: number;
  round: number;
  teams: GalaxyTeam[];
  solvedMissionIds: string[];
  logs: GalaxyLog[];
}

export interface GalaxySaveSlot {
  id: string;
  name: string;
  date: string;
  session: GalaxySession;
}

export const INITIAL_GALAXY_TEAMS: GalaxyTeam[] = [
  {
    id: 0,
    name: 'Skuad Al-Biruni',
    color: '#06b6d4',
    bgLight: 'rgba(6, 182, 212, 0.16)',
    icon: 'fa-rocket',
    score: 0,
    hp: 1000,
    maxHp: 1000,
    shield: 200,
    streak: 0,
    skills: { eliminate2: true, shieldBoost: true, nova2x: true },
  },
  {
    id: 1,
    name: 'Skuad Al-Khawarizmi',
    color: '#10b981',
    bgLight: 'rgba(16, 185, 129, 0.16)',
    icon: 'fa-satellite',
    score: 0,
    hp: 1000,
    maxHp: 1000,
    shield: 200,
    streak: 0,
    skills: { eliminate2: true, shieldBoost: true, nova2x: true },
  },
  {
    id: 2,
    name: 'Skuad Ibnu Haytham',
    color: '#f59e0b',
    bgLight: 'rgba(245, 158, 11, 0.16)',
    icon: 'fa-space-shuttle',
    score: 0,
    hp: 1000,
    maxHp: 1000,
    shield: 200,
    streak: 0,
    skills: { eliminate2: true, shieldBoost: true, nova2x: true },
  },
  {
    id: 3,
    name: 'Skuad Al-Battani',
    color: '#f43f5e',
    bgLight: 'rgba(244, 63, 94, 0.16)',
    icon: 'fa-meteor',
    score: 0,
    hp: 1000,
    maxHp: 1000,
    shield: 200,
    streak: 0,
    skills: { eliminate2: true, shieldBoost: true, nova2x: true },
  },
];

export const GALAXY_GRADE_PACKS: GalaxyGradePack[] = [
  // =========================================================================
  // PAKET KELAS 7 — VISUAL ALGEBRA & GEOMETRI DASAR
  // =========================================================================
  {
    id: 'kelas-7',
    name: 'Kelas 7 — Radar Dasar',
    subtitle: 'Neraca PLSV, Diagram Venn Himpunan, Kartesius, Lingkaran & Balok 3D',
    badge: 'MTs Kelas 7',
    accentColor: '#06b6d4',
    missions: [
      {
        id: 'g7-m01',
        code: 'M-01',
        title: 'Neraca Aljabar Awal',
        topic: 'PLSV Visual',
        grade: 'kelas-7',
        points: 150,
        laserDamage: 140,
        timeLimit: 45,
        visualConfig: {
          type: 'balance_scale',
          leftPan: '2x + 6',
          rightPan: '18',
          scaleCaption: 'Neraca Dalam Keadaan Seimbang (=)',
        },
        question: 'Amati Neraca Aljabar pada hologram! Lengan kiri memuat beban (2x + 6) dan lengan kanan memuat 18 dalam posisi seimbang. Berapakah nilai x?',
        options: ['A. 4', 'B. 6', 'C. 8', 'D. 12'],
        answer: 'B. 6',
        numericAnswer: '6',
        hint: 'Turunkan beban 6 dari kedua sisi lengan sehingga 2x = 18 − 6.',
        explanation: '2x + 6 = 18 ⇒ 2x = 12 ⇒ x = 6.',
      },
      {
        id: 'g7-m02',
        code: 'M-02',
        title: 'Radar Himpunan Pramuka',
        topic: 'Diagram Venn',
        grade: 'kelas-7',
        points: 200,
        laserDamage: 160,
        timeLimit: 60,
        visualConfig: {
          type: 'venn_set',
          setA: { label: 'Pramuka', val: '18' },
          setB: { label: 'PMR', val: '14' },
          intersectionVal: '?',
          outsideVal: '4',
          totalVal: '32',
        },
        question: 'Dari 32 siswa pada Diagram Venn di radar, tercatat 18 mengikuti Pramuka, 14 mengikuti PMR, dan 4 tidak mengikuti keduanya. Berapakah siswa di zona irisan (?) yang mengikuti KEDUANYA?',
        options: ['A. 2 siswa', 'B. 4 siswa', 'C. 6 siswa', 'D. 8 siswa'],
        answer: 'B. 4 siswa',
        numericAnswer: '4',
        hint: 'Siswa yang aktif minimal 1 kegiatan = 32 − 4 = 28. Kurangkan (18 + 14) dengan 28!',
        explanation: 'Irisan = (18 + 14) − (32 − 4) = 32 − 28 = 4 siswa.',
      },
      {
        id: 'g7-m03',
        code: 'M-03',
        title: 'Kesetimbangan Dua Lengan',
        topic: 'PLSV Dua Sisi',
        grade: 'kelas-7',
        points: 200,
        laserDamage: 170,
        timeLimit: 60,
        visualConfig: {
          type: 'balance_scale',
          leftPan: '3x + 5',
          rightPan: 'x + 21',
          scaleCaption: '3x + 5 = x + 21',
        },
        question: 'Lihat hologram timbangan: piring kiri berisi (3x + 5) dan piring kanan berisi (x + 21). Agar timbangan tetap setara, berapakah nilai massa 1 kotak x?',
        options: ['A. 6', 'B. 7', 'C. 8', 'D. 10'],
        answer: 'C. 8',
        numericAnswer: '8',
        hint: 'Kurangkan 1 kotak x dari kedua lengan sehingga tersisa 2x + 5 = 21.',
        explanation: '3x − x = 21 − 5 ⇒ 2x = 16 ⇒ x = 8.',
      },
      {
        id: 'g7-m04',
        code: 'M-04',
        title: 'Pergeseran Satelit',
        topic: 'Koordinat Kartesius',
        grade: 'kelas-7',
        points: 250,
        laserDamage: 180,
        timeLimit: 60,
        visualConfig: {
          type: 'cartesian',
          points: [
            { x: -2, y: 3, label: 'P(−2, 3)', color: '#38bdf8' },
            { x: 3, y: 5, label: 'P′(?, ?)', color: '#fbbf24' },
          ],
          drawLine: true,
        },
        question: 'Satelit awal berada di titik P(−2, 3) pada Radar Kartesius, lalu bergerak 5 satuan ke KANAN dan 2 satuan ke ATAS. Di koordinat manakah posisi barunya?',
        options: ['A. (2, 5)', 'B. (3, 5)', 'C. (3, 1)', 'D. (−7, 5)'],
        answer: 'B. (3, 5)',
        hint: 'Ke kanan berarti menambah koordinat X (+5), ke atas berarti menambah koordinat Y (+2).',
        explanation: 'X = −2 + 5 = 3 dan Y = 3 + 2 = 5. Koordinat barunya adalah (3, 5).',
      },
      {
        id: 'g7-m05',
        code: 'M-05',
        title: 'Panel Surya ½ Lingkaran',
        topic: 'Luas Lingkaran',
        grade: 'kelas-7',
        points: 250,
        laserDamage: 190,
        timeLimit: 60,
        visualConfig: {
          type: 'circle_sector',
          radiusLabel: 'r = 7 m',
          angleDeg: 180,
          sectorLabel: 'Setengah Lingkaran (180°)',
        },
        question: 'Panel surya stasiun luar angkasa berbentuk setengah lingkaran dengan jari-jari r = 7 m. Berapa m² luas panel surya tersebut? (π = 22/7)',
        options: ['A. 44 m²', 'B. 77 m²', 'C. 154 m²', 'D. 308 m²'],
        answer: 'B. 77 m²',
        numericAnswer: '77',
        hint: 'Luas ½ lingkaran = ½ × (22/7) × 7 × 7.',
        explanation: 'L = ½ × (22/7) × 49 = ½ × 154 = 77 m².',
      },
      {
        id: 'g7-m06',
        code: 'M-06',
        title: 'Tangki Bahan Bakar Balok',
        topic: 'Volume Balok 3D',
        grade: 'kelas-7',
        points: 300,
        laserDamage: 200,
        timeLimit: 60,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'cuboid',
          dim1: 'p = 15 cm',
          dim2: 'l = 10 cm',
          dim3: 't = 8 cm',
        },
        question: 'Perhatikan hologram tangki berbentuk balok di layar dengan ukuran p = 15 cm, l = 10 cm, dan t = 8 cm. Berapa cm³ volume maksimal tangki tersebut?',
        options: ['A. 960 cm³', 'B. 1.000 cm³', 'C. 1.200 cm³', 'D. 1.500 cm³'],
        answer: 'C. 1.200 cm³',
        numericAnswer: '1200',
        hint: 'Volume balok = panjang × lebar × tinggi.',
        explanation: 'V = 15 × 10 × 8 = 1.200 cm³.',
      },
      {
        id: 'g7-m07',
        code: 'M-07',
        title: 'Sayap Segitiga Pesawat',
        topic: 'Luas Segitiga',
        grade: 'kelas-7',
        points: 300,
        laserDamage: 200,
        timeLimit: 60,
        visualConfig: {
          type: 'right_triangle',
          sideA: '12 cm',
          sideB: '9 cm',
          sideC: '15 cm',
          angleLabel: '90°',
        },
        question: 'Sebuah pelat sayap pesawat berbentuk segitiga siku-siku dengan alas 12 cm dan tinggi 9 cm seperti pada gambar. Berapakah luas pelat segitiga tersebut?',
        options: ['A. 36 cm²', 'B. 54 cm²', 'C. 67,5 cm²', 'D. 108 cm²'],
        answer: 'B. 54 cm²',
        numericAnswer: '54',
        hint: 'Luas segitiga = ½ × alas × tinggi.',
        explanation: 'Luas = ½ × 12 × 9 = 6 × 9 = 54 cm².',
      },
      {
        id: 'g7-m08',
        code: 'M-08',
        title: 'Kalibrasi Neraca 4x − 3',
        topic: 'Aljabar Substitusi',
        grade: 'kelas-7',
        points: 300,
        laserDamage: 220,
        timeLimit: 75,
        visualConfig: {
          type: 'balance_scale',
          leftPan: '4x − 3',
          rightPan: '2x + 15',
          scaleCaption: 'Cari x lalu hitung (2x + 1)',
        },
        question: 'Berdasarkan Neraca Seimbang 4x − 3 = 2x + 15 pada visual, tentukan terlebih dahulu nilai x, kemudian hitunglah nilai dari (2x + 1)!',
        options: ['A. 9', 'B. 17', 'C. 19', 'D. 21'],
        answer: 'C. 19',
        numericAnswer: '19',
        hint: '4x − 2x = 15 + 3 ⇒ 2x = 18 ⇒ x = 9.',
        explanation: 'x = 9, sehingga nilai dari 2x + 1 = 2(9) + 1 = 19.',
      },
      {
        id: 'g7-m09',
        code: 'M-09',
        title: 'Sudut Sektor 135°',
        topic: 'Garis & Sudut',
        grade: 'kelas-7',
        points: 350,
        laserDamage: 230,
        timeLimit: 60,
        visualConfig: {
          type: 'circle_sector',
          radiusLabel: 'Sudut Pelurus 180°',
          angleDeg: 135,
          sectorLabel: '135° + x = 180°',
        },
        question: 'Radar menyapu sudut berpelurus (180°). Jika area hijau sudah mencakup sudut 135° sebagaimana terlihat di diagram, berapa derajatkah sudut pelurus x sisanya?',
        options: ['A. 35°', 'B. 45°', 'C. 55°', 'D. 65°'],
        answer: 'B. 45°',
        numericAnswer: '45',
        hint: 'Sudut pelurus berjumlah total 180°.',
        explanation: 'x = 180° − 135° = 45°.',
      },
      {
        id: 'g7-m10',
        code: 'M-10',
        title: 'Himpunan Olahraga 40 Siswa',
        topic: 'Diagram Venn Komplemen',
        grade: 'kelas-7',
        points: 350,
        laserDamage: 230,
        timeLimit: 75,
        visualConfig: {
          type: 'venn_set',
          setA: { label: 'Futsal', val: '25' },
          setB: { label: 'Basket', val: '20' },
          intersectionVal: '8',
          outsideVal: '?',
          totalVal: '40',
        },
        question: 'Dari 40 siswa pada Diagram Venn: 25 gemar Futsal, 20 gemar Basket, dan 8 gemar KEDUANYA. Berapa banyak siswa yang TIDAK gemar keduanya (angka "?" di luar lingkaran)?',
        options: ['A. 2 siswa', 'B. 3 siswa', 'C. 5 siswa', 'D. 7 siswa'],
        answer: 'B. 3 siswa',
        numericAnswer: '3',
        hint: 'Yang suka Futsal saja = 25−8 = 17. Basket saja = 20−8 = 12. Jumlahkan dengan 8 lalu kurangkan dari 40!',
        explanation: 'Total di dalam lingkaran = 17 + 8 + 12 = 37 siswa. Di luar lingkaran = 40 − 37 = 3 siswa.',
      },
      {
        id: 'g7-m11',
        code: 'M-11',
        title: 'Kubus Pelindung Inti',
        topic: 'Luas Permukaan Kubus',
        grade: 'kelas-7',
        points: 400,
        laserDamage: 250,
        timeLimit: 75,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'cuboid',
          dim1: 's = 8 cm',
          dim2: 's = 8 cm',
          dim3: 's = 8 cm',
        },
        question: 'Sebuah kubus reaktor memiliki panjang setiap rusuknya s = 8 cm. Berapakah luas seluruh permukaan (6 sisi persegi) kubus tersebut?',
        options: ['A. 256 cm²', 'B. 324 cm²', 'C. 384 cm²', 'D. 512 cm²'],
        answer: 'C. 384 cm²',
        numericAnswer: '384',
        hint: 'Luas permukaan kubus = 6 × s².',
        explanation: 'L = 6 × (8 × 8) = 6 × 64 = 384 cm².',
      },
      {
        id: 'g7-m12',
        code: 'M-12',
        title: 'BOS METEOR: Juring 90°',
        topic: 'Juring Lingkaran',
        grade: 'kelas-7',
        points: 500,
        laserDamage: 320,
        timeLimit: 90,
        isBossMeteor: true,
        visualConfig: {
          type: 'circle_sector',
          radiusLabel: 'r = 14 cm',
          angleDeg: 90,
          sectorLabel: 'Seperempat Lingkaran (90°)',
        },
        question: 'BOSS METEOR KELAS 7! Amati juring kuadran (90°) pada radar berjari-jari r = 14 cm. Hitunglah luas area juring yang berwarna biru neon! (π = 22/7)',
        options: ['A. 112 cm²', 'B. 144 cm²', 'C. 154 cm²', 'D. 308 cm²'],
        answer: 'C. 154 cm²',
        numericAnswer: '154',
        hint: 'Sudut 90° adalah 90/360 = 1/4 bagian dari lingkaran penuh.',
        explanation: 'L = (1/4) × (22/7) × 14 × 14 = (1/4) × 616 = 154 cm².',
      },
    ],
  },

  // =========================================================================
  // PAKET KELAS 8 — VISUAL PYTHAGORAS, GRADIEN, LINGKARAN & BRSD
  // =========================================================================
  {
    id: 'kelas-8',
    name: 'Kelas 8 — Radar Penalaran',
    subtitle: 'Pythagoras Radar, Gradien Kartesius, Juring & Busur, Prisma/Limas 3D & SPLDV',
    badge: 'MTs Kelas 8',
    accentColor: '#10b981',
    missions: [
      {
        id: 'g8-m01',
        code: 'M-01',
        title: 'Pemindai Pythagoras',
        topic: 'Teorema Pythagoras',
        grade: 'kelas-8',
        points: 150,
        laserDamage: 150,
        timeLimit: 45,
        visualConfig: {
          type: 'right_triangle',
          sideA: '6 km',
          sideB: '8 km',
          sideC: 'c = ? km',
          angleLabel: '90°',
        },
        question: 'Lihat Segitiga Radar: jarak horizontal 6 km dan jarak vertikal 8 km membentuk sudut siku-siku 90°. Berapakah panjang jarak miring c?',
        options: ['A. 9 km', 'B. 10 km', 'C. 12 km', 'D. 14 km'],
        answer: 'B. 10 km',
        numericAnswer: '10',
        hint: 'Gunakan Tripel Pythagoras (6, 8, ...): c = √(6² + 8²).',
        explanation: 'c = √(36 + 64) = √100 = 10 km.',
      },
      {
        id: 'g8-m02',
        code: 'M-02',
        title: 'Gradien Laser A–B',
        topic: 'Persamaan Garis Lurus',
        grade: 'kelas-8',
        points: 200,
        laserDamage: 170,
        timeLimit: 60,
        visualConfig: {
          type: 'cartesian',
          points: [
            { x: 1, y: 2, label: 'A(1, 2)', color: '#38bdf8' },
            { x: 4, y: 8, label: 'B(4, 8)', color: '#34d399' },
          ],
          drawLine: true,
        },
        question: 'Sinar laser menembak lurus dari koordinat A(1, 2) menuju B(4, 8) pada Papan Kartesius. Berapakah gradien (kemiringan m) lintasan laser tersebut?',
        options: ['A. 1', 'B. 2', 'C. 3', 'D. 4'],
        answer: 'B. 2',
        numericAnswer: '2',
        hint: 'Gradien m = Δy / Δx = (y₂ − y₁) / (x₂ − x₁).',
        explanation: 'm = (8 − 2) / (4 − 1) = 6 / 3 = 2.',
      },
      {
        id: 'g8-m03',
        code: 'M-03',
        title: 'Tinggi Menara Tangga',
        topic: 'Aplikasi Pythagoras',
        grade: 'kelas-8',
        points: 250,
        laserDamage: 180,
        timeLimit: 60,
        visualConfig: {
          type: 'right_triangle',
          sideA: '5 m',
          sideB: 't = ? m',
          sideC: '13 m',
          angleLabel: '90°',
        },
        question: 'Sebuah tangga sepanjang 13 m disandarkan pada dinding stasiun dengan jarak kaki tangga ke dinding 5 m. Berapa meter tinggi dinding t yang dicapai?',
        options: ['A. 8 m', 'B. 10 m', 'C. 11 m', 'D. 12 m'],
        answer: 'D. 12 m',
        numericAnswer: '12',
        hint: 'Sisi miring = 13, alas = 5. Gunakan t = √(13² − 5²).',
        explanation: 't = √(169 − 25) = √144 = 12 m.',
      },
      {
        id: 'g8-m04',
        code: 'M-04',
        title: 'Juring Sektor 60°',
        topic: 'Luas Juring Lingkaran',
        grade: 'kelas-8',
        points: 250,
        laserDamage: 190,
        timeLimit: 60,
        visualConfig: {
          type: 'circle_sector',
          radiusLabel: 'r = 21 cm',
          angleDeg: 60,
          sectorLabel: 'Juring 60°',
        },
        question: 'Radar lingkaran dengan jari-jari r = 21 cm mengaktifkan sektor bersudut pusat 60°. Berapakah luas juring sektor tersebut? (π = 22/7)',
        options: ['A. 154 cm²', 'B. 231 cm²', 'C. 264 cm²', 'D. 462 cm²'],
        answer: 'B. 231 cm²',
        numericAnswer: '231',
        hint: '60° adalah 1/6 dari 360°. Hitung 1/6 × (22/7) × 21 × 21.',
        explanation: 'L = (60/360) × (22/7) × 21 × 21 = (1/6) × 1.386 = 231 cm².',
      },
      {
        id: 'g8-m05',
        code: 'M-05',
        title: 'Pelindung Balok 3D',
        topic: 'Luas Permukaan Balok',
        grade: 'kelas-8',
        points: 250,
        laserDamage: 190,
        timeLimit: 60,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'cuboid',
          dim1: 'p = 10 cm',
          dim2: 'l = 6 cm',
          dim3: 't = 5 cm',
        },
        question: 'Hologram balok berukuran panjang 10 cm, lebar 6 cm, dan tinggi 5 cm akan dilapisi baja pelindung di seluruh sisinya. Berapa cm² luas permukaan balok tersebut?',
        options: ['A. 240 cm²', 'B. 280 cm²', 'C. 300 cm²', 'D. 320 cm²'],
        answer: 'B. 280 cm²',
        numericAnswer: '280',
        hint: 'Gunakan L = 2 × (p·l + p·t + l·t).',
        explanation: 'L = 2 × (60 + 50 + 30) = 2 × 140 = 280 cm².',
      },
      {
        id: 'g8-m06',
        code: 'M-06',
        title: 'Neraca Dua Variabel',
        topic: 'SPLDV Visual',
        grade: 'kelas-8',
        points: 300,
        laserDamage: 210,
        timeLimit: 75,
        visualConfig: {
          type: 'balance_scale',
          leftPan: '2x + y = 17',
          rightPan: 'x + y = 11',
          scaleCaption: 'Dua Kondisi Neraca Seimbang',
        },
        question: 'Dari sistem dua persamaan pada visual: 2x + y = 17 dan x + y = 11. Gunakan metode eliminasi untuk menentukan berapakah nilai x!',
        options: ['A. 4', 'B. 5', 'C. 6', 'D. 8'],
        answer: 'C. 6',
        numericAnswer: '6',
        hint: 'Kurangkan langsung persamaan pertama dengan persamaan kedua untuk menghilangkan y.',
        explanation: '(2x + y) − (x + y) = 17 − 11 ⇒ x = 6.',
      },
      {
        id: 'g8-m07',
        code: 'M-07',
        title: 'Garis Sejajar P(2, 5)',
        topic: 'Persamaan Garis Sejajar',
        grade: 'kelas-8',
        points: 300,
        laserDamage: 220,
        timeLimit: 75,
        visualConfig: {
          type: 'cartesian',
          points: [{ x: 2, y: 5, label: 'P(2, 5)', color: '#fbbf24' }],
          drawLine: true,
        },
        question: 'Sebuah garis lintasan melalui titik P(2, 5) dan SEJAJAR dengan garis y = 3x − 4. Manakah persamaan garis lintasan tersebut?',
        options: ['A. y = 3x − 1', 'B. y = 3x + 1', 'C. y = 3x − 11', 'D. y = −3x + 11'],
        answer: 'A. y = 3x − 1',
        hint: 'Dua garis sejajar memiliki gradien sama (m = 3). Gunakan y − y₁ = m(x − x₁).',
        explanation: 'y − 5 = 3(x − 2) ⇒ y = 3x − 6 + 5 ⇒ y = 3x − 1.',
      },
      {
        id: 'g8-m08',
        code: 'M-08',
        title: 'Kapsul Limas Persegi',
        topic: 'Volume Limas 3D',
        grade: 'kelas-8',
        points: 350,
        laserDamage: 230,
        timeLimit: 60,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'pyramid',
          dim1: 's = 10 cm',
          dim2: 't = 12 cm',
        },
        question: 'Perhatikan hologram limas segi empat beraturan beralas persegi sisi s = 10 cm dan tinggi limas t = 12 cm. Berapakah volume limas tersebut?',
        options: ['A. 300 cm³', 'B. 400 cm³', 'C. 600 cm³', 'D. 1.200 cm³'],
        answer: 'B. 400 cm³',
        numericAnswer: '400',
        hint: 'Volume limas = (1/3) × Luas Alas × Tinggi.',
        explanation: 'V = (1/3) × (10 × 10) × 12 = 100 × 4 = 400 cm³.',
      },
      {
        id: 'g8-m09',
        code: 'M-09',
        title: 'Busur Lengkung 120°',
        topic: 'Panjang Busur Lingkaran',
        grade: 'kelas-8',
        points: 350,
        laserDamage: 230,
        timeLimit: 60,
        visualConfig: {
          type: 'circle_sector',
          radiusLabel: 'r = 21 cm',
          angleDeg: 120,
          sectorLabel: 'Busur AB (120°)',
        },
        question: 'Pada radar berjari-jari 21 cm, panjang busur AB yang menghadap sudut pusat 120° adalah... (π = 22/7)',
        options: ['A. 22 cm', 'B. 33 cm', 'C. 44 cm', 'D. 66 cm'],
        answer: 'C. 44 cm',
        numericAnswer: '44',
        hint: 'Panjang busur = (120/360) × Keliling Lingkaran = (1/3) × 2 × π × r.',
        explanation: 'Busur = (1/3) × 2 × (22/7) × 21 = (1/3) × 132 = 44 cm.',
      },
      {
        id: 'g8-m10',
        code: 'M-10',
        title: 'Uji Sistem 50 Kadet',
        topic: 'Diagram Venn',
        grade: 'kelas-8',
        points: 350,
        laserDamage: 240,
        timeLimit: 75,
        visualConfig: {
          type: 'venn_set',
          setA: { label: 'Jarak', val: '30' },
          setB: { label: 'Koordinat', val: '28' },
          intersectionVal: '?',
          outsideVal: '5',
          totalVal: '50',
        },
        question: 'Dari 50 kadet astronaut, 30 lulus Uji Jarak, 28 lulus Uji Koordinat, dan 5 gagal keduanya. Berapa kadet yang lulus KEDUANYA?',
        options: ['A. 8 kadet', 'B. 11 kadet', 'C. 13 kadet', 'D. 15 kadet'],
        answer: 'C. 13 kadet',
        numericAnswer: '13',
        hint: 'Jumlah peserta yang lulus minimal satu ujian = 50 − 5 = 45.',
        explanation: 'Lulus keduanya = (30 + 28) − 45 = 58 − 45 = 13 kadet.',
      },
      {
        id: 'g8-m11',
        code: 'M-11',
        title: 'Segitiga GSPL Satelit',
        topic: 'Garis Singgung Lingkaran',
        grade: 'kelas-8',
        points: 400,
        laserDamage: 260,
        timeLimit: 75,
        visualConfig: {
          type: 'right_triangle',
          sideA: 'R − r = 8 cm',
          sideB: 'GSPL = ?',
          sideC: 'p = 17 cm',
          angleLabel: '90°',
        },
        question: 'Segitiga bantu GSPL menunjukkan jarak pusat p = 17 cm dan selisih jari-jari (R − r) = 8 cm. Berapakah panjang Garis Singgung Persekutuan Luar (GSPL)-nya?',
        options: ['A. 12 cm', 'B. 15 cm', 'C. 16 cm', 'D. 21 cm'],
        answer: 'B. 15 cm',
        numericAnswer: '15',
        hint: 'Tripel Pythagoras (8, ..., 17)!',
        explanation: 'GSPL = √(17² − 8²) = √(289 − 64) = √225 = 15 cm.',
      },
      {
        id: 'g8-m12',
        code: 'M-12',
        title: 'BOSS METEOR: Limas Persegi',
        topic: 'Luas Permukaan Limas',
        grade: 'kelas-8',
        points: 500,
        laserDamage: 340,
        timeLimit: 90,
        isBossMeteor: true,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'pyramid',
          dim1: 's = 16 cm',
          dim2: 't_limas = 6 cm',
        },
        question: 'BOSS METEOR KELAS 8! Amati hologram limas persegi bersisi alas 16 cm dan tinggi limas 6 cm. Hitunglah LUAS PERMUKAAN seluruh limas tersebut!',
        options: ['A. 448 cm²', 'B. 512 cm²', 'C. 576 cm²', 'D. 640 cm²'],
        answer: 'C. 576 cm²',
        numericAnswer: '576',
        hint: 'Tinggi segitiga tegak = √(6² + (16/2)²) = √(36 + 64) = 10 cm!',
        explanation: 'Tinggi sisi tegak = 10 cm. Luas alas = 16×16 = 256. Luas 4 segitiga = 4 × (½×16×10) = 320. Total = 256 + 320 = 576 cm².',
      },
    ],
  },

  // =========================================================================
  // PAKET KELAS 9 — VISUAL PARABOLA, TRANSFORMASI & BANGUN RUANG LENGKUNG
  // =========================================================================
  {
    id: 'kelas-9',
    name: 'Kelas 9 — Radar Eksponen & Lengkung',
    subtitle: 'Parabola Kuadrat, Transformasi, Kesebangunan, Tabung, Kerucut & Bola 3D',
    badge: 'MTs Kelas 9',
    accentColor: '#f59e0b',
    missions: [
      {
        id: 'g9-m01',
        code: 'M-01',
        title: 'Radar Segitiga Sebangun',
        topic: 'Kesebangunan Segitiga',
        grade: 'kelas-9',
        points: 200,
        laserDamage: 160,
        timeLimit: 60,
        visualConfig: {
          type: 'right_triangle',
          sideA: 'Alas Kecil 6 | Besar 15',
          sideB: 'Tinggi Kecil 8 | Besar t=?',
          sideC: 'Sebangun',
          angleLabel: '90°',
        },
        question: 'Segitiga radar kecil (alas 6 cm, tinggi 8 cm) SEBANGUN dengan segitiga radar besar yang memiliki alas 15 cm. Berapa cm tinggi t segitiga besar?',
        options: ['A. 16 cm', 'B. 18 cm', 'C. 20 cm', 'D. 24 cm'],
        answer: 'C. 20 cm',
        numericAnswer: '20',
        hint: 'Gunakan perbandingan sisi bersesuaian: t / 8 = 15 / 6.',
        explanation: 't = 8 × (15 / 6) = 8 × 2,5 = 20 cm.',
      },
      {
        id: 'g9-m02',
        code: 'M-02',
        title: 'Titik Puncak Parabola',
        topic: 'Fungsi Kuadrat Visual',
        grade: 'kelas-9',
        points: 250,
        laserDamage: 180,
        timeLimit: 60,
        visualConfig: {
          type: 'cartesian',
          points: [{ x: 3, y: -4, label: 'Puncak (3, ?)', color: '#f43f5e' }],
          drawParabola: { a: 1, b: -6, c: 5 },
        },
        question: 'Amati kurva parabola y = x² − 6x + 5 pada Papan Kartesius! Di manakah koordinat titik balik minimum (titik puncak) parabola tersebut?',
        options: ['A. (3, −4)', 'B. (−3, −4)', 'C. (3, 4)', 'D. (6, −5)'],
        answer: 'A. (3, −4)',
        hint: 'Sumbu simetri x = −b / (2a) = 6 / 2 = 3. Masukkan x = 3 ke persamaan y.',
        explanation: 'x = 3 ⇒ y = 3² − 6(3) + 5 = 9 − 18 + 5 = −4. Jadi titik puncaknya (3, −4).',
      },
      {
        id: 'g9-m03',
        code: 'M-03',
        title: 'Tangki Silinder Inti',
        topic: 'Volume Tabung 3D',
        grade: 'kelas-9',
        points: 250,
        laserDamage: 190,
        timeLimit: 60,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'cylinder',
          dim1: 'r = 7 cm',
          dim2: 't = 20 cm',
        },
        question: 'Lihat hologram tabung dengan jari-jari alas r = 7 cm dan tinggi t = 20 cm. Berapa cm³ volume penuh silinder tersebut? (π = 22/7)',
        options: ['A. 1.540 cm³', 'B. 2.460 cm³', 'C. 3.080 cm³', 'D. 4.400 cm³'],
        answer: 'C. 3.080 cm³',
        numericAnswer: '3080',
        hint: 'Volume tabung = (22/7) × r × r × t.',
        explanation: 'V = (22/7) × 7 × 7 × 20 = 154 × 20 = 3.080 cm³.',
      },
      {
        id: 'g9-m04',
        code: 'M-04',
        title: 'Dilatasi + Refleksi Y',
        topic: 'Transformasi Ganda',
        grade: 'kelas-9',
        points: 300,
        laserDamage: 210,
        timeLimit: 75,
        visualConfig: {
          type: 'cartesian',
          points: [
            { x: 3, y: -2, label: 'K(3, −2)', color: '#38bdf8' },
            { x: -9, y: -6, label: 'Bayangan Akhir', color: '#fbbf24' },
          ],
          drawLine: true,
        },
        question: 'Titik K(3, −2) didilatasikan terhadap pusat O(0,0) dengan faktor skala k = 3, lalu dicerminkan terhadap SUMBU-Y. Koordinat bayangan akhirnya adalah...',
        options: ['A. (9, 6)', 'B. (−9, 6)', 'C. (−9, −6)', 'D. (−6, −9)'],
        answer: 'C. (−9, −6)',
        hint: 'Kalikan koordinat (3, −2) dengan 3 dulu, lalu cerminkan terhadap sumbu-Y dengan mengubah tanda x menjadi −x.',
        explanation: 'Dilatasi [O,3]: (9, −6). Refleksi sumbu-Y: (−9, −6).',
      },
      {
        id: 'g9-m05',
        code: 'M-05',
        title: 'Moncong Roket Kerucut',
        topic: 'Selimut Kerucut 3D',
        grade: 'kelas-9',
        points: 300,
        laserDamage: 210,
        timeLimit: 75,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'cone',
          dim1: 'r = 5 cm',
          dim2: 't = 12 cm',
          dim3: 's = ?',
        },
        question: 'Hologram moncong roket berbentuk kerucut mempunyai jari-jari r = 5 cm dan tinggi t = 12 cm. Berapakah luas selimut kerucut dalam satuan π?',
        options: ['A. 60π cm²', 'B. 65π cm²', 'C. 90π cm²', 'D. 120π cm²'],
        answer: 'B. 65π cm²',
        hint: 'Cari garis pelukis s dulu dengan Pythagoras dari r = 5 dan t = 12 (s = 13), lalu hitung L = π r s.',
        explanation: 's = √(5² + 12²) = 13 cm. Luas selimut = π × 5 × 13 = 65π cm².',
      },
      {
        id: 'g9-m06',
        code: 'M-06',
        title: 'Neraca Pangkat 64',
        topic: 'Persamaan Eksponen',
        grade: 'kelas-9',
        points: 300,
        laserDamage: 220,
        timeLimit: 60,
        visualConfig: {
          type: 'balance_scale',
          leftPan: '2^(x + 3)',
          rightPan: '64',
          scaleCaption: 'Cari x lalu hitung (x³ + 5)',
        },
        question: 'Agar Neraca Eksponen 2^(x + 3) = 64 seimbang, tentukan nilai x terlebih dahulu, lalu hitunglah nilai dari (x³ + 5)!',
        options: ['A. 14', 'B. 21', 'C. 32', 'D. 69'],
        answer: 'C. 32',
        numericAnswer: '32',
        hint: '64 = 2⁶, sehingga pangkat x + 3 = 6.',
        explanation: 'x + 3 = 6 ⇒ x = 3. Maka x³ + 5 = 3³ + 5 = 27 + 5 = 32.',
      },
      {
        id: 'g9-m07',
        code: 'M-07',
        title: 'Planet Bola Energi',
        topic: 'Volume Bola 3D',
        grade: 'kelas-9',
        points: 350,
        laserDamage: 230,
        timeLimit: 60,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'sphere',
          dim1: 'r = 6 cm',
        },
        question: 'Sebuah planet miniatur berbentuk bola pada hologram memiliki jari-jari r = 6 cm. Berapakah volume bola tersebut dalam satuan π?',
        options: ['A. 144π cm³', 'B. 216π cm³', 'C. 288π cm³', 'D. 432π cm³'],
        answer: 'C. 288π cm³',
        hint: 'Volume bola = (4/3) × π × r³.',
        explanation: 'V = (4/3) × π × 6³ = (4/3) × 216π = 288π cm³.',
      },
      {
        id: 'g9-m08',
        code: 'M-08',
        title: 'Lintasan Roket h(t)',
        topic: 'Nilai Maksimum Fungsi Kuadrat',
        grade: 'kelas-9',
        points: 350,
        laserDamage: 240,
        timeLimit: 75,
        visualConfig: {
          type: 'cartesian',
          points: [{ x: 4, y: 32, label: 'Maks (4, h)', color: '#fbbf24' }],
          drawParabola: { a: -2, b: 16, c: 0 },
        },
        question: 'Ketinggian lintasan roket mengikuti kurva h(t) = 16t − 2t² meter. Berapa meter ketinggian MAKSIMUM roket seperti terlihat di puncak parabola?',
        options: ['A. 24 m', 'B. 28 m', 'C. 32 m', 'D. 40 m'],
        answer: 'C. 32 m',
        numericAnswer: '32',
        hint: 'Waktu puncak t = −16 / (2 × −2) = 4 detik.',
        explanation: 'h(4) = 16(4) − 2(4²) = 64 − 32 = 32 meter.',
      },
      {
        id: 'g9-m09',
        code: 'M-09',
        title: 'Juring Jadi Kerucut',
        topic: 'Juring & Keliling Alas Kerucut',
        grade: 'kelas-9',
        points: 400,
        laserDamage: 260,
        timeLimit: 90,
        visualConfig: {
          type: 'circle_sector',
          radiusLabel: 's = 21 cm',
          angleDeg: 120,
          sectorLabel: 'Digulung Menjadi Kerucut',
        },
        question: 'Lempeng juring bersudut 120° berjari-jari 21 cm digulung membentuk selimut kerucut. Berapa cm JARI-JARI alas kerucut yang terbentuk?',
        options: ['A. 5 cm', 'B. 7 cm', 'C. 10,5 cm', 'D. 14 cm'],
        answer: 'B. 7 cm',
        numericAnswer: '7',
        hint: 'Panjang busur juring = Keliling alas kerucut ⇒ (120/360) × 2π(21) = 2π × r_alas.',
        explanation: '(1/3) × 2π × 21 = 2π × r_alas ⇒ r_alas = 21 / 3 = 7 cm.',
      },
      {
        id: 'g9-m10',
        code: 'M-10',
        title: 'Menara & Bayangan',
        topic: 'Kesebangunan Aplikatif',
        grade: 'kelas-9',
        points: 400,
        laserDamage: 250,
        timeLimit: 75,
        visualConfig: {
          type: 'right_triangle',
          sideA: 'Bayangan 1,5 m | 12 m',
          sideB: 'Tinggi 2 m | Menara ?',
          sideC: 'Sinar Matahari',
          angleLabel: '90°',
        },
        question: 'Pada saat yang sama, tongkat vertikal setinggi 2 m menghasilkan bayangan 1,5 m, sedangkan bayangan menara radar panjangnya 12 m. Berapa meter tinggi menara tersebut?',
        options: ['A. 14 m', 'B. 16 m', 'C. 18 m', 'D. 20 m'],
        answer: 'B. 16 m',
        numericAnswer: '16',
        hint: 'Tinggi / 2 = 12 / 1,5.',
        explanation: 'Tinggi Menara = 2 × (12 / 1,5) = 2 × 8 = 16 m.',
      },
      {
        id: 'g9-m11',
        code: 'M-11',
        title: 'Volume Kerucut s = 25',
        topic: 'Volume Kerucut & Pythagoras',
        grade: 'kelas-9',
        points: 450,
        laserDamage: 280,
        timeLimit: 90,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'cone',
          dim1: 'r = 7 cm',
          dim2: 't = ?',
          dim3: 's = 25 cm',
        },
        question: 'Sebuah kerucut mempunyai jari-jari r = 7 cm dan garis pelukis s = 25 cm. Hitunglah VOLUME kerucut tersebut! (π = 22/7)',
        options: ['A. 1.078 cm³', 'B. 1.232 cm³', 'C. 1.540 cm³', 'D. 3.696 cm³'],
        answer: 'B. 1.232 cm³',
        numericAnswer: '1232',
        hint: 'Cari tinggi kerucut t = √(25² − 7²) = 24 cm terlebih dahulu!',
        explanation: 't = 24 cm. Volume = (1/3) × (22/7) × 7 × 7 × 24 = 154 × 8 = 1.232 cm³.',
      },
      {
        id: 'g9-m12',
        code: 'M-12',
        title: 'BOSS METEOR: Kurva −x²+6x−5',
        topic: 'Rekonstruksi Fungsi Kuadrat',
        grade: 'kelas-9',
        points: 500,
        laserDamage: 350,
        timeLimit: 90,
        isBossMeteor: true,
        visualConfig: {
          type: 'cartesian',
          points: [
            { x: 1, y: 0, label: '(1,0)', color: '#38bdf8' },
            { x: 5, y: 0, label: '(5,0)', color: '#38bdf8' },
            { x: 3, y: 4, label: 'Puncak (3, ?)', color: '#fde047' },
          ],
          drawParabola: { a: -1, b: 6, c: -5 },
        },
        question: 'BOSS METEOR KELAS 9! Parabola y = −x² + 6x − 5 memotong sumbu-X di (1, 0) dan (5, 0). Berapakah nilai MAKSIMUM y pada titik puncaknya?',
        options: ['A. 3', 'B. 4', 'C. 5', 'D. 6'],
        answer: 'B. 4',
        numericAnswer: '4',
        hint: 'Absis puncak ada di tengah antara 1 dan 5, yaitu x = 3. Hitung y(3)!',
        explanation: 'y(3) = −(3²) + 6(3) − 5 = −9 + 18 − 5 = 4.',
      },
    ],
  },
];

// =========================================================================
// PROCEDURAL DYNAMIC VISUAL QUESTION GENERATOR
// =========================================================================

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function buildOptions(correct: number, unit: string = ''): { options: string[]; answer: string } {
  const wrong = new Set<number>();
  for (const off of [-6, -4, 4, 6, -2, 2, 8, -8, 10]) {
    if (wrong.size >= 3) break;
    if (correct + off !== correct && correct + off > -1000) wrong.add(correct + off);
  }
  const vals = [correct, ...Array.from(wrong).slice(0, 3)];
  for (let i = vals.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [vals[i], vals[j]] = [vals[j], vals[i]];
  }
  const labels = ['A', 'B', 'C', 'D'];
  const suffix = unit ? ` ${unit}` : '';
  const options = vals.map((v, i) => `${labels[i]}. ${v}${suffix}`);
  return { options, answer: options[vals.indexOf(correct)] };
}

export function generateDynamicVisualMission(grade: GalaxyGradeId): GalaxyMissionItem {
  const uid = `vdyn-${grade}-${Date.now()}-${randInt(100, 999)}`;
  const mode = randInt(1, 3);

  if (grade === 'kelas-7') {
    if (mode === 1) {
      const a = randInt(2, 5);
      const x = randInt(3, 11);
      const b = randInt(2, 14);
      const rhs = a * x + b;
      const mcq = buildOptions(x);
      return {
        id: uid,
        code: 'VIS',
        title: 'Neraca Aljabar Dinamis',
        topic: 'PLSV Kelas 7',
        grade: 'kelas-7',
        points: 300,
        laserDamage: 220,
        timeLimit: 60,
        visualConfig: {
          type: 'balance_scale',
          leftPan: `${a}x + ${b}`,
          rightPan: `${rhs}`,
          scaleCaption: `${a}x + ${b} = ${rhs}`,
        },
        question: `[MISI VISUAL DINAMIS] Amati Neraca Aljabar di samping: sisi kiri bernilai (${a}x + ${b}) dan sisi kanan bernilai ${rhs} dalam posisi seimbang. Berapakah nilai x?`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(x),
        hint: `Kurangkan ${b} dari ${rhs}, lalu bagi hasilnya dengan ${a}.`,
        explanation: `${a}x = ${rhs} − ${b} = ${a * x} ⇒ x = ${x}.`,
      };
    } else if (mode === 2) {
      const p = randInt(8, 16);
      const l = randInt(4, 9);
      const t = randInt(5, 10);
      const vol = p * l * t;
      const mcq = buildOptions(vol, 'cm³');
      return {
        id: uid,
        code: 'VIS',
        title: 'Hologram Tangki Balok Dinamis',
        topic: 'Volume Balok Kelas 7',
        grade: 'kelas-7',
        points: 300,
        laserDamage: 220,
        timeLimit: 60,
        visualConfig: {
          type: 'solid_3d',
          shape3d: 'cuboid',
          dim1: `p = ${p} cm`,
          dim2: `l = ${l} cm`,
          dim3: `t = ${t} cm`,
        },
        question: `[MISI VISUAL DINAMIS] Hitunglah volume balok 3D pada hologram dengan ukuran panjang ${p} cm, lebar ${l} cm, dan tinggi ${t} cm!`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(vol),
        hint: `V = ${p} × ${l} × ${t}.`,
        explanation: `V = ${p} × ${l} × ${t} = ${vol} cm³.`,
      };
    } else {
      const nA = randInt(15, 25);
      const nB = randInt(12, 22);
      const inter = randInt(3, 8);
      const out = randInt(2, 6);
      const total = nA + nB - inter + out;
      const mcq = buildOptions(inter, 'siswa');
      return {
        id: uid,
        code: 'VIS',
        title: 'Radar Diagram Venn Dinamis',
        topic: 'Himpunan Kelas 7',
        grade: 'kelas-7',
        points: 300,
        laserDamage: 220,
        timeLimit: 75,
        visualConfig: {
          type: 'venn_set',
          setA: { label: 'Sains', val: String(nA) },
          setB: { label: 'Robotik', val: String(nB) },
          intersectionVal: '?',
          outsideVal: String(out),
          totalVal: String(total),
        },
        question: `[MISI VISUAL DINAMIS] Dari ${total} siswa di Diagram Venn, ${nA} suka Sains, ${nB} suka Robotik, dan ${out} tidak suka keduanya. Berapa siswa yang menyukai KEDUANYA (?)?`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(inter),
        hint: `Irisan = (${nA} + ${nB}) − (${total} − ${out}).`,
        explanation: `(${nA} + ${nB}) − ${total - out} = ${inter} siswa.`,
      };
    }
  }

  if (grade === 'kelas-8') {
    if (mode === 1) {
      const base = [
        [3, 4, 5],
        [5, 12, 13],
        [8, 15, 17],
      ][randInt(0, 2)];
      const k = randInt(1, 3);
      const a = base[0] * k;
      const b = base[1] * k;
      const c = base[2] * k;
      const mcq = buildOptions(c, 'cm');
      return {
        id: uid,
        code: 'VIS',
        title: 'Radar Pythagoras Dinamis',
        topic: 'Pythagoras Kelas 8',
        grade: 'kelas-8',
        points: 350,
        laserDamage: 240,
        timeLimit: 60,
        visualConfig: {
          type: 'right_triangle',
          sideA: `${a} cm`,
          sideB: `${b} cm`,
          sideC: 'c = ? cm',
          angleLabel: '90°',
        },
        question: `[MISI VISUAL DINAMIS] Tentukan panjang sisi miring c pada segitiga siku-siku di samping jika kedua sisi penyikunya adalah ${a} cm dan ${b} cm!`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(c),
        hint: `Gunakan rumus c = √(${a}² + ${b}²).`,
        explanation: `c = √(${a * a} + ${b * b}) = √${c * c} = ${c} cm.`,
      };
    } else if (mode === 2) {
      const x1 = randInt(-3, 2);
      const y1 = randInt(-2, 3);
      const m = randInt(2, 4);
      const dx = randInt(2, 3);
      const x2 = x1 + dx;
      const y2 = y1 + m * dx;
      const mcq = buildOptions(m);
      return {
        id: uid,
        code: 'VIS',
        title: 'Gradien Kartesius Dinamis',
        topic: 'Gradien Garis Kelas 8',
        grade: 'kelas-8',
        points: 350,
        laserDamage: 240,
        timeLimit: 60,
        visualConfig: {
          type: 'cartesian',
          points: [
            { x: x1, y: y1, label: `A(${x1},${y1})`, color: '#38bdf8' },
            { x: x2, y: y2, label: `B(${x2},${y2})`, color: '#34d399' },
          ],
          drawLine: true,
        },
        question: `[MISI VISUAL DINAMIS] Tentukan gradien (kemiringan m) garis yang menghubungkan A(${x1}, ${y1}) ke B(${x2}, ${y2}) pada bidang Kartesius!`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(m),
        hint: `m = (${y2} − (${y1})) / (${x2} − (${x1})).`,
        explanation: `m = ${y2 - y1} / ${x2 - x1} = ${m}.`,
      };
    } else {
      const deg = [60, 90, 120, 180][randInt(0, 3)];
      const r = 14;
      const luas = Math.round((deg / 360) * 616);
      const mcq = buildOptions(luas, 'cm²');
      return {
        id: uid,
        code: 'VIS',
        title: 'Juring Lingkaran Dinamis',
        topic: 'Juring Kelas 8',
        grade: 'kelas-8',
        points: 350,
        laserDamage: 240,
        timeLimit: 75,
        visualConfig: {
          type: 'circle_sector',
          radiusLabel: `r = ${r} cm`,
          angleDeg: deg,
          sectorLabel: `Juring ${deg}°`,
        },
        question: `[MISI VISUAL DINAMIS] Hitunglah luas juring radar bersudut pusat ${deg}° dengan jari-jari r = ${r} cm! (π = 22/7)`,
        options: mcq.options,
        answer: mcq.answer,
        numericAnswer: String(luas),
        hint: `L = (${deg}/360) × (22/7) × ${r} × ${r}.`,
        explanation: `L = (${deg}/360) × 616 = ${luas} cm².`,
      };
    }
  }

  // KELAS 9
  if (mode === 1) {
    const t = [10, 15, 20, 25][randInt(0, 3)];
    const r = 7;
    const vol = 154 * t;
    const mcq = buildOptions(vol, 'cm³');
    return {
      id: uid,
      code: 'VIS',
      title: 'Volume Tabung 3D Dinamis',
      topic: 'BRSL Tabung Kelas 9',
      grade: 'kelas-9',
      points: 400,
      laserDamage: 260,
      timeLimit: 60,
      visualConfig: {
        type: 'solid_3d',
        shape3d: 'cylinder',
        dim1: `r = ${r} cm`,
        dim2: `t = ${t} cm`,
      },
      question: `[MISI VISUAL DINAMIS] Sebuah tabung 3D berjari-jari r = ${r} cm dan tinggi t = ${t} cm. Berapa cm³ volumenya? (π = 22/7)`,
      options: mcq.options,
      answer: mcq.answer,
      numericAnswer: String(vol),
      hint: `V = 154 × ${t}.`,
      explanation: `V = (22/7) × 7 × 7 × ${t} = ${vol} cm³.`,
    };
  } else if (mode === 2) {
    const xp = randInt(1, 4);
    const yp = randInt(2, 8);
    // y = -(x - xp)^2 + yp = -x^2 + 2*xp*x + (yp - xp^2)
    const bCoef = 2 * xp;
    const cCoef = yp - xp * xp;
    const cStr = cCoef >= 0 ? `+ ${cCoef}` : `− ${Math.abs(cCoef)}`;
    const mcq = buildOptions(yp);
    return {
      id: uid,
      code: 'VIS',
      title: 'Puncak Parabola Dinamis',
      topic: 'Fungsi Kuadrat Kelas 9',
      grade: 'kelas-9',
      points: 400,
      laserDamage: 260,
      timeLimit: 75,
      visualConfig: {
        type: 'cartesian',
        points: [{ x: xp, y: yp, label: `Puncak (${xp}, ?)`, color: '#fde047' }],
        drawParabola: { a: -1, b: bCoef, c: cCoef },
      },
      question: `[MISI VISUAL DINAMIS] Amati kurva parabola y = −x² + ${bCoef}x ${cStr}. Berapakah nilai MAKSIMUM y pada titik puncaknya?`,
      options: mcq.options,
      answer: mcq.answer,
      numericAnswer: String(yp),
      hint: `Sumbu simetri x = −b / (2a) = −${bCoef} / (−2) = ${xp}. Substitusikan x = ${xp}!`,
      explanation: `y(${xp}) = −(${xp * xp}) + ${bCoef * xp} + (${cCoef}) = ${yp}.`,
    };
  } else {
    const s = randInt(8, 12);
    const t = randInt(6, 12);
    const vol = Math.round((1 / 3) * s * s * t);
    const cleanT = t % 3 === 0 ? t : 9;
    const cleanVol = (s * s * cleanT) / 3;
    const mcq = buildOptions(cleanVol, 'cm³');
    return {
      id: uid,
      code: 'VIS',
      title: 'Volume Limas Dinamis',
      topic: 'Limas Persegi Kelas 9',
      grade: 'kelas-9',
      points: 400,
      laserDamage: 260,
      timeLimit: 60,
      visualConfig: {
        type: 'solid_3d',
        shape3d: 'pyramid',
        dim1: `s = ${s} cm`,
        dim2: `t = ${cleanT} cm`,
      },
      question: `[MISI VISUAL DINAMIS] Hologram limas persegi bersisi alas ${s} cm dan tinggi ${cleanT} cm. Berapa cm³ volumenya?`,
      options: mcq.options,
      answer: mcq.answer,
      numericAnswer: String(cleanVol),
      hint: `V = (1/3) × ${s}² × ${cleanT}.`,
      explanation: `V = (1/3) × ${s * s} × ${cleanT} = ${cleanVol} cm³.`,
    };
  }
}
