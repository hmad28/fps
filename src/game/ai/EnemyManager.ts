import * as THREE from 'three';
import { EnemyAgent, EnemyUpdateContext } from './EnemyAgent';
import { PatrolDirector } from './PatrolDirector';
import { ReinforcementDirector } from './ReinforcementDirector';

export interface EnemyManagerCallbacks {
  onDamagePlayer: EnemyUpdateContext['onDamagePlayer'];
  onEnemyShot: EnemyUpdateContext['onEnemyShot'];
  onExplosion: (position: THREE.Vector3, radius: number, damage: number) => void;
}

export class EnemyManager {
  public activeEnemies: EnemyAgent[] = [];
  private patrolDirector = new PatrolDirector();
  private reinforcementDirector = new ReinforcementDirector();
  private callbacks: EnemyManagerCallbacks | null = null;
  private aiAccumulator = 0;

  public initializeMission(scene: THREE.Scene) {
    const firstPatrol = this.patrolDirector.createPatrol(new THREE.Vector3(-52, 0, 22), new THREE.Vector3(76, 0, -46));
    firstPatrol.forEach((enemy) => this.addEnemy(enemy, scene));
    const guards: Array<[number, number, 'legion_rifleman' | 'rocket_legionary' | 'bulwark_gunner' | 'red_reaper']> = [
      [103, -108, 'legion_rifleman'], [114, -119, 'rocket_legionary'], [101, -125, 'red_reaper'],
      [-112, -64, 'legion_rifleman'], [-126, -72, 'bulwark_gunner'], [-96, 98, 'legion_rifleman'],
    ];
    guards.forEach(([x, z, type], index) => this.addEnemy(new EnemyAgent(`guard_${index}`, type.replaceAll('_', ' '), 'iron', type, type === 'bulwark_gunner' ? 140 : type === 'red_reaper' ? 72 : 58, new THREE.Vector3(x, 0, z), [new THREE.Vector3(x, 0, z), new THREE.Vector3(x + 8, 0, z + 6)]), scene));
  }

  public setCallbacks(callbacks: EnemyManagerCallbacks) { this.callbacks = callbacks; }

  public update(dt: number, playerPos: THREE.Vector3, playerVelocity: THREE.Vector3, scene: THREE.Scene, obstacles: THREE.Box3[], obstacleMeshes: THREE.Object3D[]) {
    if (!this.callbacks) return;
    this.aiAccumulator += dt;
    const nearEnemy = this.activeEnemies.some((enemy) => enemy.position.distanceToSquared(playerPos) < 55 * 55);
    const interval = nearEnemy ? 1 / 24 : 1 / 8;
    if (this.aiAccumulator < interval) {
      this.reinforcementDirector.update(dt, scene, (enemies) => enemies.forEach((enemy) => this.addEnemy(enemy, scene)), (position) => this.callbacks?.onExplosion(position, 12, 120));
      return;
    }
    const aiDt = Math.min(0.12, this.aiAccumulator);
    this.aiAccumulator = 0;
    for (const enemy of this.activeEnemies) {
      enemy.update(aiDt, {
        playerPos,
        playerVelocity,
        obstacles,
        obstacleMeshes,
        otherAgents: this.activeEnemies,
        onTriggerReinforcement: (caller) => this.reinforcementDirector.triggerReinforcement(caller, scene),
        onDamagePlayer: this.callbacks.onDamagePlayer,
        onEnemyShot: this.callbacks.onEnemyShot,
      });
    }
    this.activeEnemies = this.activeEnemies.filter((enemy) => {
      if (enemy.state !== 'DEAD' || enemy.corpseTimer < 28 || enemy.position.distanceTo(playerPos) < 38) return true;
      scene.remove(enemy.group);
      return false;
    });
    this.patrolDirector.update(aiDt, playerPos, this.activeEnemies.filter((enemy) => enemy.state !== 'DEAD').length, (patrol) => patrol.forEach((enemy) => this.addEnemy(enemy, scene)));
    this.reinforcementDirector.update(aiDt, scene, (enemies) => enemies.forEach((enemy) => this.addEnemy(enemy, scene)), (position) => this.callbacks?.onExplosion(position, 12, 120));
  }

  public hearSound(position: THREE.Vector3, radius: number) { this.activeEnemies.forEach((enemy) => enemy.hear(position, radius)); }
  public convergeOn(position: THREE.Vector3) { this.activeEnemies.forEach((enemy) => enemy.forceConverge(position)); }
  public suppressNear(position: THREE.Vector3, radius = 3) { this.activeEnemies.forEach((enemy) => { if (enemy.position.distanceTo(position) < radius) enemy.applySuppression(0.25); }); }
  public damageDropship(id: string, damage: number) { return this.reinforcementDirector.damageDropship(id, damage); }
  public addEnemy(enemy: EnemyAgent, scene: THREE.Scene) { scene.add(enemy.group); this.activeEnemies.push(enemy); }
  public clearAll(scene: THREE.Scene) { this.activeEnemies.forEach((enemy) => scene.remove(enemy.group)); this.activeEnemies = []; }
}
