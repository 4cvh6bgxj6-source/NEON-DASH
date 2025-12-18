
export enum GameState {
  START = 'START',
  PLAYING = 'PLAYING',
  GAMEOVER = 'GAMEOVER',
  SKIN_SHOP = 'SKIN_SHOP',
  MEMBERSHIP_SHOP = 'MEMBERSHIP_SHOP'
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'spike' | 'block' | 'orb';
  id: string;
  triggered?: boolean;
  hidden?: boolean;
}

export interface LevelConfig {
  themeName: string;
  primaryColor: string;
  secondaryColor: string;
  speed: number;
  gravity: number;
  jumpForce: number;
  description: string;
  spawnChance: number;
  minGap: number;
  levelLength: number;
  hiddenChance?: number;
}

export interface Skin {
  id: string;
  name: string;
  price: number;
  color: string;
  iconType: 'default' | 'smile' | 'robot' | 'ninja' | 'pro';
  speedMultiplier?: number;
  scoreMultiplier?: number;
  isExclusive?: boolean;
  exclusiveType?: 'premium' | 'vip';
}

export interface Player {
  y: number;
  velocity: number;
  size: number;
  rotation: number;
}

export interface ProgressData {
  gems: number;
  unlockedSkinIds: string[];
  lastSelectedSkinId: string;
  timestamp: number;
  hasVip: boolean;
  hasPremium: boolean;
}
