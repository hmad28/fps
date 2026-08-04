import * as THREE from 'three';
import { PlayerHealth } from './PlayerHealth';
import { PlayerInventory } from './PlayerInventory';

export type StanceState = 'STANDING' | 'CROUCHING' | 'PRONE' | 'DIVING' | 'VAULTING';

export class PlayerController {
  public position: THREE.Vector3 = new THREE.Vector3(0, 1.8, 30);
  public velocity: THREE.Vector3 = new THREE.Vector3();
  public yaw: number = 0;
  public pitch: number = 0;

  // Stance & Movement
  public stance: StanceState = 'STANDING';
  public isSprinting: boolean = false;
  public isADS: boolean = false;
  public isDiving: boolean = false;
  public diveTimer: number = 0;
  public diveDir: THREE.Vector3 = new THREE.Vector3();

  // Stamina Physics
  public stamina: number = 100;
  public maxStamina: number = 100;
  public isGrounded: boolean = true;

  // Input states
  public moveForward: number = 0;
  public moveRight: number = 0;
  public isShooting: boolean = false;

  public health: PlayerHealth;
  public inventory: PlayerInventory;

  constructor(health: PlayerHealth, inventory: PlayerInventory) {
    this.health = health;
    this.inventory = inventory;
  }

  public applyLook(deltaX: number, deltaY: number, sensitivity: number = 1.0) {
    const sens = sensitivity * 0.0022;
    this.yaw -= deltaX * sens;
    this.pitch -= deltaY * sens;

    const maxPitch = (Math.PI / 2) * 0.94;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  public setSprint(active: boolean) {
    if (active && this.stamina > 10 && !this.health.hasLegInjury() && this.stance === 'STANDING') {
      this.isSprinting = true;
      this.isADS = false;
    } else {
      this.isSprinting = false;
    }
  }

  public triggerCombatDive() {
    if (this.isDiving || !this.isGrounded) return;
    this.isDiving = true;
    this.diveTimer = 0.6;
    this.stance = 'DIVING';

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
    const dir = new THREE.Vector3()
      .addScaledVector(forward, this.moveForward)
      .addScaledVector(right, this.moveRight);

    if (dir.lengthSq() > 0) {
      dir.normalize();
      this.diveDir.copy(dir);
    } else {
      this.diveDir.copy(forward);
    }

    this.velocity.y = 3.5;
  }

  public update(dt: number, obstacles: THREE.Box3[]) {
    // 1. Stamina Management
    if (this.isSprinting && (this.moveForward !== 0 || this.moveRight !== 0)) {
      const drainRate = this.inventory.armorType === 'heavy' ? 25 : (this.inventory.armorType === 'light' ? 12 : 18);
      this.stamina = Math.max(0, this.stamina - drainRate * dt);
      if (this.stamina <= 0) {
        this.isSprinting = false;
      }
    } else {
      const regenRate = this.health.staminaBoostTimer > 0 ? 35 : (this.inventory.armorType === 'light' ? 22 : 15);
      this.stamina = Math.min(this.maxStamina, this.stamina + regenRate * dt);
    }

    // 2. Movement Speeds based on Stance & Armor
    let baseSpeed = 4.5;
    if (this.inventory.armorType === 'light') baseSpeed = 5.2;
    if (this.inventory.armorType === 'heavy') baseSpeed = 3.8;

    if (this.isSprinting) baseSpeed *= 1.6;
    if (this.stance === 'CROUCHING') baseSpeed *= 0.6;
    if (this.stance === 'PRONE') baseSpeed *= 0.3;
    if (this.health.hasLegInjury()) baseSpeed *= 0.65;

    // 3. Combat Dive physics
    if (this.isDiving) {
      this.diveTimer -= dt;
      const diveSpeed = 14.0 * (this.diveTimer / 0.6);
      this.velocity.x = this.diveDir.x * diveSpeed;
      this.velocity.z = this.diveDir.z * diveSpeed;

      if (this.diveTimer <= 0) {
        this.isDiving = false;
        this.stance = 'PRONE'; // Land in prone position after combat dive!
      }
    } else {
      // WASD Directional movement
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, this.moveForward)
        .addScaledVector(right, this.moveRight);

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
      }

      this.velocity.x = moveDir.x * baseSpeed;
      this.velocity.z = moveDir.z * baseSpeed;
    }

    // Gravity
    if (!this.isGrounded) {
      this.velocity.y -= 15.0 * dt;
    }

    // Apply movement
    const newPos = this.position.clone().addScaledVector(this.velocity, dt);

    // Ground floor collision check
    let targetY = 1.8;
    if (this.stance === 'CROUCHING') targetY = 1.0;
    if (this.stance === 'PRONE' || this.stance === 'DIVING') targetY = 0.5;

    if (newPos.y <= targetY) {
      newPos.y = targetY;
      this.velocity.y = 0;
      this.isGrounded = true;
    }

    // Obstacle collision check
    const playerBox = new THREE.Box3().setFromCenterAndSize(
      newPos,
      new THREE.Vector3(0.8, targetY, 0.8)
    );

    let hitObstacle = false;
    for (const obs of obstacles) {
      if (obs.intersectsBox(playerBox)) {
        hitObstacle = true;
        break;
      }
    }

    if (!hitObstacle) {
      this.position.copy(newPos);
    } else {
      // Sliding collision along X or Z
      const tryX = this.position.clone();
      tryX.x = newPos.x;
      if (!obstacles.some((o) => o.intersectsBox(new THREE.Box3().setFromCenterAndSize(tryX, new THREE.Vector3(0.8, targetY, 0.8))))) {
        this.position.x = newPos.x;
      }

      const tryZ = this.position.clone();
      tryZ.z = newPos.z;
      if (!obstacles.some((o) => o.intersectsBox(new THREE.Box3().setFromCenterAndSize(tryZ, new THREE.Vector3(0.8, targetY, 0.8))))) {
        this.position.z = newPos.z;
      }
    }
  }
}
