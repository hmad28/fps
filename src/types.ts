export type WeaponId = 'pistol' | 'rifle' | 'shotgun' | 'launcher' | 'sniper';

export interface WeaponConfig {
  id: WeaponId;
  name: string;
  category: string;
  damage: number; // damage per bullet/pellet
  fireRate: number; // shots per second
  magazineSize: number;
  maxReserveAmmo: number;
  reloadTime: number; // in milliseconds
  recoilPitch: number; // radians vertical kick
  recoilYaw: number; // radians horizontal kick
  recoilRecovery: number; // recovery speed
  spread: number; // cone angle in radians
  pellets: number; // pellet count per trigger pull
  description: string;
  color: string;
  gunLength: number;
  barrelRadius: number;
}

export interface PlayerStats {
  health: number;
  maxHealth: number;
  shield: number;
  maxShield: number;
  score: number;
  kills: number;
  headshots: number;
  wave: number;
  selectedWeaponId: WeaponId;
  ammo: Record<WeaponId, { clip: number; reserve: number }>;
  isReloading: boolean;
  reloadProgress: number; // 0 to 1
  grenades: number;
  empCooldown: number; // 0 to 1 (progress/cooldown ratio)
  empCooldownSeconds: number; // remaining seconds
  stage: number; // 1 to 5
  objectiveProgress: number; // 0 to 100
  objectiveText: string;
  isSprinting: boolean;
  isCrouching: boolean;
  isSliding: boolean;
  isADS: boolean;
  slideTimer: number;
  activeUpgrades: string[];
  
  // Eclipse Protocol State
  biome: 'neon' | 'bio' | 'frozen';
  weaponElements: Record<WeaponId, 'none' | 'plasma' | 'cryo' | 'arc' | 'void' | 'chrono' | 'corruption'>;
  weaponBehaviors: Record<WeaponId, 'none' | 'ricochet' | 'split' | 'echo' | 'orbit' | 'return' | 'detonate'>;
  activePortals: string[]; // e.g. ["safe", "hazard", "unknown", "extraction"]
  hunterActive: boolean;
  hunterAdaptation: string;
  worldShiftName: string;
  worldShiftTimeRemaining: number;
  anomalyCores: number;
  runStage: number;
  extractionActive: boolean;
  workbenchActive: boolean;

  // Blacksite: Fallen City State
  activeDistrict: 'collapsed_gate' | 'neon_market' | 'transit_hub' | 'flooded_city' | 'industrial_spine' | 'corporate_skyline' | 'undercity' | 'safehouse';
  powerGrid: 'online' | 'unstable' | 'offline';
  metroStatus: 'active' | 'damaged' | 'offline';
  securityLevel: number;
  civilianSafety: number;
  heliosControl: number;
  rebelInfluence: number;
  militaryInfluence: number;
  weatherState: 'clear' | 'rain' | 'storm' | 'acid-rain';
  timeOfNight: string;
  flashlightActive: boolean;
  nightVisionActive: boolean;
  activeMissions: { id: string; name: string; desc: string; status: 'active' | 'completed'; district: string }[];
}

export interface UpgradeOption {
  id: string;
  title: string;
  description: string;
  icon: string;
}

export type EnemyType = 'grunt' | 'patrol' | 'heavy' | 'sniper' | 'boss';
export type AIState = 'PATROL' | 'ALERT' | 'PURSUING' | 'ATTACKING' | 'DEAD' | 'STUNNED';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface EnemyData {
  id: string;
  type: EnemyType;
  name: string;
  health: number;
  maxHealth: number;
  position: Point3D;
  rotationY: number;
  patrolPoints: Point3D[];
  patrolIndex: number;
  state: AIState;
  isHitFlashing: boolean;
  hitFlashTimer: number;
  attackCooldown: number;
  alertLevel: number; // 0 to 1
  stunTimer?: number;
  isBoss?: boolean;
}

export type PickupType = 'health' | 'ammo_pistol' | 'ammo_rifle' | 'ammo_shotgun' | 'ammo_launcher' | 'ammo_sniper' | 'shield' | 'grenade' | 'intel' | 'anomaly_core';

export interface PickupData {
  id: string;
  type: PickupType;
  position: Point3D;
  active: boolean;
  rotation: number;
  isDropped?: boolean;
  lifetimeRemaining?: number;
}

export interface HitMarker {
  id: string;
  timestamp: number;
  isHeadshot: boolean;
  damage: number;
  position: Point3D;
}

export interface DamageIndicator {
  id: string;
  angle: number; // direction angle relative to player view
  intensity: number;
  timestamp: number;
}

export type GameDifficulty = 'easy' | 'normal' | 'hard' | 'nightmare';

export interface GameSettings {
  soundVolume: number; // 0 to 1
  mouseSensitivity: number; // 0.1 to 3
  touchSensitivity: number; // 0.5 to 5
  invertY: boolean;
  crosshairColor: string;
  difficulty: GameDifficulty;
  fov: number; // 60 to 100
  cameraShake: number; // 0 to 1
}
