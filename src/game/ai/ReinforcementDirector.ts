import * as THREE from 'three';
import { EnemyAgent } from './EnemyAgent';
import { FactionType } from './AIStateMachine';

export class ReinforcementDirector {
  public triggerReinforcement(
    caller: EnemyAgent,
    scene: THREE.Scene,
    onSpawnEnemies: (enemies: EnemyAgent[]) => void
  ) {
    const pos = caller.position.clone();

    if (caller.faction === 'iron') {
      // Machine Dropship Flyby Arrival
      const shipGeo = new THREE.BoxGeometry(4.0, 1.5, 8.0);
      const shipMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.2 });
      const ship = new THREE.Mesh(shipGeo, shipMat);
      ship.position.set(pos.x + 30, 22, pos.z + 30);
      scene.add(ship);

      // Light beam
      const beamGeo = new THREE.CylinderGeometry(2.0, 2.0, 22, 16);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xef4444, transparent: true, opacity: 0.35 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = -11;
      ship.add(beam);

      let timer = 0;
      const interval = setInterval(() => {
        timer += 0.05;
        // Fly towards drop zone
        ship.position.x = THREE.MathUtils.lerp(ship.position.x, pos.x, 0.08);
        ship.position.z = THREE.MathUtils.lerp(ship.position.z, pos.z, 0.08);

        if (timer >= 2.0) {
          clearInterval(interval);
          scene.remove(ship);

          // Drop 3 Machine Reinforcement Units
          const droppedEnemies: EnemyAgent[] = [
            new EnemyAgent(`iron_drop_1`, 'Legion Rifleman', 'iron', 'legion_rifleman', 40, new THREE.Vector3(pos.x + 2, 0, pos.z)),
            new EnemyAgent(`iron_drop_2`, 'Rocket Legionary', 'iron', 'rocket_legionary', 55, new THREE.Vector3(pos.x - 2, 0, pos.z)),
            new EnemyAgent(`iron_drop_3`, 'Red Reaper', 'iron', 'red_reaper', 65, new THREE.Vector3(pos.x, 0, pos.z + 2)),
          ];
          onSpawnEnemies(droppedEnemies);
        }
      }, 50);
    } else if (caller.faction === 'brood') {
      // Biological Underground Rupture
      const ringGeo = new THREE.RingGeometry(0.5, 3.5, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0x22c55e, side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.copy(pos);
      ring.position.y = 0.05;
      scene.add(ring);

      setTimeout(() => {
        scene.remove(ring);
        const broodEnemies: EnemyAgent[] = [
          new EnemyAgent(`brood_drop_1`, 'Scuttler', 'brood', 'scuttler', 25, new THREE.Vector3(pos.x + 1, 0, pos.z + 1)),
          new EnemyAgent(`brood_drop_2`, 'Razorleaper', 'brood', 'razorleaper', 45, new THREE.Vector3(pos.x - 1, 0, pos.z - 1)),
          new EnemyAgent(`brood_drop_3`, 'Hive Warrior', 'brood', 'hive_warrior', 70, new THREE.Vector3(pos.x, 0, pos.z + 2)),
        ];
        onSpawnEnemies(broodEnemies);
      }, 1800);
    } else {
      // Astral Phase Carrier Warp
      const portalGeo = new THREE.CylinderGeometry(2.5, 2.5, 15, 16);
      const portalMat = new THREE.MeshBasicMaterial({ color: 0xa855f7, transparent: true, opacity: 0.4, wireframe: true });
      const portal = new THREE.Mesh(portalGeo, portalMat);
      portal.position.set(pos.x, 7.5, pos.z);
      scene.add(portal);

      setTimeout(() => {
        scene.remove(portal);
        const astralEnemies: EnemyAgent[] = [
          new EnemyAgent(`astral_drop_1`, 'Converted', 'astral', 'converted', 30, new THREE.Vector3(pos.x + 1.5, 0, pos.z)),
          new EnemyAgent(`astral_drop_2`, 'Astral Sentinel', 'astral', 'astral_sentinel', 80, new THREE.Vector3(pos.x - 1.5, 0, pos.z)),
        ];
        onSpawnEnemies(astralEnemies);
      }, 1500);
    }
  }
}
