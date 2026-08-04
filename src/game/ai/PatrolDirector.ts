import * as THREE from 'three';
import { EnemyAgent } from './EnemyAgent';
import { FactionType } from './AIStateMachine';

export class PatrolDirector {
  private spawnTimer: number = 0;
  private spawnInterval: number = 18.0; // 18s interval between roaming patrols

  public update(
    dt: number,
    playerPos: THREE.Vector3,
    activeEnemies: EnemyAgent[],
    currentFaction: FactionType,
    scene: THREE.Scene,
    onSpawnPatrol: (patrol: EnemyAgent[]) => void
  ) {
    if (activeEnemies.length >= 24) return;

    this.spawnTimer += dt;
    if (this.spawnTimer >= this.spawnInterval) {
      this.spawnTimer = 0;

      // Spawn roaming patrol outside player view (approx 45-70m away)
      const angle = Math.random() * Math.PI * 2;
      const dist = 50 + Math.random() * 20;
      const spawnPos = new THREE.Vector3(
        playerPos.x + Math.cos(angle) * dist,
        0,
        playerPos.z + Math.sin(angle) * dist
      );

      // Patrol waypoints walking across the sector
      const waypoints: THREE.Vector3[] = [
        spawnPos.clone(),
        spawnPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60)),
        spawnPos.clone().add(new THREE.Vector3((Math.random() - 0.5) * 60, 0, (Math.random() - 0.5) * 60)),
      ];

      const patrolSquad: EnemyAgent[] = [];
      const squadSize = 3 + Math.floor(Math.random() * 2);

      for (let i = 0; i < squadSize; i++) {
        const offsetPos = spawnPos.clone().add(new THREE.Vector3((i - 1) * 2.5, 0, (i - 1) * 2.5));
        let agent: EnemyAgent;

        if (currentFaction === 'iron') {
          const type = i === 0 ? 'legion_rifleman' : (i === 1 ? 'rocket_legionary' : 'red_reaper');
          agent = new EnemyAgent(`patrol_iron_${Date.now()}_${i}`, 'Iron Legionnaire', 'iron', type, 45, offsetPos, waypoints);
        } else if (currentFaction === 'brood') {
          const type = i === 0 ? 'scuttler' : (i === 1 ? 'razorleaper' : 'hive_warrior');
          agent = new EnemyAgent(`patrol_brood_${Date.now()}_${i}`, 'Brood Organism', 'brood', type, 35, offsetPos, waypoints);
        } else {
          const type = i === 0 ? 'oracle_drone' : (i === 1 ? 'astral_sentinel' : 'converted');
          agent = new EnemyAgent(`patrol_astral_${Date.now()}_${i}`, 'Astral Sentinel', 'astral', type, 50, offsetPos, waypoints);
        }

        scene.add(agent.group);
        patrolSquad.push(agent);
      }

      onSpawnPatrol(patrolSquad);
    }
  }
}
