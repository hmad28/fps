import { WeaponConfig, WeaponId } from '../types';

export const WEAPON_CONFIGS: Record<WeaponId, WeaponConfig> = {
  pistol: {
    id: 'pistol',
    name: 'VX-9 Tactical Pistol',
    category: 'Handgun',
    damage: 28,
    fireRate: 4.5, // 4.5 shots/sec
    magazineSize: 12,
    maxReserveAmmo: 72,
    reloadTime: 1200, // 1.2s
    recoilPitch: 0.035, // radians
    recoilYaw: 0.012,
    recoilRecovery: 8.5,
    spread: 0.01,
    pellets: 1,
    description: 'Elite sidearm with snappy single-shot accuracy and lightning fast reload.',
    color: '#06b6d4', // cyan accent
    gunLength: 0.35,
    barrelRadius: 0.025,
  },
  rifle: {
    id: 'rifle',
    name: 'AR-47 Pulse Rifle',
    category: 'Automatic',
    damage: 24,
    fireRate: 9.5, // 9.5 shots/sec
    magazineSize: 30,
    maxReserveAmmo: 180,
    reloadTime: 1850, // 1.85s
    recoilPitch: 0.022,
    recoilYaw: 0.016,
    recoilRecovery: 6.8,
    spread: 0.024,
    pellets: 1,
    description: 'Futuristic assault rifle firing high-velocity thermal kinetic pulses.',
    color: '#38bdf8', // sky blue
    gunLength: 0.75,
    barrelRadius: 0.035,
  },
  shotgun: {
    id: 'shotgun',
    name: 'M12 Breacher Shotgun',
    category: 'Spread Barricade',
    damage: 16, // per pellet
    fireRate: 1.2, // 1.2 shots/sec
    magazineSize: 8,
    maxReserveAmmo: 32,
    reloadTime: 2200, // 2.2s
    recoilPitch: 0.09,
    recoilYaw: 0.045,
    recoilRecovery: 5.2,
    spread: 0.095, // heavy close spread
    pellets: 8, // 8 pellets!
    description: 'Devastating close-quarters kinetic spreader. Guaranteed crowd control.',
    color: '#fbbf24', // golden amber
    gunLength: 0.7,
    barrelRadius: 0.045,
  },
  launcher: {
    id: 'launcher',
    name: 'R-7 Hydra Rocket Launcher',
    category: 'Explosive Heavy',
    damage: 150, // high impact + area splash
    fireRate: 0.75, // slow fire rate
    magazineSize: 3,
    maxReserveAmmo: 9,
    reloadTime: 2800, // 2.8s
    recoilPitch: 0.14,
    recoilYaw: 0.03,
    recoilRecovery: 4.2,
    spread: 0.005,
    pellets: 1,
    description: 'Micro-missile launch platform dealing extreme splash impact and structural damage.',
    color: '#f97316', // orange explosion
    gunLength: 1.0,
    barrelRadius: 0.075,
  },
  sniper: {
    id: 'sniper',
    name: 'SR-90 Rail Sniper',
    category: 'Precision Bolt',
    damage: 140, // high-caliber armor piercer
    fireRate: 0.6, // 0.6 shots/sec
    magazineSize: 5,
    maxReserveAmmo: 15,
    reloadTime: 3000, // 3.0s
    recoilPitch: 0.16,
    recoilYaw: 0.012,
    recoilRecovery: 3.5,
    spread: 0.001,
    pellets: 1,
    description: 'Anti-material rail system utilizing solid electromagnetic penetrators.',
    color: '#a855f7', // purple tech
    gunLength: 1.25,
    barrelRadius: 0.04,
  },
};
