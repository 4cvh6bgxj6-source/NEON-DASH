import { LevelConfig, Skin } from './types';

export const CANVAS_WIDTH = 1200;
export const CANVAS_HEIGHT = 600;
export const GROUND_Y = CANVAS_HEIGHT - 100;

export const SKINS: Skin[] = [
  { id: '1', name: 'Starter Cube', price: 0, color: '#3b82f6', iconType: 'default' },
  { id: '2', name: 'Green Happy', price: 0, color: '#22c55e', iconType: 'smile' },
  { id: '3', name: 'Gem Bot', price: 100, color: '#f43f5e', iconType: 'robot' },
  
  // SKIN PREMIUM (Accessibili solo con Premium o VIP)
  { 
    id: '4', 
    name: 'Shadow Ninja', 
    price: 0, 
    color: '#64748b', 
    iconType: 'ninja', 
    isExclusive: true, 
    exclusiveType: 'premium' 
  },
  { 
    id: '7', 
    name: 'Matrix Runner', 
    price: 0, 
    color: '#10b981', 
    iconType: 'ninja', 
    isExclusive: true, 
    exclusiveType: 'premium' 
  },
  { 
    id: '9', 
    name: 'Purple Storm', 
    price: 0, 
    color: '#a855f7', 
    iconType: 'pro', 
    isExclusive: true, 
    exclusiveType: 'premium' 
  },

  // SKIN VIP (Accessibili SOLO con VIP)
  { 
    id: '5', 
    name: 'ULTRA GOLD', 
    price: 0, 
    color: '#fbbf24', 
    iconType: 'pro',
    speedMultiplier: 0.85,
    scoreMultiplier: 2,
    isExclusive: true,
    exclusiveType: 'vip'
  },
  { 
    id: '6', 
    name: 'Neon Ghost', 
    price: 0, 
    color: '#00f2ff', 
    iconType: 'robot', 
    isExclusive: true, 
    exclusiveType: 'vip' 
  },
  { 
    id: '8', 
    name: 'Cyber Dragon', 
    price: 0, 
    color: '#ef4444', 
    iconType: 'pro', 
    isExclusive: true, 
    exclusiveType: 'vip' 
  },
  { 
    id: '10', 
    name: 'Cosmic Overlord', 
    price: 0, 
    color: '#ffffff', 
    iconType: 'ninja', 
    isExclusive: true, 
    exclusiveType: 'vip' 
  },
];

export const PRESET_LEVELS: LevelConfig[] = [
  {
    themeName: 'Stereo Madness',
    primaryColor: '#3b82f6',
    secondaryColor: '#ffffff',
    speed: 12,
    gravity: 0.7,
    jumpForce: -14,
    description: 'Livello base - Velocità 1.5x.',
    spawnChance: 0.02,
    minGap: 400,
    levelLength: 10000
  },
  {
    themeName: 'Back on Track',
    primaryColor: '#a855f7',
    secondaryColor: '#f472b6',
    speed: 16,
    gravity: 0.8,
    jumpForce: -15,
    description: 'Sfida intermedia - Velocità 2x.',
    spawnChance: 0.03,
    minGap: 350,
    levelLength: 15000
  },
  {
    themeName: 'Clubstep (HELL MODE)',
    primaryColor: '#ff0000',
    secondaryColor: '#450a0a',
    speed: 24,
    gravity: 1.0,
    jumpForce: -18,
    description: 'VELOCITÀ 3X E TRAPPOLE INVISIBILI. BUONA FORTUNA.',
    spawnChance: 0.15,
    minGap: 100,
    levelLength: 30000,
    hiddenChance: 0.3
  }
];

export const DEFAULT_LEVEL_CONFIG: LevelConfig = PRESET_LEVELS[0];

export const PHYSICS = {
  GRAVITY: 0.8,
  JUMP_FORCE: -14,
  ROTATE_SPEED: 0.1,
  PARTICLE_COUNT: 20
};