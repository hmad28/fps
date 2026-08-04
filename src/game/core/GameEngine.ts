import * as THREE from 'three';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerInventory } from '../player/PlayerInventory';
import { PlayerController } from '../player/PlayerController';
import { WorldGenerator, OperationWorld, BiomeType } from '../world/WorldGenerator';
import { EnemyManager } from '../ai/EnemyManager';
import { CommandSupportSystem, ActiveBeacon } from '../support/CommandSupportSystem';
import { ObjectiveManager } from '../missions/ObjectiveManager';
import { ExtractionManager } from '../missions/ExtractionManager';
import { ProjectileSystem, PhysicalProjectile } from '../weapons/ProjectileSystem';
import { AssetLoader } from '../assets/AssetLoader';
import { AudioManager } from '../audio/AudioManager';
import { EventBus } from './EventBus';
import { GameClock } from './GameClock';

export interface EngineCallbacks {
  onStatsUpdate: (stats: any) => void;
  onHitMarker: (hit: any) => void;
  onKill: (name: string, isHeadshot: boolean) => void;
  onGameOver: () => void;
  onOperationSuccess: () => void;
}

export class GameEngine {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;

  public health: PlayerHealth;
  public inventory: PlayerInventory;
  public player: PlayerController;

  public world!: OperationWorld;
  public enemyManager: EnemyManager;
  public supportSystem: CommandSupportSystem;
  public objectiveManager: ObjectiveManager;
  public extractionManager: ExtractionManager;
  public projectileSystem: ProjectileSystem;

  private clock: GameClock = new GameClock();
  private audioManager = AudioManager.getInstance();
  private eventBus = EventBus.getInstance();
  private callbacks: EngineCallbacks;

  private weaponGroup: THREE.Group = new THREE.Group();
  private currentGunMesh: THREE.Group | null = null;
  private animFrameId: number | null = null;
  private isRunning: boolean = false;

  constructor(container: HTMLElement, callbacks: EngineCallbacks, biome: BiomeType = 'forge_city') {
    this.container = container;
    this.callbacks = callbacks;

    this.health = new PlayerHealth();
    this.inventory = new PlayerInventory();
    this.player = new PlayerController(this.health, this.inventory);

    this.enemyManager = new EnemyManager();
    this.supportSystem = new CommandSupportSystem();
    this.objectiveManager = new ObjectiveManager();
    this.extractionManager = new ExtractionManager();
    this.projectileSystem = new ProjectileSystem();

    this.initThree(biome);
  }

  private initThree(biome: BiomeType) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      600
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Build World Architecture & 3D Assets
    const worldGen = new WorldGenerator();
    this.world = worldGen.generateWorld(this.scene, biome);

    this.scene.add(this.camera);
    this.camera.add(this.weaponGroup);
    this.weaponGroup.position.set(0.25, -0.2, -0.4);

    // Build Objectives & Extraction LZ
    this.objectiveManager.initObjectives(this.scene, this.world.obstacles);
    this.extractionManager.initExtractionLZ(this.scene);

    // Preload 3D Models
    AssetLoader.getInstance().preloadAssets();

