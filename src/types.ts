export type WeaponId = 'ar_vanguard' | 'smg_pest' | 'sg_breaker' | 'mr_lance' | 'pistol_defender';

export interface PlayerStats {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  stamina: number;
  medInjectors: number;
  currentClip: number;
  reserveMags: number;
  weaponName: string;
  weaponCategory: string;
  grenadesCount: number;
  supportSequence: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[];
  isSupportOpen: boolean;
  objectiveText: string;
  extractionAvailable: boolean;
  extractionCalled: boolean;
  extractionTimer: number;
  extractionInput: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[];
  extractionTerminal: boolean;
  supportCooldowns: Record<string, number>;
  samples: number;
  interactionPrompt: string | null;
  alertLevel: 'LOW' | 'CONTACT' | 'HEAVY';
  armorType: 'light' | 'medium' | 'heavy';
  injuries: {
    head: boolean;
    torso: boolean;
    leftArm: boolean;
    rightArm: boolean;
    leftLeg: boolean;
    rightLeg: boolean;
  };
  stance: string;
}

export interface HitMarker {
  id?: string;
  isHeadshot: boolean;
  damage: number;
  timestamp?: number;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export type GameDifficulty = 'recon' | 'contested' | 'hostile' | 'severe' | 'black_front';

export interface GameSettings {
  soundVolume: number;
  mouseSensitivity: number;
  touchSensitivity: number;
  invertY: boolean;
  crosshairColor: string;
  difficulty: GameDifficulty;
  fov: number;
}
