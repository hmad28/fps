import * as THREE from 'three';
import { EnemyAgent } from './EnemyAgent';

export class PatrolDirector {
  private spawnTimer = 9;
  private readonly spawnInterval = 28;
  private patrolIndex = 0;

  public createPatrol(origin: THREE.Vector3, destination: THREE.Vector3, difficulty = 3): EnemyAgent[] {
    const perpendicular = destination.clone().sub(origin).normalize();
    const waypoints = [origin.clone(), origin.clone().lerp(destination, 0.5), destination.clone()];
    const types = difficulty >= 5
      ? ['legion_rifleman', 'legion_rifleman', 'rocket_legionary', 'bulwark_gunner'] as const
      : ['legion_rifleman', 'legion_rifleman', 'rocket_legionary'] as const;
    return types.map((type, index) => new EnemyAgent(
      `patrol_${this.patrolIndex}_${index}_${Date.now()}`,
      type === 'legion_rifleman' ? 'Legion Rifleman' : type === 'rocket_legionary' ? 'Rocket Legionary' : 'Bulwark Gunner',
      'iron', type, type === 'bulwark_gunner' ? 140 : type === 'rocket_legionary' ? 68 : 54,
      origin.clone().add(new THREE.Vector3(perpendicular.z * index * 2, 0, -perpendicular.x * index * 2)),
      waypoints,
    ));
  }

  public update(dt: number, playerPos: THREE.Vector3, activeCount: number, onSpawn: (patrol: EnemyAgent[]) => void) {
    this.spawnTimer += dt;
    if (this.spawnTimer < this.spawnInterval || activeCount >= 28) return;
    this.spawnTimer = 0;
    this.patrolIndex++;
    const angle = Math.random() * Math.PI * 2;
    const origin = playerPos.clone().add(new THREE.Vector3(Math.cos(angle) * 75, -playerPos.y, Math.sin(angle) * 75));
    const destination = origin.clone().add(new THREE.Vector3(Math.cos(angle + 1.8) * 95, 0, Math.sin(angle + 1.8) * 95));
    onSpawn(this.createPatrol(origin, destination));
  }
}
