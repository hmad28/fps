import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';

export interface OutpostStructure {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  destroyed: boolean;
  spawnCooldown: number;
}

export class OutpostBuilder {
  public outposts: OutpostStructure[] = [];

  public buildOutposts(scene: THREE.Scene, obstacles: THREE.Box3[]) {
    const loader = AssetLoader.getInstance();
    const locations = [[-118, -70], [108, -116], [-102, 102]];
    locations.forEach(([x, z], index) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      group.userData.kind = 'outpost';
      group.userData.outpostId = `outpost_${index}`;
      const core = loader.getModel('terminal');
      if (core) {
        core.name = 'production_core';
        core.scale.setScalar(3.2);
        core.position.y = 0.1;
        core.traverse((child) => {
          child.userData.kind = 'outpost';
          child.userData.outpostId = `outpost_${index}`;
        });
        group.add(core);
      }
      for (let i = 0; i < 4; i++) {
        const wall = loader.getModel('wall');
        if (!wall) continue;
        wall.scale.setScalar(2.8);
        wall.position.set(Math.cos(i * Math.PI / 2) * 7, 0, Math.sin(i * Math.PI / 2) * 7);
        wall.rotation.y = -i * Math.PI / 2;
        group.add(wall);
      }
      const warning = new THREE.PointLight(0xc44f38, 5, 24);
      warning.name = 'outpost_light';
      warning.position.set(0, 5, 0);
      group.add(warning);
      scene.add(group);
      obstacles.push(new THREE.Box3().setFromCenterAndSize(new THREE.Vector3(x, 2, z), new THREE.Vector3(4, 4, 4)));
      this.outposts.push({ id: `outpost_${index}`, position: group.position.clone(), mesh: group, health: 240, maxHealth: 240, destroyed: false, spawnCooldown: 24 + index * 7 });
    });
  }

  public damageOutpost(id: string, amount: number): boolean {
    const structure = this.outposts.find((outpost) => outpost.id === id);
    if (!structure || structure.destroyed) return false;
    structure.health = Math.max(0, structure.health - amount);
    if (structure.health > 0) return false;
    structure.destroyed = true;
    structure.mesh.rotation.z = 0.22;
    structure.mesh.traverse((child) => {
      if (child instanceof THREE.PointLight) child.color.setHex(0x33251e);
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        child.material = child.material.clone();
        child.material.color.multiplyScalar(0.28);
        child.material.emissive.setHex(0x180500);
      }
    });
    return true;
  }
}
