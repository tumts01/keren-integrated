export interface Team {
  id: string;
  name: string;
  color: string;
  bgLight: string;
  borderColor: string;
  avatarIcon: string;
  position: number; // 0 to 40
  score: number; // Coins / Points
  items: PowerUpItem[];
  correctCount: number;
  wrongCount: number;
  members: string; // Comma-separated or description
  shieldActive?: boolean;
  multiplierActive?: boolean;
}

export type TileType = 
  | 'start' 
  | 'quiz' 
  | 'duel' 
  | 'chest' 
  | 'hazard' 
  | 'gatekeeper' 
  | 'finish';

export interface Tile {
  id: number;
  type: TileType;
  title: string;
  zone: 1 | 2 | 3 | 4;
  zoneName: string;
  description: string;
  icon: string;
  color: string;
}

export interface Question {
  id: string;
  title: string;
  category: 'Sains Eksperimen' | 'Logika & Nalar' | 'Matematika Kritis' | 'Studi Kasus Alam' | 'Teka-Teki Kelompok';
  difficulty: 'Mudah' | 'Sedang' | 'Menantang' | 'Boss Gatekeeper';
  points: number;
  bonusSteps: number;
  question: string;
  contextClue?: string;
  correctAnswer: string;
  explanation: string;
  used?: boolean;
}

export interface PowerUpItem {
  id: string;
  name: string;
  icon: string;
  description: string;
  type: 'shield' | 'boost' | 'time' | 'multiplier' | 'clue';
}

export interface GameLog {
  id: string;
  timestamp: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  text: string;
  type: 'move' | 'correct' | 'wrong' | 'item' | 'gate' | 'win';
}

export interface GameSession {
  id: string;
  name: string; // e.g. "Kelas 8A - Pertemuan 1"
  mapel: string;
  kelas: string;
  savedAt: string;
  currentTurn: number; // 0..3
  round: number;
  teams: Team[];
  gameLog: GameLog[];
  usedQuestionIds: string[];
  winnerTeamId?: string;
}

export interface SaveSlot {
  id: string;
  name: string;
  kelas: string;
  mapel: string;
  date: string;
  session: GameSession;
}
