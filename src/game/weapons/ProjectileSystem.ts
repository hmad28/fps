import * as THREE from 'three';

export interface PhysicalProjectile {
  id: string;
  mesh: THREE.Mesh | THREE.Group;
  velocity: THREE.Vector3;
  damage: number;
  radius: number;
  age: number;
  maxAge: number;
  isFriendly: boolean;
}

export class ProjectileSystem {
  private projectiles: PhysicalProjectile[] = [];

  public spawnRocket(spawnPos: THREE.Vector3, direction: THREE.Vector3, damage: number, scene: THREE.Scene, flightTime = 2.5) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.6, 12);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.x = Math.PI / 2;
    group.add(body);

    const tipGeo = new THREE.ConeGeometry(0.06, 0.2, 12);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.rotation.x = -Math.PI / 2;
    tip.position.z = -0.35;
    group.add(tip);

    group.position.copy(spawnPos);
    group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, -1), direction.clone().normalize());
    scene.add(group);

    const velocity = direction.clone().multiplyScalar(45.0);

    this.projectiles.push({
      id: Math.random().toString(),
      mesh: group,
      velocity,
      damage,
      radius: 4.5,
      age: 0,
      maxAge: Math.max(0.12, flightTime),
      isFriendly: true,
    });
  }

  public update(dt: number, scene: THREE.Scene, onExplode: (proj: PhysicalProjectile) => void) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.age += dt;

      p.mesh.position.addScaledVector(p.velocity, dt);

      // Hit ground or hit max lifetime
      if (p.mesh.position.y <= 0.1 || p.age >= p.maxAge) {
        onExplode(p);
        scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }
}
