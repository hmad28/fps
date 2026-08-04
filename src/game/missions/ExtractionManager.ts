import * as THREE from 'three';

export class ExtractionManager {
  public isExtractionAvailable: boolean = false;
  public isExtractionCalled: boolean = false;
  public extractionTimer: number = 60.0; // 60s countdown
  public extractionZonePos: THREE.Vector3 = new THREE.Vector3(0, 0, 160); // Physical extraction LZ at south of map

  public shuttleMesh: THREE.Group | null = null;
  public isShuttleLanded: boolean = false;
  public isPlayerExtracted: boolean = false;

  public initExtractionLZ(scene: THREE.Scene) {
    // Physical Extraction Helipad LZ Ring
    const ringGeo = new THREE.RingGeometry(2.0, 8.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({ color: 0x10b981, side: THREE.DoubleSide, transparent: true, opacity: 0.5 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.extractionZonePos);
    ring.position.y = 0.05;
    scene.add(ring);

    // Green beacon light
    const light = new THREE.PointLight(0x10b981, 4, 30);
    light.position.set(this.extractionZonePos.x, 2, this.extractionZonePos.z);
    scene.add(light);
  }

  public callExtraction() {
    if (this.isExtractionCalled || !this.isExtractionAvailable) return;
    this.isExtractionCalled = true;
    this.extractionTimer = 60.0;
  }

  public update(dt: number, playerPos: THREE.Vector3, scene: THREE.Scene, onOperationSuccess: () => void) {
    if (!this.isExtractionCalled) return;

    if (this.extractionTimer > 0) {
      this.extractionTimer = Math.max(0, this.extractionTimer - dt);

      if (this.extractionTimer <= 0 && !this.shuttleMesh) {
        // Physical Extraction Shuttle Flyby Landing
        this.spawnShuttle(scene);
      }
    }

    if (this.shuttleMesh && !this.isPlayerExtracted) {
      if (this.shuttleMesh.position.y > 0.5) {
        // Land shuttle on ground
        this.shuttleMesh.position.y = Math.max(0.5, this.shuttleMesh.position.y - 12.0 * dt);
      } else {
        this.isShuttleLanded = true;
      }

      // Check player entering shuttle door
      if (this.isShuttleLanded && playerPos.distanceTo(this.extractionZonePos) < 4.5) {
        this.isPlayerExtracted = true;
        onOperationSuccess();
      }
    }
  }

  private spawnShuttle(scene: THREE.Scene) {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(6.0, 3.0, 12.0);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // Cockpit glass
    const glassGeo = new THREE.BoxGeometry(4.0, 1.5, 3.0);
    const glassMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.8 });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.set(0, 1.0, -4.5);
    group.add(glass);

    // Green thruster lights
    const light = new THREE.PointLight(0x10b981, 8, 25);
    light.position.set(0, -1, 5);
    group.add(light);

    group.position.set(this.extractionZonePos.x, 50, this.extractionZonePos.z);
    scene.add(group);
    this.shuttleMesh = group;
  }
}
