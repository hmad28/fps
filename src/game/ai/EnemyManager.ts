import * as THREE from 'three';
import { EnemyAgent } from './EnemyAgent';
import { PatrolDirector } from './PatrolDirector';
import { ReinforcementDirector } from './ReinforcementDirector';
import { FactionType } from './AIStateMachine';

export class EnemyManager {
  public activeEnemies: EnemyAgent[] = [];
  private patrolDirector: PatrolDirector = new PatrolDirector();
  private reinforcementDirector: ReinforcementDirector = new ReinforcementDirector();
  public currentFaction: FactionType = 'iron';

  public update(dt: number, playerPos: THREE.Vector3, scene: THREE.Scene) {
    // 1. Update active enemies
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];

      if (enemy.state === 'DEAD') {
        scene.remove(enemy.group);
        this.activeEnemies.splice(i, 1);
        continue;
      }

      enemy.update(dt, playerPos, this.activeEnemies, (caller) => {
        // Trigger interruptible reinforcement arrival!
        this.reinforcementDirector.triggerReinforcement(caller, scene, (newEnemies) => {
          newEnemies.forEach((e) => {
            scene.add(e.group);
            this.activeEnemies.push(e);
          });
        });
      });
    }

    // 2. Roaming Patrol Director
    this.patrolDirector.update(dt, playerPos, this.activeEnemies, this.currentFaction, scene, (newPatrol) => {
      this.activeEnemies.push(...newPatrol);
    });
  }

  public addEnemy(enemy: EnemyAgent, scene: THREE.Scene) {
    scene.add(enemy.group);
    this.activeEnemies.push(enemy);
  }

  public clearAll(scene: THREE.Scene) {
    this.activeEnemies.forEach((e) => scene.remove(e.group));
    this.activeEnemies = [];
  }
}
