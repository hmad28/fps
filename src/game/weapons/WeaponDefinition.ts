export type WeaponClass = 'assault_rifle' | 'battle_rifle' | 'smg' | 'shotgun' | 'marksman' | 'energy' | 'pistol' | 'revolver' | 'launcher';

export interface WeaponDef {
  id: string;
  name: string;
  category: WeaponClass;
  damage: number;
  fireRate: number; // shots per second
  magazineSize: number;
  maxReserveMags: number;
  reloadTime: number; // seconds
  recoilPitch: number;
  recoilYaw: number;
  spread: number;
  pellets: number;
  armorPenetration: number; // 1 to 5
  projectileSpeed: number; // 0 = hitscan, >0 = physical projectile
  effectiveRange: number;
  description: string;
}

export const WEAPON_DEFINITIONS: Record<string, WeaponDef> = {
  ar_vanguard: {
    id: 'ar_vanguard',
    name: 'AR-21 Vanguard Rifle',
    category: 'assault_rifle',
    damage: 28,
    fireRate: 10,
    magazineSize: 30,
    maxReserveMags: 5,
    reloadTime: 2.2,
    recoilPitch: 0.025,
    recoilYaw: 0.01,
    spread: 0.015,
    pellets: 1,
    armorPenetration: 2,
    projectileSpeed: 0, // Hitscan
    effectiveRange: 80,
    description: 'AEGIS standard-issue 7.62mm full-auto assault rifle.',
  },
  smg_pest: {
    id: 'smg_pest',
    name: 'SMG-9 Locust',
    category: 'smg',
    damage: 18,
    fireRate: 15,
    magazineSize: 40,
    maxReserveMags: 6,
    reloadTime: 1.8,
    recoilPitch: 0.015,
    recoilYaw: 0.015,
    spread: 0.035,
    pellets: 1,
    armorPenetration: 1,
    projectileSpeed: 0,
    effectiveRange: 45,
    description: 'High rate of fire submachine gun for close quarters.',
  },
  sg_breaker: {
    id: 'sg_breaker',
    name: 'SG-12 Enforcer Shotgun',
    category: 'shotgun',
    damage: 16,
    fireRate: 1.8,
    magazineSize: 8,
    maxReserveMags: 4,
    reloadTime: 3.0,
    recoilPitch: 0.08,
    recoilYaw: 0.03,
    spread: 0.07,
    pellets: 9,
    armorPenetration: 2,
    projectileSpeed: 0,
    effectiveRange: 25,
    description: 'Heavy tactical semi-automatic double-barrel shotgun.',
  },
  mr_lance: {
    id: 'mr_lance',
    name: 'MR-50 Apex Marksman',
    category: 'marksman',
    damage: 95,
    fireRate: 1.2,
    magazineSize: 6,
    maxReserveMags: 4,
    reloadTime: 2.8,
    recoilPitch: 0.09,
    recoilYaw: 0.01,
    spread: 0.002,
    pellets: 1,
    armorPenetration: 4,
    projectileSpeed: 0,
    effectiveRange: 180,
    description: 'High-caliber armor-piercing anti-materiel sniper rifle.',
  },
  pistol_defender: {
    id: 'pistol_defender',
    name: 'P-12 Sentinel Sidearm',
    category: 'pistol',
    damage: 32,
    fireRate: 6,
    magazineSize: 12,
    maxReserveMags: 5,
    reloadTime: 1.4,
    recoilPitch: 0.02,
    recoilYaw: 0.008,
    spread: 0.02,
    pellets: 1,
    armorPenetration: 1,
    projectileSpeed: 0,
    effectiveRange: 50,
    description: 'Reliable semi-automatic tactical sidearm.',
  },
  aa_manticore: {
    id: 'aa_manticore',
    name: 'ML-6 Manticore Launcher',
    category: 'launcher',
    damage: 240,
    fireRate: 0.55,
    magazineSize: 1,
    maxReserveMags: 2,
    reloadTime: 3.6,
    recoilPitch: 0.14,
    recoilYaw: 0.025,
    spread: 0.004,
    pellets: 1,
    armorPenetration: 5,
    projectileSpeed: 62,
    effectiveRange: 160,
    description: 'Single-shot recovered anti-armor launcher with tandem penetrator.',
  },
};