    this.updateWeaponViewmodel();
    window.addEventListener('resize', this.onWindowResize);
  }

  public start() {
    this.isRunning = true;
    this.clock.start();
    this.tick();
  }

  public stop() {
    this.isRunning = false;
    this.clock.stop();
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
  }

  private tick = () => {
    if (!this.isRunning) return;

    const dt = this.clock.getDelta();

    this.health.update(dt);
    this.player.update(dt, this.world.obstacles);

    this.camera.position.copy(this.player.position);
    this.camera.rotation.set(0, 0, 0);
    this.camera.rotation.y = this.player.yaw;
    this.camera.rotation.x = this.player.pitch;

    // AI & Enemy Manager
    this.enemyManager.update(dt, this.player.position, this.scene);

    // Support System (Beacons & Stratagems)
    this.supportSystem.update(dt, this.scene, (beacon) => this.handleSupportImpact(beacon));

    // Extraction & Objectives
    this.extractionManager.update(dt, this.player.position, this.scene, () => {
      this.callbacks.onOperationSuccess();
    });

    // Projectiles
    this.projectileSystem.update(dt, this.scene, (proj) => this.handleProjectileExplosion(proj));

    // Auto-fire continuous
    if (this.player.isShooting && this.inventory.getActiveWeapon().category === 'assault_rifle') {
      this.fireWeapon();
    }

    this.renderer.render(this.scene, this.camera);
    this.notifyStats();

    this.animFrameId = requestAnimationFrame(this.tick);
  };

  public fireWeapon() {
    if (!this.inventory.consumeActiveBullet()) return;

    const weapon = this.inventory.getActiveWeapon();
    this.audioManager.playGunshot();

    // Raycast hit detection
    const raycaster = new THREE.Raycaster();
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    raycaster.set(this.camera.position, camDir);

    const enemyMeshes: THREE.Object3D[] = [];
    this.enemyManager.activeEnemies.forEach((e) => enemyMeshes.push(e.group));

    const intersects = raycaster.intersectObjects([...enemyMeshes, ...this.world.obstacleMeshes], true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const isHeadshot = hit.object.name === 'head';
      const damage = Math.round(weapon.damage * (isHeadshot ? 2.2 : 1.0));

      this.audioManager.playHitmarker(isHeadshot);
      this.callbacks.onHitMarker({ isHeadshot, damage });

      // Find hit enemy agent
      let targetEnemy = this.enemyManager.activeEnemies.find((e) => {
        let match = false;
        e.group.traverse((c) => {
          if (c === hit.object) match = true;
        });
        return match;
      });

      if (targetEnemy) {
        const killed = targetEnemy.takeDamage(damage);
        if (killed) {
          this.callbacks.onKill(targetEnemy.name, isHeadshot);
        }
      }
    }
  }

  public reloadWeapon() {
    if (this.inventory.reloadActiveWeapon()) {
      this.notifyStats();
    }
  }

  public interact() {
    // Check objective interaction
    this.objectiveManager.objectives.forEach((obj) => {
      if (this.player.position.distanceTo(obj.position) < 5.0) {
        if (this.objectiveManager.completeObjective(obj.id)) {
          if (this.objectiveManager.isPrimaryComplete()) {
            this.extractionManager.isExtractionAvailable = true;
          }
        }
      }
    });

    // Check extraction terminal interaction
    if (this.extractionManager.isExtractionAvailable && !this.extractionManager.isExtractionCalled) {
      if (this.player.position.distanceTo(this.extractionManager.extractionZonePos) < 6.0) {
        this.extractionManager.callExtraction();
      }
    }
  }

  public triggerCommandSupportInput(dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT') {
    const matchedId = this.supportSystem.inputDirection(dir);
    if (matchedId) {
      // Sequence matched! Throw beacon forward!
      const camDir = new THREE.Vector3();
      this.camera.getWorldDirection(camDir);
      this.supportSystem.throwBeacon(matchedId, this.player.position, camDir, this.scene);
    }
  }

  private handleSupportImpact(beacon: ActiveBeacon) {
    this.audioManager.playExplosion();

    if (beacon.supportId === 'kinetic_lance') {
      // High-damage precision orbital beam strike
      const beamGeo = new THREE.CylinderGeometry(0.8, 0.8, 80, 16);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(beacon.position);
      beam.position.y = 40;
      this.scene.add(beam);

      setTimeout(() => this.scene.remove(beam), 600);

      // Damage enemies in 12m radius
      this.enemyManager.activeEnemies.forEach((e) => {
        if (e.position.distanceTo(beacon.position) < 12.0) {
          e.takeDamage(450);
        }
      });
    } else if (beacon.supportId === 'supply_capsule') {
      // Resupply capsule landing
      const podGeo = new THREE.BoxGeometry(2.0, 2.5, 2.0);
      const podMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.8 });
      const pod = new THREE.Mesh(podGeo, podMat);
      pod.position.copy(beacon.position);
      pod.position.y = 1.25;
      this.scene.add(pod);

      // Refill player ammo & med injectors
      this.inventory.initInventory();
      this.health.medInjectors = this.health.maxInjectors;
    }
  }

  private handleProjectileExplosion(proj: PhysicalProjectile) {
    this.audioManager.playExplosion();
    this.enemyManager.activeEnemies.forEach((e) => {
      if (e.position.distanceTo(proj.mesh.position) < proj.radius) {
        e.takeDamage(proj.damage);
      }
    });
  }

  private updateWeaponViewmodel() {
    if (this.currentGunMesh) {
      this.weaponGroup.remove(this.currentGunMesh);
    }

    const gunGroup = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.8, roughness: 0.2 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), mat);
    gunGroup.add(body);

    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.6, 12), mat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.02, -0.35);
    gunGroup.add(barrel);

    gunGroup.traverse((c: any) => {
      if (c.isMesh) c.frustumCulled = false;
    });

    this.currentGunMesh = gunGroup;
    this.weaponGroup.add(this.currentGunMesh);
  }

  public getRadarData() {
    return {
      playerPos: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z },
      playerYaw: this.player.yaw,
      objective: this.objectiveManager.objectives[0] ? { x: this.objectiveManager.objectives[0].position.x, z: this.objectiveManager.objectives[0].position.z } : null,
      extraction: this.extractionManager.isExtractionAvailable ? { x: this.extractionManager.extractionZonePos.x, z: this.extractionManager.extractionZonePos.z } : null,
      enemies: this.enemyManager.activeEnemies.map((e) => ({
        id: e.id,
        x: e.position.x,
        z: e.position.z,
        type: e.archetype,
        state: e.state,
        health: e.health,
        maxHealth: e.maxHealth,
      })),
      pois: this.world ? this.world.poiManager.pois.map((p) => ({ x: p.position.x, z: p.position.z, looted: p.looted })) : [],
    };
  }

  private notifyStats() {
    const activeMag = this.inventory.getActiveMagState();
    const weapon = this.inventory.getActiveWeapon();

    this.callbacks.onStatsUpdate({
      health: this.health.health,
      maxHealth: this.health.maxHealth,
      shield: this.health.shield,
      maxShield: this.health.maxShield,
      stamina: this.player.stamina,
      medInjectors: this.health.medInjectors,
      currentClip: activeMag ? activeMag.currentClip : 0,
      reserveMags: activeMag ? activeMag.reserveMags : 0,
      weaponName: weapon.name,
      weaponCategory: weapon.category,
      grenadesCount: this.inventory.grenadesCount,
      supportSequence: this.supportSystem.currentSequenceInput,
      isSupportOpen: this.supportSystem.isInterfaceOpen,
      objectiveText: this.objectiveManager.objectives[0] ? this.objectiveManager.objectives[0].title : 'SURVEY BATTLEFIELD',
      extractionAvailable: this.extractionManager.isExtractionAvailable,
      extractionTimer: this.extractionManager.extractionTimer,
      injuries: this.health.injuries,
      stance: this.player.stance,
    });
  }

  private onWindowResize = () => {
    if (!this.container) return;
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  };
}
