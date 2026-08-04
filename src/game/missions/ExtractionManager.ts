import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

export class ExtractionManager {
  public isExtractionAvailable = false;
  public isExtractionCalled = false;
  public isTerminalActive = false;
  public extractionTimer = 72;
  public extractionZonePos = new THREE.Vector3(0, 0, 154);
  public shuttleMesh: THREE.Group | null = null;
  public isShuttleLanded = false;
  public isPlayerExtracted = false;
  public input: Direction[] = [];
  public readonly code: Direction[] = ['DOWN', 'RIGHT', 'UP'];
  private phase: 'INBOUND' | 'LANDING' | 'LANDED' | 'DEPARTING' = 'INBOUND';
  private departureTimer = 0;

  public initExtractionLZ(scene: THREE.Scene) {
    const loader = AssetLoader.getInstance();
    const terminal = loader.getModel('terminal');
    if (terminal) {
      terminal.scale.setScalar(2.8);
      terminal.position.copy(this.extractionZonePos).add(new THREE.Vector3(7, 0, 0));
      scene.add(terminal);
    }
    for (let i = 0; i < 8; i++) {
      const light = new THREE.PointLight(0xb47a3d, 1.8, 12);
      const angle = (i / 8) * Math.PI * 2;
      light.position.copy(this.extractionZonePos).add(new THREE.Vector3(Math.cos(angle) * 9, 0.3, Math.sin(angle) * 9));
      scene.add(light);
    }
  }

  public beginTerminal(playerPos: THREE.Vector3) {
    if (!this.isExtractionAvailable || this.isExtractionCalled || playerPos.distanceTo(this.extractionZonePos) > 10) return false;
    this.isTerminalActive = true;
    this.input = [];
    return true;
  }

  public inputDirection(direction: Direction) {
    if (!this.isTerminalActive) return false;
    this.input.push(direction);
    const expected = this.code[this.input.length - 1];
    if (expected !== direction) { this.input = []; return false; }
    if (this.input.length === this.code.length) {
      this.isTerminalActive = false;
      this.isExtractionCalled = true;
      this.extractionTimer = 72;
      return true;
    }
    return false;
  }

  public board(playerPos: THREE.Vector3) {
    if (!this.isShuttleLanded || playerPos.distanceTo(this.extractionZonePos) > 5) return false;
    this.isPlayerExtracted = true;
    this.phase = 'DEPARTING';
    return true;
  }

  public update(dt: number, scene: THREE.Scene, onOperationSuccess: () => void) {
    if (!this.isExtractionCalled) return;
    if (this.extractionTimer > 0) {
      this.extractionTimer = Math.max(0, this.extractionTimer - dt);
      if (this.extractionTimer === 0 && !this.shuttleMesh) this.spawnShuttle(scene);
      return;
    }
    if (!this.shuttleMesh) return;
    if (this.phase === 'INBOUND') {
      const approach = this.extractionZonePos.clone().add(new THREE.Vector3(0, 12, -22));
      this.shuttleMesh.position.lerp(approach, Math.min(1, dt * 0.5));
      this.shuttleMesh.lookAt(this.extractionZonePos.clone().add(new THREE.Vector3(0, 2, 30)));
      if (this.shuttleMesh.position.distanceTo(approach) < 2) this.phase = 'LANDING';
    } else if (this.phase === 'LANDING') {
      this.shuttleMesh.position.y = Math.max(1.4, this.shuttleMesh.position.y - 6 * dt);
      this.shuttleMesh.position.z += dt * 3.4;
      if (this.shuttleMesh.position.y <= 1.4) { this.phase = 'LANDED'; this.isShuttleLanded = true; }
    } else if (this.phase === 'DEPARTING') {
      this.departureTimer += dt;
      this.shuttleMesh.position.y += dt * (4 + this.departureTimer * 2.5);
      this.shuttleMesh.position.z -= dt * 8;
      if (this.departureTimer > 4.2) onOperationSuccess();
    }
  }

  private spawnShuttle(scene: THREE.Scene) {
    const loader = AssetLoader.getInstance();
    const group = new THREE.Group();
    const hull = loader.getModel('container_wide');
    if (hull) { hull.scale.set(7.8, 2.7, 11); hull.rotation.y = Math.PI / 2; group.add(hull); }
    [-1, 1].forEach((side) => {
      const wing = loader.getModel('rail');
      if (wing) { wing.scale.set(4.5, 1.2, 7); wing.position.x = side * 4.5; group.add(wing); }
      const glow = new THREE.PointLight(0xe0a35a, 9, 30);
      glow.position.set(side * 3.5, -1, 3.5);
      group.add(glow);
    });
    group.position.copy(this.extractionZonePos).add(new THREE.Vector3(90, 42, -95));
    scene.add(group);
    this.shuttleMesh = group;
  }
}
