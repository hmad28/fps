export type AIState =
  | 'IDLE'
  | 'PATROL'
  | 'INVESTIGATE'
  | 'ALERT'
  | 'ENGAGE'
  | 'CALL_REINFORCEMENT'
  | 'STAGGERED'
  | 'DEAD';

export type FactionType = 'brood' | 'iron' | 'astral';

export type EnemyArchetype =
  // Brood
  | 'scuttler'
  | 'needle_spitter'
  | 'razorleaper'
  | 'hive_warrior'
  | 'carapace_warden'
  | 'rambeast'
  // Iron Choir
  | 'legion_rifleman'
  | 'rocket_legionary'
  | 'bulwark_gunner'
  | 'red_reaper'
  | 'sentinel_walker'
  | 'forge_enforcer'
  // Astral Synod
  | 'converted'
  | 'oracle_drone'
  | 'astral_sentinel'
  | 'ascended_sentinel';

export interface EnemyStats {
  id: string;
  name: string;
  faction: FactionType;
  archetype: EnemyArchetype;
  health: number;
  maxHealth: number;
  armorRating: number; // 1 to 5
  moveSpeed: number;
  turnRate: number;
  attackRange: number;
  isCaller: boolean;
  callTimer: number; // Duration of reinforcement call telegraph
  maxCallDuration: number;
}
