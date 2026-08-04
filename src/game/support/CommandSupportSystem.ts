import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';

export type SupportCategory = 'ORBITAL' | 'AIR' | 'SUPPLY' | 'DEFENSIVE' | 'TACTICAL';
export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export interface SupportOption { id: string; name: string; category: SupportCategory; codeSequence: Direction[]; cooldown: number; callInDelay: number; description: string; }

const support = (id: string, name: string, category: SupportCategory, codeSequence: Direction[], cooldown: number, callInDelay: number, description: string): SupportOption => ({ id, name, category, codeSequence, cooldown, callInDelay, description });

export const SUPPORT_CATALOG: Record<string, SupportOption> = {
  kinetic_lance: support('kinetic_lance', 'Kinetic Lance', 'ORBITAL', ['UP', 'RIGHT', 'DOWN', 'LEFT', 'UP'], 45, 3.2, 'Precision penetrator strike.'),
  saturation_barrage: support('saturation_barrage', 'Saturation Barrage', 'ORBITAL', ['RIGHT', 'DOWN', 'LEFT', 'UP', 'RIGHT'], 75, 5, 'Wide-area explosive barrage.'),
  vtol_strafe: support('vtol_strafe', 'Rook VTOL Strafe', 'AIR', ['UP', 'LEFT', 'DOWN', 'RIGHT'], 50, 3, 'Autocannon fly-through.'),
  heavy_bomb: support('heavy_bomb', 'Gravemark Heavy Bomb', 'AIR', ['UP', 'RIGHT', 'DOWN', 'DOWN', 'LEFT'], 90, 4.5, 'Delayed bunker-breaking ordnance.'),
  incendiary_sweep: support('incendiary_sweep', 'Cinderline Sweep', 'AIR', ['RIGHT', 'RIGHT', 'DOWN', 'LEFT'], 65, 3.8, 'Persistent incendiary lane.'),
  cluster_salvo: support('cluster_salvo', 'Mosaic Rocket Salvo', 'AIR', ['DOWN', 'UP', 'RIGHT', 'RIGHT', 'LEFT'], 70, 3.4, 'Anti-infantry cluster rockets.'),
  supply_capsule: support('supply_capsule', 'Supply Capsule', 'SUPPLY', ['DOWN', 'DOWN', 'RIGHT', 'UP'], 60, 4, 'Ammo, grenades, and injectors.'),
  hmg_drop: support('hmg_drop', 'Heavy Machine Gun Drop', 'SUPPLY', ['LEFT', 'DOWN', 'RIGHT', 'UP'], 70, 4, 'Crew-portable support gun.'),
  anti_armor_drop: support('anti_armor_drop', 'Manticore Launcher Drop', 'SUPPLY', ['DOWN', 'LEFT', 'UP', 'RIGHT'], 75, 4, 'Tandem anti-armor launcher.'),
  rail_cannon_drop: support('rail_cannon_drop', 'Rail Cannon Drop', 'SUPPLY', ['RIGHT', 'UP', 'LEFT', 'DOWN', 'RIGHT'], 100, 4.5, 'Experimental hypervelocity rifle.'),
  autocannon_sentry: support('autocannon_sentry', 'Autocannon Sentry', 'DEFENSIVE', ['LEFT', 'DOWN', 'UP', 'RIGHT', 'RIGHT'], 80, 4.2, 'Automated anti-armor emplacement.'),
  mg_sentry: support('mg_sentry', 'Machine Gun Sentry', 'DEFENSIVE', ['DOWN', 'UP', 'LEFT', 'RIGHT'], 60, 3.8, 'Automated suppressive gun.'),
  missile_sentry: support('missile_sentry', 'Missile Sentry', 'DEFENSIVE', ['RIGHT', 'LEFT', 'UP', 'UP', 'DOWN'], 95, 4.4, 'Anti-air and anti-heavy launcher.'),
  energy_shield: support('energy_shield', 'Deployable Energy Shield', 'DEFENSIVE', ['LEFT', 'RIGHT', 'UP', 'DOWN', 'LEFT'], 85, 3.5, 'Temporary hemispherical protection.'),
  recon_drone: support('recon_drone', 'Recon Drone', 'TACTICAL', ['UP', 'LEFT', 'RIGHT', 'DOWN'], 40, 2, 'Maps patrols and weak points.'),
  emp_pulse: support('emp_pulse', 'EMP Pulse Beacon', 'TACTICAL', ['LEFT', 'RIGHT', 'DOWN', 'UP'], 35, 2.2, 'Disrupts nearby machines.'),
};

