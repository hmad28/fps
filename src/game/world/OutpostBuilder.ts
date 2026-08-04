import * as THREE from 'three';

export interface OutpostStructure {
  id: string;
  position: THREE.Vector3;
  mesh: THREE.Group;
  health: number;
  maxHealth: number;
  destroyed: boolean;
}

export class OutpostBuilder {
  public outposts: OutpostStructure[] = [];

  public buildOutposts(scene: THREE.Scene, obstacles: THREE.Box3[]) {
    const locations = [
      { x: -140, z: -80 },
      { x: 130, z: -120 },
      { x: -110, z: 110 },
    ];

    locations.forEach((loc, idx) => {
      const group = new THREE.Group();
      group.position.set(loc.x, 0, loc.z);

      // Main Production Silo / Fabricator Structure
      const siloGeo = new THREE.CylinderGeometry(3.0, 3.5, 7.0, 12);
      const siloMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.2 });
      const silo = new THREE.Mesh(siloGeo, siloMat);
      silo.position.y = 3.5;
      group.add(silo);

      // Glowing Vent Core
      const ventGeo = new THREE.SphereGeometry(1.2, 12, 12);
      const ventMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const vent = new THREE.Mesh(ventGeo, ventMat);
      vent.position.y = 7.2;
      group.add(vent);

      scene.add(group);
      const bbox = new THREE.Box3().setFromObject(group);
      obstacles.push(bbox);

      this.outposts.push({
        id: `outpost_${idx}`,
        position: group.position.clone(),
        mesh: group,
        health: 200,
        maxHealth: 200,
        destroyed: false,
      });
    });
  }

  public damageOutpost(id: string, amount: number, scene: THREE.Scene): boolean {
    const structure = this.outposts.find((o) => o.id === id);
    if (!structure || structure.destroyed) return false;

    structure.health -= amount;
    if (structure.health <= 0) {
      structure.health = 0;
      structure.destroyed = true;

      // Visual destruction & smoke
      const darkMat = new THREE.MeshStandardMaterial({ color: 0x090d16, roughness: 0.9 });
      structure.mesh.traverse((c: any) => {
        if (c.isMesh) c.material = darkMat;
      });

      return true; // Destroyed
    }
    return false;
  }
}
