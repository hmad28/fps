import * as THREE from 'three';
import { EnemyAgent } from './EnemyAgent';
import { AssetLoader } from '../assets/AssetLoader';

interface DropshipEvent {
  id: string;
  group: THREE.Group;
  dropPosition: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: 'APPROACH' | 'HOVER' | 'DEPART' | 'CRASH';
  timer: number;
  health: number;
  spawned: boolean;
}

export class ReinforcementDirector {
  public activeDropships: DropshipEvent[] = [];

  public triggerReinforcement(caller: EnemyAgent, scene: THREE.Scene) {
    if (caller.faction !== 'iron') return;
    const loader = AssetLoader.getInstance();
    const group = new THREE.Group();
    const body = loader.getModel('container_wide');
    if (body) { body.scale.set(6.5, 2.1, 9); body.rotation.y = Math.PI / 2; group.add(body); }
    [-1, 1].forEach((side) => {
      const nacelle = loader.getModel('container_tall');
      if (!nacelle) return;
      nacelle.scale.set(2.4, 1.2, 5);
      nacelle.position.set(side * 4, 0, 0);
      group.add(nacelle);
      const thruster = new THREE.PointLight(0xe05a35, 9, 32);
      thruster.position.set(side * 4, -1.2, 2.6);
      group.add(thruster);
    });
    const doorLeft = loader.getModel('door');
    const doorRight = loader.getModel('door');
    if (doorLeft && doorRight) {
      doorLeft.name = 'door_left'; doorRight.name = 'door_right';
      doorLeft.scale.setScalar(1.8); doorRight.scale.setScalar(1.8);
      doorLeft.position.x = -1.4; doorRight.position.x = 1.4;
      group.add(doorLeft, doorRight);
    }
    const id = `dropship_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    group.name = id;
    group.traverse((child) => { child.userData.kind = 'dropship'; child.userData.dropshipId = id; });
    const dropPosition = caller.position.clone().add(new THREE.Vector3(8, 0, 6));
    group.position.copy(dropPosition).add(new THREE.Vector3(80, 34, 70));
    group.lookAt(dropPosition);
    scene.add(group);
    this.activeDropships.push({ id, group, dropPosition, velocity: new THREE.Vector3(), phase: 'APPROACH', timer: 0, health: 300, spawned: false });
  }

  public update(dt: number, scene: THREE.Scene, onSpawn: (enemies: EnemyAgent[]) => void, onCrash: (position: THREE.Vector3) => void) {
    for (let i = this.activeDropships.length - 1; i >= 0; i--) {
      const ship = this.activeDropships[i];
      ship.timer += dt;
      if (ship.phase === 'APPROACH') {
        const target = ship.dropPosition.clone().add(new THREE.Vector3(0, 16, 0));
        ship.group.position.lerp(target, Math.min(1, dt * 0.72));
        ship.group.lookAt(target.clone().add(new THREE.Vector3(0, 0, -20)));
        if (ship.group.position.distanceTo(target) < 2.5) { ship.phase = 'HOVER'; ship.timer = 0; }
      } else if (ship.phase === 'HOVER') {
        ship.group.position.y = ship.dropPosition.y + 16 + Math.sin(ship.timer * 2.4) * 0.22;
        const left = ship.group.getObjectByName('door_left');
        const right = ship.group.getObjectByName('door_right');
        if (left) left.position.x = THREE.MathUtils.lerp(left.position.x, -3.1, dt * 2);
        if (right) right.position.x = THREE.MathUtils.lerp(right.position.x, 3.1, dt * 2);
        if (ship.timer > 1.5 && !ship.spawned) {
          ship.spawned = true;
          onSpawn([
            new EnemyAgent(`${ship.id}_0`, 'Legion Rifleman', 'iron', 'legion_rifleman', 54, ship.dropPosition.clone().add(new THREE.Vector3(-2, 0, 0))),
            new EnemyAgent(`${ship.id}_1`, 'Rocket Legionary', 'iron', 'rocket_legionary', 68, ship.dropPosition.clone().add(new THREE.Vector3(2, 0, 0))),
            new EnemyAgent(`${ship.id}_2`, 'Red Reaper', 'iron', 'red_reaper', 72, ship.dropPosition.clone().add(new THREE.Vector3(0, 0, 3))),
          ]);
        }
        if (ship.timer > 4.2) { ship.phase = 'DEPART'; ship.timer = 0; }
      } else if (ship.phase === 'DEPART') {
        ship.group.position.add(new THREE.Vector3(-18 * dt, 11 * dt, -15 * dt));
        if (ship.timer > 6) { scene.remove(ship.group); this.activeDropships.splice(i, 1); }
      } else {
        ship.group.position.y -= 22 * dt;
        ship.group.rotation.z += dt * 1.8;
        if (ship.group.position.y <= 0.8) {
          onCrash(ship.group.position.clone());
          scene.remove(ship.group);
          this.activeDropships.splice(i, 1);
        }
      }
    }
  }

  public damageDropship(id: string, damage: number) {
    const ship = this.activeDropships.find((item) => item.id === id);
    if (!ship || ship.phase === 'CRASH') return false;
    ship.health -= damage;
    if (ship.health <= 0) { ship.phase = 'CRASH'; ship.timer = 0; return true; }
    return false;
  }
}
