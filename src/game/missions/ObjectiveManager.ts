import * as THREE from 'three';

export interface MissionObjective {
  id: string;
  title: string;
  description: string;
  type: 'PRIMARY' | 'SECONDARY';
  completed: boolean;
  position: THREE.Vector3;
  mesh: THREE.Group;
}

export class ObjectiveManager {
  public objectives: MissionObjective[] = [];

  public initObjectives(scene: THREE.Scene, obstacles: THREE.Box3[]) {
    // 1. Primary Objective: Sabotage Enemy Command Uplink Terminal
    const primaryGroup = new THREE.Group();
    primaryGroup.position.set(0, 0, -120);

    const termGeo = new THREE.BoxGeometry(2.5, 3.5, 2.5);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.9, roughness: 0.1 });
    const term = new THREE.Mesh(termGeo, termMat);
    term.position.y = 1.75;
    primaryGroup.add(term);

    const screenGeo = new THREE.PlaneGeometry(1.8, 1.0);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0xef4444, side: THREE.DoubleSide });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 2.2, 1.26);
    primaryGroup.add(screen);

    scene.add(primaryGroup);
    obstacles.push(new THREE.Box3().setFromObject(primaryGroup));

    this.objectives.push({
      id: 'primary_uplink',
      title: 'SABOTAGE ENEMY COMMAND UPLINK',
      description: 'Infiltrate Central Outpost and disable the main communications satellite uplink.',
      type: 'PRIMARY',
      completed: false,
      position: primaryGroup.position.clone(),
      mesh: primaryGroup,
    });

    // 2. Secondary Objective: Recover Carrier Flight Data Recorder
    const secGroup = new THREE.Group();
    secGroup.position.set(-110, 0, 40);

    const crateGeo = new THREE.BoxGeometry(2.0, 1.5, 2.0);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.8 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.y = 0.75;
    secGroup.add(crate);

    scene.add(secGroup);
    obstacles.push(new THREE.Box3().setFromObject(secGroup));

    this.objectives.push({
      id: 'secondary_blackbox',
      title: 'RECOVER AEGIS FLIGHT DATA RECORDER',
      description: 'Retrieve downed dropship black box at West Crash Site.',
      type: 'SECONDARY',
      completed: false,
      position: secGroup.position.clone(),
      mesh: secGroup,
    });
  }

  public completeObjective(id: string): boolean {
    const obj = this.objectives.find((o) => o.id === id);
    if (!obj || obj.completed) return false;

    obj.completed = true;

    // Green screen indicator
    obj.mesh.traverse((c: any) => {
      if (c.isMesh && c.material) {
        c.material = new THREE.MeshBasicMaterial({ color: 0x10b981 });
      }
    });

    return true;
  }

  public isPrimaryComplete(): boolean {
    return this.objectives.filter((o) => o.type === 'PRIMARY').every((o) => o.completed);
  }
}
