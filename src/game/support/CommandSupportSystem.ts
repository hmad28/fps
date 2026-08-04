import * as THREE from 'three';

export type SupportCategory = 'ORBITAL' | 'AIR' | 'SUPPLY' | 'DEFENSIVE' | 'TACTICAL';

export interface SupportOption {
  id: string;
  name: string;
  category: SupportCategory;
  codeSequence: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[];
  cooldown: number; // seconds
  callInDelay: number; // seconds before impact
  description: string;
}

export const SUPPORT_CATALOG: Record<string, SupportOption> = {
  kinetic_lance: {
    id: 'kinetic_lance',
    name: 'Precision Kinetic Strike',
    category: 'ORBITAL',
    codeSequence: ['UP', 'RIGHT', 'DOWN', 'LEFT', 'UP'],
    cooldown: 45,
    callInDelay: 2.5,
    description: 'High-velocity kinetic rod orbital tungsten beam.',
  },
  saturation_barrage: {
    id: 'saturation_barrage',
    name: 'Saturation Orbital Barrage',
    category: 'ORBITAL',
    codeSequence: ['RIGHT', 'DOWN', 'LEFT', 'UP', 'RIGHT'],
    cooldown: 75,
    callInDelay: 4.0,
    description: 'Heavy explosive saturation bombardment across a 25m radius.',
  },
  supply_capsule: {
    id: 'supply_capsule',
    name: 'AEGIS Supply Pod Drop',
    category: 'SUPPLY',
    codeSequence: ['DOWN', 'DOWN', 'RIGHT', 'UP'],
    cooldown: 60,
    callInDelay: 3.0,
    description: 'Physical resupply capsule containing ammo, grenades, and med-injectors.',
  },
  vtol_strafe: {
    id: 'vtol_strafe',
    name: 'VTOL Autocannon Flyby',
    category: 'AIR',
    codeSequence: ['UP', 'LEFT', 'RIGHT', 'DOWN'],
    cooldown: 50,
    callInDelay: 2.0,
    description: 'AEGIS strike craft performs a low-altitude 30mm strafing run.',
  },
  heavy_bomb: {
    id: 'heavy_bomb',
    name: '500kg Bunker Buster Ordnance',
    category: 'AIR',
    codeSequence: ['UP', 'RIGHT', 'DOWN', 'DOWN', 'DOWN'],
    cooldown: 90,
    callInDelay: 3.5,
    description: 'Massive high-explosive ordnance strike.',
  },
  autocannon_sentry: {
    id: 'autocannon_sentry',
    name: 'Deployable Autocannon Turret',
    category: 'DEFENSIVE',
    codeSequence: ['LEFT', 'DOWN', 'UP', 'RIGHT', 'RIGHT'],
    cooldown: 80,
    callInDelay: 3.0,
    description: 'Automated 40mm anti-armor turret pod.',
  },
  recon_drone: {
    id: 'recon_drone',
    name: 'Tactical Recon Sweep Drone',
    category: 'TACTICAL',
    codeSequence: ['UP', 'LEFT', 'RIGHT', 'DOWN'],
    cooldown: 40,
    callInDelay: 1.5,
    description: 'Deploys an aerial scanning drone to reveal all enemy patrols on tactical map.',
  },
  emp_pulse: {
    id: 'emp_pulse',
    name: 'EMP Stun Shockwave Beacon',
    category: 'TACTICAL',
    codeSequence: ['LEFT', 'RIGHT', 'DOWN', 'UP'],
    cooldown: 35,
    callInDelay: 1.0,
    description: 'High-voltage electric pulse that stuns all nearby biological & machine units.',
  },
};

export interface ActiveBeacon {
  id: string;
  supportId: string;
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  timer: number;
  maxDelay: number;
}

export class CommandSupportSystem {
  public equippedSupportIds: string[] = [
    'kinetic_lance',
    'supply_capsule',
    'vtol_strafe',
    'autocannon_sentry',
  ];

  public cooldowns: Record<string, number> = {};
  public activeBeacons: ActiveBeacon[] = [];
  public currentSequenceInput: ('UP' | 'DOWN' | 'LEFT' | 'RIGHT')[] = [];
  public isInterfaceOpen: boolean = false;

  constructor() {
    this.equippedSupportIds.forEach((id) => {
      this.cooldowns[id] = 0;
    });
  }

  public inputDirection(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT'): string | null {
    this.currentSequenceInput.push(dir);

    // Check if current input matches any equipped support option
    for (const id of this.equippedSupportIds) {
      const option = SUPPORT_CATALOG[id];
      if (!option) continue;

      if (this.cooldowns[id] > 0) continue;

      // Check exact sequence match
      if (this.currentSequenceInput.length === option.codeSequence.length) {
        let match = true;
        for (let i = 0; i < option.codeSequence.length; i++) {
          if (option.codeSequence[i] !== this.currentSequenceInput[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          // Sequence matched successfully!
          this.currentSequenceInput = [];
          this.cooldowns[id] = option.cooldown;
          return id;
        }
      }
    }

    // Reset sequence if input exceeds max length (5)
    if (this.currentSequenceInput.length >= 5) {
      this.currentSequenceInput = [];
    }

    return null;
  }

  public update(dt: number, scene: THREE.Scene, onImpact: (beacon: ActiveBeacon) => void) {
    // Update cooldowns
    Object.keys(this.cooldowns).forEach((id) => {
      if (this.cooldowns[id] > 0) {
        this.cooldowns[id] = Math.max(0, this.cooldowns[id] - dt);
      }
    });

    // Update active thrown beacons
    for (let i = this.activeBeacons.length - 1; i >= 0; i--) {
      const beacon = this.activeBeacons[i];
      beacon.timer += dt;

      // Beacon rotation light effect
      beacon.mesh.rotation.y += 4.0 * dt;

      if (beacon.timer >= beacon.maxDelay) {
        onImpact(beacon);
        scene.remove(beacon.mesh);
        this.activeBeacons.splice(i, 1);
      }
    }
  }

  public throwBeacon(supportId: string, spawnPos: THREE.Vector3, direction: THREE.Vector3, scene: THREE.Scene) {
    const option = SUPPORT_CATALOG[supportId];
    if (!option) return;

    const geo = new THREE.CylinderGeometry(0.1, 0.1, 0.4, 8);
    const mat = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Crimson beacon light
    const mesh = new THREE.Mesh(geo, mat);

    const targetPos = spawnPos.clone().addScaledVector(direction, 18);
    targetPos.y = 0.2; // Ground height
    mesh.position.copy(targetPos);
    scene.add(mesh);

    // Glowing beam
    const beamGeo = new THREE.CylinderGeometry(0.05, 0.05, 12, 8);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.5 });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 6;
    mesh.add(beam);

    this.activeBeacons.push({
      id: Math.random().toString(),
      supportId,
      mesh,
      position: targetPos,
      timer: 0,
      maxDelay: option.callInDelay,
    });
  }
}