export interface ActiveBeacon { id: string; supportId: string; mesh: THREE.Group; position: THREE.Vector3; velocity: THREE.Vector3; timer: number; maxDelay: number; landed: boolean; }

export class CommandSupportSystem {
  public equippedSupportIds = ['kinetic_lance', 'supply_capsule', 'vtol_strafe', 'autocannon_sentry'];
  public cooldowns: Record<string, number> = {};
  public activeBeacons: ActiveBeacon[] = [];
  public currentSequenceInput: Direction[] = [];
  public isInterfaceOpen = false;

  constructor() { this.equippedSupportIds.forEach((id) => { this.cooldowns[id] = 0; }); }

  public inputDirection(direction: Direction) {
    this.currentSequenceInput.push(direction);
    const candidates = this.equippedSupportIds.filter((id) => this.cooldowns[id] <= 0 && SUPPORT_CATALOG[id].codeSequence.slice(0, this.currentSequenceInput.length).every((value, index) => value === this.currentSequenceInput[index]));
    if (!candidates.length) { this.currentSequenceInput = []; return null; }
    const match = candidates.find((id) => SUPPORT_CATALOG[id].codeSequence.length === this.currentSequenceInput.length);
    if (!match) return null;
    this.currentSequenceInput = [];
    this.cooldowns[match] = SUPPORT_CATALOG[match].cooldown;
    return match;
  }

  public update(dt: number, scene: THREE.Scene, onImpact: (beacon: ActiveBeacon) => void) {
    Object.keys(this.cooldowns).forEach((id) => { this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt); });
    for (let i = this.activeBeacons.length - 1; i >= 0; i--) {
      const beacon = this.activeBeacons[i];
      if (!beacon.landed) {
        beacon.velocity.y -= 16 * dt;
        beacon.position.addScaledVector(beacon.velocity, dt);
        if (beacon.position.y <= 0.18) { beacon.position.y = 0.18; beacon.landed = true; beacon.velocity.set(0, 0, 0); }
        beacon.mesh.position.copy(beacon.position);
        beacon.mesh.rotation.x += dt * 7;
      } else {
        beacon.timer += dt;
        beacon.mesh.rotation.y += dt * 5;
        if (beacon.timer >= beacon.maxDelay) {
          onImpact(beacon);
          scene.remove(beacon.mesh);
          this.activeBeacons.splice(i, 1);
        }
      }
    }
  }

  public throwBeacon(supportId: string, spawnPos: THREE.Vector3, direction: THREE.Vector3, scene: THREE.Scene) {
    const option = SUPPORT_CATALOG[supportId];
    if (!option) return;
    const mesh = new THREE.Group();
    const grenade = AssetLoader.getInstance().getModel('grenade');
    if (grenade) { grenade.scale.setScalar(0.45); mesh.add(grenade); }
    const light = new THREE.PointLight(0xe45c37, 8, 26);
    mesh.add(light);
    const position = spawnPos.clone().add(new THREE.Vector3(0, -0.7, 0));
    mesh.position.copy(position);
    scene.add(mesh);
    this.activeBeacons.push({ id: `beacon_${Date.now()}`, supportId, mesh, position, velocity: direction.clone().multiplyScalar(17).add(new THREE.Vector3(0, 7.5, 0)), timer: 0, maxDelay: option.callInDelay, landed: false });
  }
}
