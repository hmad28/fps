import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  EnemyData,
  EnemyType,
  GameDifficulty,
  GameSettings,
  HitMarker,
  PickupData,
  PickupType,
  PlayerStats,
  Point3D,
  WeaponId,
} from '../types';
import { WEAPON_CONFIGS } from './WeaponConfigs';
import { soundEffects } from '../audio/SoundEffects';
import { buildFPSMap, MapData } from './MapBuilder';

export interface GameEngineCallbacks {
  onStatsUpdate: (stats: PlayerStats) => void;
  onHitMarker: (hit: HitMarker) => void;
  onDamageTaken: (angle: number) => void;
  onKill: (enemyName: string, isHeadshot: boolean) => void;
  onGameOver: () => void;
  onWaveComplete: (wave: number) => void;
}

interface Ragdoll {
  meshGroup: THREE.Group;
  velocity: THREE.Vector3;
  angularVelocity: THREE.Vector3;
  age: number;
  maxAge: number;
  groundY: number;
  torso?: THREE.Object3D;
  head?: THREE.Object3D;
  leftArm?: THREE.Object3D;
  rightArm?: THREE.Object3D;
  leftLeg?: THREE.Object3D;
  rightLeg?: THREE.Object3D;
  leftPad?: THREE.Object3D;
  rightPad?: THREE.Object3D;
  antenna?: THREE.Object3D;
  scope?: THREE.Object3D;
  gunMesh?: THREE.Object3D;
  gunVelocity?: THREE.Vector3;
  gunAngularVelocity?: THREE.Vector3;
  gunOnGround?: boolean;
}

export class FPSGameEngine {
  private container: HTMLElement;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private mapData!: MapData;

  // Player State & Physics
  private playerPos: THREE.Vector3 = new THREE.Vector3(0, 1.8, 35);
  private playerVel: THREE.Vector3 = new THREE.Vector3();
  private yaw: number = 0; // horizontal angle
  private pitch: number = 0; // vertical angle
  private isGrounded: boolean = true;
  private playerRadius: number = 0.6;
  private playerHeight: number = 1.8;

  // Dash State
  private dashCooldown: number = 0;
  private isDashing: boolean = false;
  private dashTimer: number = 0;
  private dashDir: THREE.Vector3 = new THREE.Vector3();

  // Crouch, Slide, Sprint, ADS state
  private isSprinting: boolean = false;
  private isCrouching: boolean = false;
  private isSliding: boolean = false;
  private slideTimer: number = 0;
  private slideDir: THREE.Vector3 = new THREE.Vector3();
  private isADS: boolean = false;

  // Grenade, EMP and Mission Stages
  private grenades: number = 3;
  private empCooldownSeconds: number = 0;
  private stage: number = 1;
  private objectiveProgress: number = 0;
  private objectiveText: string = 'RESTORE POWER AT CENTRAL GENERATOR (PRESS E AT CONSOLE)';
  private activeObjectiveCoords: THREE.Vector3 = new THREE.Vector3(0, 0, -10);
  private keycardAcquired: boolean = false;
  private keycardMesh: THREE.Mesh | null = null;
  private jammerMesh: THREE.Group | null = null;
  private jammerHealth: number = 150;
  private overrideActive: boolean = false;
  private overrideTimeLeft: number = 40;
  private bossSpawned: boolean = false;
  private bossHealthPercent: number = 100;
  private extractionActive: boolean = false;
  private extractionTimeLeft: number = 45;
  private extractionZoneMesh: THREE.Mesh | null = null;
  private centralConsoleMesh: THREE.Mesh | null = null;
  private lockdownConsoleMesh: THREE.Mesh | null = null;
  private overrideConsoleMesh: THREE.Mesh | null = null;

  // Active Upgrades
  private activeUpgrades: string[] = [];

  // Projectiles
  private rocketProjectiles: { mesh: THREE.Group; vel: THREE.Vector3; age: number }[] = [];
  private grenadeProjectiles: { mesh: THREE.Mesh; vel: THREE.Vector3; bounceCount: number; age: number }[] = [];

  // Recoil Offset (applied on top of pitch/yaw)
  private recoilOffsetPitch: number = 0;
  private recoilOffsetYaw: number = 0;

  // Weapon Viewmodels & Group
  private weaponGroup: THREE.Group = new THREE.Group();
  private currentGunMesh: THREE.Group | null = null;
  private muzzleFlashLight!: THREE.PointLight;
  private muzzleFlashMesh!: THREE.Mesh;
  private lastFireTime: number = 0;
  private reloadStartTime: number = 0;
  private weaponSwayTime: number = 0;

  // Player Stats
  public stats: PlayerStats = {
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    score: 0,
    kills: 0,
    headshots: 0,
    wave: 1,
    selectedWeaponId: 'pistol',
    ammo: {
      pistol: { clip: 12, reserve: 72 },
      rifle: { clip: 30, reserve: 180 },
      shotgun: { clip: 8, reserve: 32 },
      launcher: { clip: 3, reserve: 9 },
      sniper: { clip: 5, reserve: 15 },
    },
    isReloading: false,
    reloadProgress: 0,
    grenades: 3,
    empCooldown: 0,
    empCooldownSeconds: 0,
    stage: 1,
    objectiveProgress: 0,
    objectiveText: 'RESTORE POWER AT CENTRAL GENERATOR (PRESS E AT CONSOLE)',
    isSprinting: false,
    isCrouching: false,
    isSliding: false,
    isADS: false,
    slideTimer: 0,
    activeUpgrades: [],
    
    // Eclipse Protocol State
    biome: 'neon',
    weaponElements: {
      pistol: 'none',
      rifle: 'none',
      shotgun: 'none',
      launcher: 'none',
      sniper: 'none',
    },
    weaponBehaviors: {
      pistol: 'none',
      rifle: 'none',
      shotgun: 'none',
      launcher: 'none',
      sniper: 'none',
    },
    activePortals: [],
    hunterActive: false,
    hunterAdaptation: '',
    worldShiftName: '',
    worldShiftTimeRemaining: 0,
    anomalyCores: 0,
    runStage: 1,
    extractionActive: false,
    workbenchActive: false,
    activeDistrict: 'collapsed_gate',
    powerGrid: 'online',
    metroStatus: 'active',
    securityLevel: 1,
    civilianSafety: 100,
    heliosControl: 100,
    rebelInfluence: 0,
    militaryInfluence: 0,
    weatherState: 'clear',
    timeOfNight: 'Dusk',
    flashlightActive: false,
    nightVisionActive: false,
    activeMissions: [
      { id: 'gate_reconnect', name: 'Establish Link', desc: 'Find the transmitter in Collapsed Gate and reboot it.', status: 'active', district: 'collapsed_gate' },
      { id: 'neon_hacks', name: 'Breach Market Grid', desc: 'Infiltrate Neon Market and override HELIOS sensors.', status: 'active', district: 'neon_market' },
      { id: 'metro_restart', name: 'Reboot Transit Rail', desc: 'Secure the central station and start the automated express train.', status: 'active', district: 'transit_hub' },
    ],
  };

  // Enemies & Pickups
  private enemies: EnemyData[] = [];
  private enemyMeshes: Map<string, THREE.Group> = new Map();
  private activeRagdolls: Ragdoll[] = [];
  private pickups: PickupData[] = [];
  private pickupMeshes: Map<string, THREE.Object3D> = new Map();

  // 3D GLTF Models & Animation Mixers
  private soldierGLTF: any = null;
  private robotGLTF: any = null;
  private enemyAnimationMixers: Map<string, THREE.AnimationMixer> = new Map();

  // Visual Effects & Tracers
  private bulletTracers: { line: THREE.Line; age: number }[] = [];
  private particleEffects: { mesh: THREE.Points; age: number; maxAge: number; vel: THREE.Vector3[] }[] = [];

  // Input States
  public moveForward: number = 0;
  public moveRight: number = 0;
  public isShooting: boolean = false;

  // Settings & Callbacks
  private settings: GameSettings = {
    soundVolume: 0.8,
    mouseSensitivity: 1.0,
    touchSensitivity: 1.5,
    invertY: false,
    crosshairColor: '#38bdf8',
    difficulty: 'normal',
    fov: 75,
    cameraShake: 0.5,
  };
  private callbacks: GameEngineCallbacks;

  private getDifficultyParams() {
    switch (this.settings.difficulty) {
      case 'easy':
        return {
          spawnMult: 0.7,
          maxEnemies: 4,
          healthMult: 0.75,
          speedMult: 0.75,
          alertSpeed: 2.0,
          attackCooldownMin: 2.8,
          attackCooldownRand: 2.0,
          spread: 4.5,
          minDamage: 2,
          randDamage: 3,
        };
      case 'hard':
        return {
          spawnMult: 1.3,
          maxEnemies: 8,
          healthMult: 1.25,
          speedMult: 1.3,
          alertSpeed: 4.5,
          attackCooldownMin: 1.0,
          attackCooldownRand: 1.0,
          spread: 1.4,
          minDamage: 5,
          randDamage: 6,
        };
      case 'nightmare':
        return {
          spawnMult: 1.7,
          maxEnemies: 12,
          healthMult: 1.5,
          speedMult: 1.6,
          alertSpeed: 6.0,
          attackCooldownMin: 0.5,
          attackCooldownRand: 0.6,
          spread: 0.5,
          minDamage: 8,
          randDamage: 9,
        };
      case 'normal':
      default:
        return {
          spawnMult: 1.0,
          maxEnemies: 6,
          healthMult: 1.0,
          speedMult: 1.0,
          alertSpeed: 3.0,
          attackCooldownMin: 1.8,
          attackCooldownRand: 1.5,
          spread: 3.0,
          minDamage: 3,
          randDamage: 4,
        };
    }
  }

  private isRunning: boolean = false;
  private animFrameId: number | null = null;
  private lastFrameTime: number = performance.now();

  private bossId: string = 'warden_boss';

  // Procedural Enemy Spawner State
  private waveTotalEnemiesNeeded: number = 0;
  private waveEnemiesSpawned: number = 0;
  private proceduralSpawnTimer: number = 0;
  private proceduralSpawnInterval: number = 3.5;

  // Procedural Day/Night Environment State
  private dayNightCycleTime: number = 0.05; // 0.0 = High Noon, 0.25 = Sunset, 0.5 = Midnight, 0.75 = Dawn
  private dayNightCycleSpeed: number = 0.006; // ~160s per full cycle
  private environmentPhase: 'DAY' | 'SUNSET' | 'NIGHT' | 'DAWN' = 'DAY';
  private flashlight: THREE.SpotLight | null = null;

  constructor(container: HTMLElement, callbacks: GameEngineCallbacks) {
    this.container = container;
    this.callbacks = callbacks;
    this.initThree();
    this.startWave(1);
  }

  private initThree() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      200
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Clear previous canvas
    this.container.innerHTML = '';
    this.container.appendChild(this.renderer.domElement);

    // Build Tactical Map
    this.mapData = buildFPSMap(this.scene);
    this.playerPos.copy(
      new THREE.Vector3(this.mapData.playerSpawn.x, this.mapData.playerSpawn.y, this.mapData.playerSpawn.z)
    );

    // Setup Camera Weapon Rig
    this.scene.add(this.camera);
    this.camera.add(this.weaponGroup);
    this.weaponGroup.position.set(0.25, -0.2, -0.4); // Positioned in lower right corner of viewport

    // Tactical Camera Spotlight Flashlight (Engages automatically in low light)
    this.flashlight = new THREE.SpotLight(0xfef08a, 0, 45, Math.PI / 5, 0.4, 1);
    this.flashlight.position.set(0, 0, 0);
    this.flashlight.target.position.set(0, 0, -1);
    this.camera.add(this.flashlight);
    this.camera.add(this.flashlight.target);

    // Muzzle flash light & mesh attached to weapon group
    this.muzzleFlashLight = new THREE.PointLight(0xfcb316, 0, 8);
    this.muzzleFlashLight.position.set(0, 0.05, -0.6);
    this.weaponGroup.add(this.muzzleFlashLight);

    const flashGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.muzzleFlashMesh = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlashMesh.position.set(0, 0.05, -0.6);
    this.muzzleFlashMesh.visible = false;
    this.weaponGroup.add(this.muzzleFlashMesh);

    // Create 3D Gun Viewmodel
    this.updateWeaponViewmodel();

    // Init Pickups in Map
    this.initPickups();

    // Spawn 3D Interactive Mission Terminal Meshes
    const termGeo = new THREE.BoxGeometry(0.6, 1.0, 0.6);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });
    const hologMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45, wireframe: true });
    const hologRingGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);

    // 1. Central Generator Console (Stage 1)
    this.centralConsoleMesh = new THREE.Mesh(termGeo, termMat);
    this.centralConsoleMesh.position.set(0, 0.5, -10);
    this.scene.add(this.centralConsoleMesh);
    const holo1 = new THREE.Mesh(hologRingGeo, hologMat);
    holo1.position.set(0, 1.1, -10);
    this.scene.add(holo1);

    // 2. Gate Code Console (Stage 2)
    this.lockdownConsoleMesh = new THREE.Mesh(termGeo, termMat);
    this.lockdownConsoleMesh.position.set(0, 0.5, -32);
    this.scene.add(this.lockdownConsoleMesh);
    const holo2 = new THREE.Mesh(hologRingGeo, new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.45, wireframe: true }));
    holo2.position.set(0, 1.1, -32);
    this.scene.add(holo2);

    // 3. Override Core Console (Stage 4)
    this.overrideConsoleMesh = new THREE.Mesh(termGeo, termMat);
    this.overrideConsoleMesh.position.set(10, 0.5, -10);
    this.scene.add(this.overrideConsoleMesh);
    const holo3 = new THREE.Mesh(hologRingGeo, new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.4, wireframe: true }));
    holo3.position.set(10, 1.1, -10);
    this.scene.add(holo3);

    // Window Resize Handler
    window.addEventListener('resize', this.onWindowResize);

    // Load 3D GLTF Models (Soldier & Robot)
    this.load3DModels();
  }

  private load3DModels() {
    const loader = new GLTFLoader();

    loader.load(
      '/models/soldier.glb',
      (gltf) => {
        this.soldierGLTF = gltf;
        this.enemies.forEach((enemy) => {
          this.rebuildEnemyMesh(enemy);
        });
      },
      undefined,
      (err) => console.warn('Could not load soldier model:', err)
    );

    loader.load(
      '/models/robot.glb',
      (gltf) => {
        this.robotGLTF = gltf;
        this.enemies.forEach((enemy) => {
          if (enemy.type === 'heavy' || enemy.type === 'boss') {
            this.rebuildEnemyMesh(enemy);
          }
        });
      },
      undefined,
      (err) => console.warn('Could not load robot model:', err)
    );
  }

  private rebuildEnemyMesh(enemy: EnemyData) {
    const oldMesh = this.enemyMeshes.get(enemy.id);
    if (oldMesh) {
      this.scene.remove(oldMesh);
      this.enemyMeshes.delete(enemy.id);
    }
    this.enemyAnimationMixers.delete(enemy.id);
    this.createEnemy3DMesh(enemy);
  }

  public updateSettings(newSettings: Partial<GameSettings>) {
    this.settings = { ...this.settings, ...newSettings };
    soundEffects.setVolume(this.settings.soundVolume);
  }

  public getRadarData() {
    return {
      playerPos: { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
      playerYaw: this.yaw,
      timeOfDay: this.dayNightCycleTime,
      environmentPhase: this.environmentPhase,
      objective: this.activeObjectiveCoords ? { x: this.activeObjectiveCoords.x, z: this.activeObjectiveCoords.z } : null,
      enemies: this.enemies
        .filter((e) => e.state !== 'DEAD')
        .map((e) => ({
          id: e.id,
          x: e.position.x,
          z: e.position.z,
          type: e.type,
          state: e.state,
          health: e.health,
          maxHealth: e.maxHealth,
        })),
      pickups: this.pickups
        .filter((p) => p.active)
        .map((p) => ({
          id: p.id,
          x: p.position.x,
          z: p.position.z,
          type: p.type,
        })),
      obstacles: this.mapData
        ? this.mapData.obstacles.map((b) => ({
            minX: b.min.x,
            maxX: b.max.x,
            minZ: b.min.z,
            maxZ: b.max.z,
          }))
        : [],
    };
  }

  // Build/Switch 3D Gun Model Viewmodel
  private updateWeaponViewmodel() {
    if (this.currentGunMesh) {
      this.weaponGroup.remove(this.currentGunMesh);
    }

    const config = WEAPON_CONFIGS[this.stats.selectedWeaponId];
    const gunGroup = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.8,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: config.color,
      roughness: 0.4,
      metalness: 0.6,
    });

    if (config.id === 'launcher') {
      // Bazooka Rocket Launcher Tube
      const tubeGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.9, 16);
      const tubeMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.5, metalness: 0.5 }); // Dark olive green tube
      const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
      tubeMesh.rotation.x = Math.PI / 2;
      tubeMesh.position.set(0, 0.02, -0.4);
      gunGroup.add(tubeMesh);

      // Rocket Warhead Tip
      const warheadGeo = new THREE.ConeGeometry(0.075, 0.22, 16);
      const warheadMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.3 }); // Orange warhead
      const warheadMesh = new THREE.Mesh(warheadGeo, warheadMat);
      warheadMesh.rotation.x = -Math.PI / 2;
      warheadMesh.position.set(0, 0.02, -0.9);
      gunGroup.add(warheadMesh);

      // Wooden Grip Handle
      const gripGeo = new THREE.BoxGeometry(0.05, 0.22, 0.08);
      const gripMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const gripMesh = new THREE.Mesh(gripGeo, gripMat);
      gripMesh.position.set(0, -0.12, -0.2);
      gunGroup.add(gripMesh);
    } else if (config.id === 'shotgun') {
      // Double barrel shotgun!
      const receiverGeo = new THREE.BoxGeometry(0.08, 0.08, 0.25);
      const receiverMesh = new THREE.Mesh(receiverGeo, bodyMat);
      gunGroup.add(receiverMesh);

      const barrelGeo1 = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
      barrelGeo1.rotateX(Math.PI / 2);
      barrelGeo1.translate(-0.016, 0.01, -0.25);
      const barrel1 = new THREE.Mesh(barrelGeo1, bodyMat);
      gunGroup.add(barrel1);

      const barrelGeo2 = new THREE.CylinderGeometry(0.02, 0.02, 0.45, 8);
      barrelGeo2.rotateX(Math.PI / 2);
      barrelGeo2.translate(0.016, 0.01, -0.25);
      const barrel2 = new THREE.Mesh(barrelGeo2, bodyMat);
      gunGroup.add(barrel2);

      const stockGeo = new THREE.BoxGeometry(0.05, 0.1, 0.2);
      stockGeo.translate(0, -0.05, 0.12);
      const stockMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
      const stock = new THREE.Mesh(stockGeo, stockMat);
      gunGroup.add(stock);
    } else {
      // Receiver Body
      const bodyGeo = new THREE.BoxGeometry(0.08, 0.12, config.gunLength * 0.6);
      const bodyMesh = new THREE.Mesh(bodyGeo, bodyMat);
      gunGroup.add(bodyMesh);

      // Barrel
      const barrelGeo = new THREE.CylinderGeometry(
        config.barrelRadius,
        config.barrelRadius,
        config.gunLength * 0.7,
        16
      );
      const barrelMesh = new THREE.Mesh(barrelGeo, bodyMat);
      barrelMesh.rotation.x = Math.PI / 2;
      barrelMesh.position.set(0, 0.02, -config.gunLength * 0.4);
      gunGroup.add(barrelMesh);

      // Magazine Clip
      const magGeo = new THREE.BoxGeometry(0.05, 0.18, 0.08);
      const magMesh = new THREE.Mesh(magGeo, accentMat);
      magMesh.position.set(0, -0.1, -0.05);
      gunGroup.add(magMesh);

      // Scope / Sight Accent
      if (config.id === 'sniper') {
        const scopeGeo = new THREE.CylinderGeometry(0.035, 0.035, 0.25, 16);
        const scopeMesh = new THREE.Mesh(scopeGeo, accentMat);
        scopeMesh.rotation.x = Math.PI / 2;
        scopeMesh.position.set(0, 0.08, -0.1);
        gunGroup.add(scopeMesh);
      } else {
        const sightGeo = new THREE.BoxGeometry(0.02, 0.03, 0.04);
        const sightMesh = new THREE.Mesh(sightGeo, accentMat);
        sightMesh.position.set(0, 0.07, -config.gunLength * 0.3);
        gunGroup.add(sightMesh);
      }
    }

    this.currentGunMesh = gunGroup;
    this.weaponGroup.add(this.currentGunMesh);
  }

  // Switch Active Weapon
  public selectWeapon(weaponId: WeaponId) {
    if (this.stats.selectedWeaponId === weaponId || this.stats.isReloading) return;
    this.stats.selectedWeaponId = weaponId;
    this.updateWeaponViewmodel();
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Sprint Control
  public setSprint(active: boolean) {
    this.isSprinting = active;
    this.stats.isSprinting = active;
    if (active && this.isADS) {
      this.setADS(false);
    }
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Crouch & Sliding Trigger
  public setCrouch(active: boolean) {
    if (active && !this.isCrouching) {
      // Trigger sliding if sprinting and grounded and moving forward
      if (this.isSprinting && this.isGrounded && this.moveForward > 0) {
        const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
        const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));
        const moveDir = new THREE.Vector3()
          .addScaledVector(forward, this.moveForward)
          .addScaledVector(right, this.moveRight);

        if (moveDir.lengthSq() > 0) {
          moveDir.normalize();
          this.isSliding = true;
          this.stats.isSliding = true;
          this.slideTimer = 0.6;
          this.slideDir.copy(moveDir);
          soundEffects.playDash(); // Slide swoosh sound
        }
      }
    }

    this.isCrouching = active;
    this.stats.isCrouching = active;
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Aim Down Sight Control
  public setADS(active: boolean) {
    this.isADS = active;
    this.stats.isADS = active;
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Trigger EMP Shockwave Tactical Ability
  public triggerEMP() {
    if (this.empCooldownSeconds > 0) return;
    this.empCooldownSeconds = 30.0;
    this.stats.empCooldownSeconds = 30.0;
    this.stats.empCooldown = 1.0;

    soundEffects.playDash(); // Electric shockwave blast

    // Cool wireframe blue expansion ring
    const ringGeo = new THREE.RingGeometry(0.1, 1.0, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.copy(this.playerPos);
    ring.position.y = 0.1;
    this.scene.add(ring);

    let size = 1.0;
    const interval = setInterval(() => {
      size += 1.5;
      ring.scale.set(size, size, 1);
      ringMat.opacity -= 0.08;
      if (ringMat.opacity <= 0) {
        clearInterval(interval);
        this.scene.remove(ring);
      }
    }, 30);

    // Stun enemies in radius
    const stunRadius = 14.0;
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'DEAD') return;
      const enemyPos = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
      const dist = this.playerPos.distanceTo(enemyPos);
      if (dist <= stunRadius) {
        enemy.state = 'STUNNED';
        (enemy as any).stunTimer = 4.0; // Stun for 4 seconds
        this.createSparks(enemyPos, 0x06b6d4); // Blue sparks
      }
    });

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Throw Physical Grenade
  public throwGrenade() {
    if (this.stats.grenades <= 0) return;
    this.stats.grenades--;
    this.stats.grenades = Math.max(0, this.stats.grenades);

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const spawnPos = this.camera.position.clone();
    const geo = new THREE.SphereGeometry(0.08, 16, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xec4899,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0xec4899,
      emissiveIntensity: 0.4,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(spawnPos);
    this.scene.add(mesh);

    const vel = camDir.clone().multiplyScalar(16.0);
    vel.y += 4.5; // arc toss

    this.grenadeProjectiles.push({
      mesh,
      vel,
      bounceCount: 0,
      age: 0,
    });

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Interact with Stage Console/Item
  public interact() {
    const playerVec = this.playerPos.clone();

    // Check custom interactive consoles from MapData
    if (this.mapData && this.mapData.interactiveConsoles) {
      for (const consoleData of this.mapData.interactiveConsoles) {
        const consolePos = new THREE.Vector3(consoleData.position.x, consoleData.position.y, consoleData.position.z);
        if (playerVec.distanceTo(consolePos) < 4.0) {
          this.handleConsoleInteraction(consoleData);
          return;
        }
      }
    }

    // 1. Check if player is standing near any portal ring
    let nearPortalId: string | null = null;
    this.portalMeshes.forEach((portal) => {
      if (playerVec.distanceTo(portal.position) < 3.5) {
        nearPortalId = portal.name.split('_')[1];
      }
    });

    if (nearPortalId) {
      this.handlePortalActivation(nearPortalId);
      return;
    }

    // 2. Check if player is standing near the Workbench
    if (this.workbenchMesh && playerVec.distanceTo(this.workbenchMesh.position) < 3.5) {
      this.stats.workbenchActive = !this.stats.workbenchActive;
      this.callbacks.onStatsUpdate({ ...this.stats });
      soundEffects.playPickup('shield');
      return;
    }

    // 3. Existing interactive elements
    if (this.stage === 1) {
      // Restore power at central generator
      const genPos = new THREE.Vector3(0, 1.0, -10);
      if (playerVec.distanceTo(genPos) < 4.0) {
        this.objectiveProgress += 10;
        if (this.objectiveProgress >= 100) {
          this.objectiveProgress = 100;
          this.completeStage1();
        } else {
          soundEffects.playPickup('shield'); // interactive chime
        }
        this.stats.objectiveProgress = this.objectiveProgress;
        this.callbacks.onStatsUpdate({ ...this.stats });
      }
    } else if (this.stage === 2) {
      if (!this.keycardAcquired) {
        // Retrieve keycard
        const cardPos = new THREE.Vector3(15, 0.5, 15);
        if (playerVec.distanceTo(cardPos) < 3.0) {
          this.keycardAcquired = true;
          if (this.keycardMesh) {
            this.scene.remove(this.keycardMesh);
          }
          soundEffects.playPickup('health'); // pickup chime
          this.objectiveText = 'USE KEYCARD ON GATE TERMINAL (NORTH SHACK)';
          this.stats.objectiveText = this.objectiveText;
          this.activeObjectiveCoords.set(0, 0, -32); // Gate Terminal coords
          this.callbacks.onStatsUpdate({ ...this.stats });
        }
      } else {
        // Unlock Lockdown Gate Terminal
        const termPos = new THREE.Vector3(0, 1.0, -32);
        if (playerVec.distanceTo(termPos) < 4.0) {
          this.completeStage2();
        }
      }
    } else if (this.stage === 4) {
      // Start override terminal defence
      const overridePos = new THREE.Vector3(10, 1.0, -10);
      if (playerVec.distanceTo(overridePos) < 4.0 && !this.overrideActive) {
        this.overrideActive = true;
        this.overrideTimeLeft = 40;
        soundEffects.playPickup('shield');
        this.objectiveText = 'DEFEND CORE OVERRIDE TERMINAL (STAY WITHIN 8 METERS)';
        this.stats.objectiveText = this.objectiveText;
        this.callbacks.onStatsUpdate({ ...this.stats });
      }
    }
  }

  // Apply Upgrade stat modifications
  public applyUpgrade(upgradeId: string) {
    if (!this.activeUpgrades.includes(upgradeId)) {
      this.activeUpgrades.push(upgradeId);
      this.stats.activeUpgrades = [...this.activeUpgrades];
    }

    if (upgradeId === 'max_health') {
      this.stats.maxHealth += 25;
      this.stats.health += 25;
    } else if (upgradeId === 'max_shield') {
      this.stats.maxShield += 25;
      this.stats.shield += 25;
    } else if (upgradeId === 'extra_grenade') {
      this.stats.grenades = 3;
    }

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private completeStage1() {
    this.objectiveText = 'ZONE SECURED. INTERACT WITH A FRACTURE GATE PORTAL TO COMMENCE WORLD-SHIFT';
    this.stats.objectiveText = this.objectiveText;
    this.stats.score += 250;
    this.stats.anomalyCores += 10;
    this.stats.shield = this.stats.maxShield;
    this.spawnPortals();
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private completeStage2() {
    this.objectiveText = 'SECURITY BYPASSED. ENTER A FRACTURE GATE TO COMMENCE THE NEXT PHASE';
    this.stats.objectiveText = this.objectiveText;
    this.stats.score += 350;
    this.stats.anomalyCores += 12;
    this.stats.health = this.stats.maxHealth;
    this.spawnPortals();
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private completeStage3() {
    this.objectiveText = 'JAMMER DESTROYED. INTERACT WITH A FRACTURE PORTAL TO WARP SHIFT';
    this.stats.objectiveText = this.objectiveText;
    if (this.jammerMesh) {
      this.scene.remove(this.jammerMesh);
    }
    this.stats.score += 500;
    this.stats.anomalyCores += 15;
    this.spawnPortals();
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private completeStage4() {
    this.objectiveText = 'OVERRIDE PROTOCOL ENGAGED. SHIFT PORTALS ONLINE TO MEET THE CORE WARDEN';
    this.stats.objectiveText = this.objectiveText;
    this.stats.score += 650;
    this.stats.anomalyCores += 18;
    this.spawnPortals();
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private completeStage5() {
    this.objectiveText = 'WARDEN PURGED. ENTER THE EXTRACTION LZ PORTAL (GREEN BEACON) TO ESCAPE';
    this.stats.objectiveText = this.objectiveText;
    this.stats.score += 1000;
    this.stats.anomalyCores += 30;
    this.spawnPortals(); // Spawns the green extraction portal along with standard ones!
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private spawnWardenBoss() {
    this.bossSpawned = true;

    // Boss stats
    const enemy: EnemyData = {
      id: this.bossId,
      type: 'boss' as any,
      name: 'Warden Orbital Mech',
      position: { x: 0, y: 0, z: 0 },
      health: 450,
      maxHealth: 450,
      state: 'ATTACKING',
      patrolPoints: [],
      patrolIndex: 0,
      alertLevel: 1.0,
      attackCooldown: 1.0,
      rotationY: 0,
      isHitFlashing: false,
      hitFlashTimer: 0,
    };

    this.enemies.push(enemy);

    // Create a 3D massive enforcer warden group
    const bossGroup = new THREE.Group();

    // Legs/Threads
    const treadGeo = new THREE.BoxGeometry(1.5, 0.6, 2.5);
    const treadMat = new THREE.MeshStandardMaterial({ color: 0x090d16, metalness: 0.9, roughness: 0.4 });
    const treadL = new THREE.Mesh(treadGeo, treadMat);
    treadL.position.set(-0.9, 0.3, 0);
    const treadR = new THREE.Mesh(treadGeo, treadMat);
    treadR.position.set(0.9, 0.3, 0);
    bossGroup.add(treadL, treadR);

    // Torso Core
    const coreGeo = new THREE.CylinderGeometry(1.0, 1.2, 1.6, 12);
    const coreMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.9 });
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 1.3;
    bossGroup.add(core);

    // Massive shoulder armor plating
    const armorGeo = new THREE.BoxGeometry(2.8, 0.8, 1.2);
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x6b21a8, metalness: 0.8, roughness: 0.2 }); // purple warden metal
    const armor = new THREE.Mesh(armorGeo, armorMat);
    armor.position.set(0, 2.2, 0);
    bossGroup.add(armor);

    // Main central glowing crimson red sensor eye
    const eyeGeo = new THREE.SphereGeometry(0.35, 12, 12);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0xef4444,
      emissiveIntensity: 1.2,
    });
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0, 2.2, -0.6);
    bossGroup.add(eye);

    // Left micro-missile launcher pod
    const podGeo = new THREE.BoxGeometry(0.6, 0.6, 1.0);
    const pod = new THREE.Mesh(podGeo, treadMat);
    pod.position.set(-1.4, 2.6, 0.2);
    bossGroup.add(pod);

    // Right plasma heavy cannon
    const cannonGeo = new THREE.CylinderGeometry(0.18, 0.18, 1.3, 8);
    cannonGeo.rotateX(Math.PI / 2);
    const cannon = new THREE.Mesh(cannonGeo, treadMat);
    cannon.position.set(1.4, 2.4, -0.5);
    bossGroup.add(cannon);

    bossGroup.position.set(0, 0, 0);
    this.scene.add(bossGroup);
    this.enemyMeshes.set(this.bossId, bossGroup);
  }

  // Trigger Manual Reload
  public reloadWeapon() {
    const weapon = WEAPON_CONFIGS[this.stats.selectedWeaponId];
    const ammoState = this.stats.ammo[this.stats.selectedWeaponId];

    if (
      this.stats.isReloading ||
      ammoState.clip >= weapon.magazineSize ||
      ammoState.reserve <= 0
    ) {
      return;
    }

    this.stats.isReloading = true;
    this.stats.reloadProgress = 0;
    this.reloadStartTime = performance.now();
    soundEffects.playReload(weapon.id);
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Core Shooting Logic
  public fireWeapon() {
    if (this.stats.isReloading) return;

    const weapon = WEAPON_CONFIGS[this.stats.selectedWeaponId];
    const ammoState = this.stats.ammo[this.stats.selectedWeaponId];
    const now = performance.now();
    const cooldownMs = 1000 / weapon.fireRate;

    if (now - this.lastFireTime < cooldownMs) return;

    if (ammoState.clip <= 0) {
      soundEffects.playEmptyClick();
      this.reloadWeapon();
      return;
    }

    // Deduct ammo
    ammoState.clip -= 1;
    this.lastFireTime = now;

    // Play gunshot sound
    soundEffects.playGunshot(weapon.id);

    // Muzzle Flash
    this.muzzleFlashLight.intensity = 3.5;
    this.muzzleFlashMesh.visible = true;
    setTimeout(() => {
      this.muzzleFlashLight.intensity = 0;
      this.muzzleFlashMesh.visible = false;
    }, 45);

    // Recoil Kickback
    this.recoilOffsetPitch += weapon.recoilPitch;
    this.recoilOffsetYaw += (Math.random() - 0.5) * weapon.recoilYaw;

    // Viewmodel Kick animation
    if (this.currentGunMesh) {
      this.currentGunMesh.position.z += 0.12;
      this.currentGunMesh.rotation.x -= 0.15;
    }

    if (weapon.id === 'launcher') {
      this.fireRocketProjectile();
    } else {
      // Fire pellets (1 for pistol/rifle/sniper, 8 for shotgun)
      for (let p = 0; p < weapon.pellets; p++) {
        this.performRaycastShot(weapon);
      }

      // Add cool shotgun physical pushback
      if (weapon.id === 'shotgun') {
        const camDir = new THREE.Vector3();
        this.camera.getWorldDirection(camDir);
        camDir.y = 0; // horizontal only
        camDir.normalize();
        this.playerVel.addScaledVector(camDir, -9.0);
      }
    }

    // Auto-reload if empty
    if (ammoState.clip === 0 && ammoState.reserve > 0) {
      setTimeout(() => this.reloadWeapon(), 200);
    }

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Fire Rocket Projectile
  private fireRocketProjectile() {
    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);

    const rocketGroup = new THREE.Group();

    const bodyGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.35, 8);
    bodyGeo.rotateX(Math.PI / 2);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    rocketGroup.add(body);

    const tipGeo = new THREE.ConeGeometry(0.04, 0.12, 8);
    tipGeo.rotateX(Math.PI / 2);
    tipGeo.translate(0, 0, -0.18);
    const tipMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444 });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    rocketGroup.add(tip);

    const spawnPos = new THREE.Vector3();
    this.muzzleFlashMesh.getWorldPosition(spawnPos);
    rocketGroup.position.copy(spawnPos);
    rocketGroup.lookAt(spawnPos.clone().add(camDir));

    this.scene.add(rocketGroup);

    const vel = camDir.clone().multiplyScalar(32.0);

    this.rocketProjectiles.push({
      mesh: rocketGroup,
      vel,
      age: 0,
    });
  }

  // Hitscan Raycast
  private performRaycastShot(weapon: typeof WEAPON_CONFIGS[WeaponId]) {
    // Add spread angle randomness
    const spreadX = (Math.random() - 0.5) * weapon.spread;
    const spreadY = (Math.random() - 0.5) * weapon.spread;

    const raycaster = new THREE.Raycaster();
    // Ray from camera through center of screen with spread
    raycaster.setFromCamera(new THREE.Vector2(spreadX, spreadY), this.camera);

    // Check hit against enemy meshes and solid map obstacles only
    const enemyMeshList: THREE.Object3D[] = [];
    this.enemyMeshes.forEach((mesh) => enemyMeshList.push(mesh));

    const shootTargets = [...enemyMeshList, ...this.mapData.obstacleMeshes];
    const intersects = raycaster.intersectObjects(shootTargets, true);

    const muzzlePos = new THREE.Vector3();
    this.muzzleFlashMesh.getWorldPosition(muzzlePos);

    // Get Active Fusion Cores for Selected Weapon
    const activeElement = this.stats.weaponElements[weapon.id] || 'none';
    const activeBehavior = this.stats.weaponBehaviors[weapon.id] || 'none';

    let tracerColor = 0xfde047; // default yellow
    if (activeElement === 'plasma') tracerColor = 0xf97316; // fiery orange
    else if (activeElement === 'cryo') tracerColor = 0x38bdf8; // frosted cyan
    else if (activeElement === 'arc') tracerColor = 0x06b6d4; // electrical cyan-blue
    else if (activeElement === 'void') tracerColor = 0xa855f7; // purple gravitational void
    else if (activeElement === 'chrono') tracerColor = 0xeab308; // golden-clockwork
    else if (activeElement === 'corruption') tracerColor = 0x9d174d; // deep magenta-black

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitPoint = hit.point;

      // Check if enemy hit
      let hitEnemyId: string | null = null;

      this.enemyMeshes.forEach((group, id) => {
        group.traverse((child) => {
          if (child === hit.object) {
            hitEnemyId = id;
          }
        });
      });

      // Check if Stage 3 Jammer Core hit
      let hitJammer = false;
      if (this.stage === 3 && this.jammerMesh) {
        this.jammerMesh.traverse((child) => {
          if (child === hit.object) {
            hitJammer = true;
          }
        });
      }

      if (hitEnemyId) {
        // Enemy Direct Hit! Check Headshot
        const isHeadshot = hit.object.name === 'head';
        let finalDamage = Math.round(weapon.damage * (isHeadshot ? 1.8 : 1.0));

        // Elemental Core Buffs
        if (activeElement === 'corruption') {
          // Sacrifice: higher damage at low health
          const hpPct = this.stats.health / this.stats.maxHealth;
          const mult = hpPct < 0.3 ? 2.5 : 1.75;
          finalDamage = Math.round(finalDamage * mult);
        }

        this.damageEnemy(hitEnemyId, finalDamage, isHeadshot, hitPoint);
        this.createSparks(hitPoint, tracerColor); // Red blood/sparks in element color

        // Element Apply Effects
        if (activeElement === 'plasma') {
          this.applyPlasmaBurn(hitEnemyId, 5, 4); // 5 dmg per tick, 4 ticks
        } else if (activeElement === 'cryo') {
          this.applyCryoFreeze(hitEnemyId, 3.0); // Frost slow for 3s
        } else if (activeElement === 'arc') {
          this.triggerArcChain(hitEnemyId, hitPoint, finalDamage * 0.5);
        } else if (activeElement === 'void') {
          this.createGravityVortex(hitPoint);
        } else if (activeElement === 'chrono' && isHeadshot) {
          this.triggerChronoTimeDilation();
        }

        // Behavior Apply Effects
        if (activeBehavior === 'echo') {
          setTimeout(() => {
            if (hitEnemyId) {
              this.damageEnemy(hitEnemyId, Math.round(finalDamage * 0.5), false, hitPoint);
            }
          }, 150);
        }

      } else if (hitJammer) {
        this.damageJammer(weapon.damage);
        this.createSparks(hitPoint, tracerColor); // Cyber/power sparks
      } else {
        // Environment Hit
        this.createSparks(hitPoint, 0xfacc15); // Yellow sparks

        // Behavior: Ricochet reflect off walls
        if (activeBehavior === 'ricochet') {
          const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : new THREE.Vector3(0, 1, 0);
          const reflectedDir = raycaster.ray.direction.clone().reflect(normal).normalize();
          this.performSecondaryRicochetShot(hitPoint.clone().addScaledVector(reflectedDir, 0.1), reflectedDir, weapon, tracerColor);
        }
      }

      // Draw Tracer Line
      this.drawTracer(muzzlePos, hitPoint, tracerColor);
    } else {
      // Ray into distance
      const farPoint = raycaster.ray.at(100, new THREE.Vector3());
      this.drawTracer(muzzlePos, farPoint, tracerColor);
    }
  }

  // Create Big Rocket Explosion Effect
  private createExplosionEffect(pos: THREE.Vector3) {
    soundEffects.playGunshot('sniper'); // Loud booming explosion sound

    // Bright flash light
    const flashLight = new THREE.PointLight(0xf97316, 12, 18);
    flashLight.position.copy(pos);
    this.scene.add(flashLight);
    setTimeout(() => this.scene.remove(flashLight), 150);

    // Fiery Explosion Particle Burst
    const particleCount = 48;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y + 0.2;
      positions[i * 3 + 2] = pos.z;

      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 12;
      const up = 2 + Math.random() * 8;

      velocities.push(
        new THREE.Vector3(
          Math.cos(angle) * speed,
          up,
          Math.sin(angle) * speed
        )
      );
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: 0xf97316, size: 0.35, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particleEffects.push({ mesh: points, age: 0, maxAge: 0.6, vel: velocities });
  }

  // Damage Enemy & Handle Death
  private damageEnemy(enemyId: string, damage: number, isHeadshot: boolean, hitPos: THREE.Vector3) {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (!enemy || enemy.state === 'DEAD') return;

    enemy.health -= damage;
    enemy.isHitFlashing = true;
    enemy.hitFlashTimer = 0.15;
    if (enemy.state !== 'STUNNED') {
      enemy.state = 'ATTACKING'; // Immediately aggro on player!
    }

    // Hitmarker callback
    soundEffects.playHitmarker(isHeadshot);
    this.callbacks.onHitMarker({
      id: Math.random().toString(),
      timestamp: performance.now(),
      isHeadshot,
      damage,
      position: { x: hitPos.x, y: hitPos.y, z: hitPos.z },
    });

    if (isHeadshot) this.stats.headshots += 1;

    // Check Enemy Death
    if (enemy.health <= 0) {
      enemy.health = 0;
      enemy.state = 'DEAD';
      this.handleEnemyDeath(enemyId, isHeadshot);
    } else {
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
  }

  // Centrally Handle Enemy Death Sequences and Scoring
  private handleEnemyDeath(enemyId: string, isHeadshot: boolean = false) {
    const enemy = this.enemies.find((e) => e.id === enemyId);
    if (!enemy) return;

    soundEffects.playEnemyDeath();

    this.stats.kills += 1;
    this.stats.score += isHeadshot ? 150 : 100;

    this.callbacks.onKill(enemy.name, isHeadshot);

    // Chance to drop Pickup at enemy location (100% for boss, 50% for standard enemies)
    const isBoss = enemyId === this.bossId || enemy.type === ('boss' as any);
    if (isBoss || Math.random() < 0.50) {
      this.spawnDroppedPickupAt({ x: enemy.position.x, y: 0.8, z: enemy.position.z }, isBoss);
    }

    // Hide Enemy Mesh with death scale down
    const meshGroup = this.enemyMeshes.get(enemyId);
    if (meshGroup) {
      this.enemyMeshes.delete(enemyId);
      this.triggerRagdoll(meshGroup, enemy, isHeadshot);
    }

    // Boss defeat triggers Stage 5 Complete
    if (enemyId === this.bossId) {
      this.completeStage5();
    }

    // Check Wave Completion
    const aliveCount = this.enemies.filter((e) => e.state !== 'DEAD').length;
    if (this.waveEnemiesSpawned >= this.waveTotalEnemiesNeeded && aliveCount === 0) {
      setTimeout(() => {
        this.callbacks.onWaveComplete(this.stats.wave);
        this.stats.wave += 1;
        this.startWave(this.stats.wave);
      }, 1200);
    }

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Draw Bullet Tracer Line
  private drawTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex = 0xfde047) {
    const geo = new THREE.BufferGeometry().setFromPoints([start, end]);
    const mat = new THREE.LineBasicMaterial({ color: colorHex, transparent: true, opacity: 0.8 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.bulletTracers.push({ line, age: 0 });
  }

  // --- ECLIPSE PROTOCOL CUSTOM HELPER METHODS ---

  private activeBurns: Map<string, { dmg: number; ticks: number; timer: number }> = new Map();
  private activeSlows: Map<string, { duration: number }> = new Map();
  private activeVortices: { mesh: THREE.Mesh; pos: THREE.Vector3; age: number; maxAge: number }[] = [];
  private chronoSlowTimer: number = 0;
  private portalMeshes: THREE.Mesh[] = [];
  private workbenchMesh: THREE.Mesh | null = null;

  private applyPlasmaBurn(enemyId: string, dmg: number, ticks: number) {
    this.activeBurns.set(enemyId, { dmg, ticks, timer: 0.5 });
  }

  private applyCryoFreeze(enemyId: string, duration: number) {
    this.activeSlows.set(enemyId, { duration });
    const mesh = this.enemyMeshes.get(enemyId);
    if (mesh) {
      mesh.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.1, metalness: 0.9 });
        }
      });
    }
  }

  private triggerArcChain(sourceEnemyId: string, sourcePos: THREE.Vector3, dmg: number) {
    let nearestEnemy: EnemyData | null = null;
    let nearestDist = 12.0;

    this.enemies.forEach((enemy) => {
      if (enemy.id !== sourceEnemyId && enemy.state !== 'DEAD') {
        const dist = sourcePos.distanceTo(new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z));
        if (dist < nearestDist) {
          nearestDist = dist;
          nearestEnemy = enemy;
        }
      }
    });

    if (nearestEnemy) {
      const targetPos = new THREE.Vector3(nearestEnemy.position.x, nearestEnemy.position.y + 0.5, nearestEnemy.position.z);
      this.damageEnemy(nearestEnemy.id, Math.round(dmg), false, targetPos);
      this.drawTracer(sourcePos, targetPos, 0x06b6d4);
      this.createSparks(targetPos, 0x06b6d4);
    }
  }

  private createGravityVortex(pos: THREE.Vector3) {
    const geo = new THREE.SphereGeometry(1.2, 16, 16);
    const mat = new THREE.MeshBasicMaterial({ color: 0xa855f7, wireframe: true, transparent: true, opacity: 0.5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);

    this.activeVortices.push({
      mesh,
      pos: pos.clone(),
      age: 0,
      maxAge: 1.5,
    });
  }

  private triggerChronoTimeDilation() {
    this.chronoSlowTimer = 2.5;
    soundEffects.playPickup('shield');
  }

  private performSecondaryRicochetShot(startPoint: THREE.Vector3, direction: THREE.Vector3, weapon: any, colorHex: number) {
    const raycaster = new THREE.Raycaster(startPoint, direction);
    const enemyMeshList: THREE.Object3D[] = [];
    this.enemyMeshes.forEach((mesh) => enemyMeshList.push(mesh));
    const intersects = raycaster.intersectObjects([...enemyMeshList, ...this.mapData.obstacleMeshes], true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const hitPoint = hit.point;

      let hitEnemyId: string | null = null;
      this.enemyMeshes.forEach((group, id) => {
        group.traverse((child) => {
          if (child === hit.object) hitEnemyId = id;
        });
      });

      if (hitEnemyId) {
        const isHeadshot = hit.object.name === 'head';
        const dmg = Math.round(weapon.damage * 0.75 * (isHeadshot ? 1.8 : 1.0));
        this.damageEnemy(hitEnemyId, dmg, isHeadshot, hitPoint);
        this.createSparks(hitPoint, colorHex);
      } else {
        this.createSparks(hitPoint, 0xfacc15);
      }
      this.drawTracer(startPoint, hitPoint, colorHex);
    } else {
      const farPoint = startPoint.clone().addScaledVector(direction, 40);
      this.drawTracer(startPoint, farPoint, colorHex);
    }
  }

  private spawnWorkbenchMesh() {
    if (this.workbenchMesh) {
      this.scene.remove(this.workbenchMesh);
    }
    const geo = new THREE.BoxGeometry(1.5, 0.8, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.2 });
    this.workbenchMesh = new THREE.Mesh(geo, mat);
    this.workbenchMesh.position.set(0, 0.4, 25);
    this.scene.add(this.workbenchMesh);

    const screenGeo = new THREE.BoxGeometry(0.8, 0.4, 0.1);
    const screenMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true });
    const screen = new THREE.Mesh(screenGeo, screenMat);
    screen.position.set(0, 0.6, 0.2);
    this.workbenchMesh.add(screen);
  }

  private spawnPortals() {
    this.removePortals();

    const portalConfig = [
      { id: 'safe', color: 0x06b6d4, x: -10, z: -10 },
      { id: 'hazard', color: 0xef4444, x: 10, z: -10 },
      { id: 'unknown', color: 0xa855f7, x: 0, z: -20 },
    ];

    if (this.stage >= 5) {
      portalConfig.push({ id: 'extraction', color: 0x10b981, x: 0, z: 20 });
    }

    portalConfig.forEach((p) => {
      const ringGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.1, 16);
      const ringMat = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.4, wireframe: true });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.set(p.x, 0.05, p.z);
      ring.name = `portal_${p.id}`;
      this.scene.add(ring);
      this.portalMeshes.push(ring);

      const beamGeo = new THREE.CylinderGeometry(0.2, 0.2, 10, 8);
      const beamMat = new THREE.MeshBasicMaterial({ color: p.color, transparent: true, opacity: 0.25 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.y = 5;
      ring.add(beam);
    });

    this.stats.activePortals = portalConfig.map((p) => p.id);
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private removePortals() {
    this.portalMeshes.forEach((mesh) => this.scene.remove(mesh));
    this.portalMeshes = [];
    this.stats.activePortals = [];
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // --- ECLIPSE PROTOCOL REAL-TIME TICKERS ---

  private worldShiftCooldown: number = 75; // seconds

  private updateWorldShifts(dt: number) {
    if (this.stats.worldShiftTimeRemaining > 0) {
      this.stats.worldShiftTimeRemaining -= dt;
      if (this.stats.worldShiftTimeRemaining <= 0) {
        this.stats.worldShiftTimeRemaining = 0;
        this.stats.worldShiftName = '';
        this.resetWorldShiftEffects();
      }
      this.callbacks.onStatsUpdate({ ...this.stats });
    } else {
      this.worldShiftCooldown -= dt;
      if (this.worldShiftCooldown <= 0) {
        this.triggerWorldShift();
        this.worldShiftCooldown = 90; // reset cooldown for next shift
      }
    }

    if (this.chronoSlowTimer > 0) {
      this.chronoSlowTimer -= dt;
      if (this.chronoSlowTimer < 0) this.chronoSlowTimer = 0;
    }
  }

  private triggerWorldShift() {
    const events = ['Total Blackout', 'Gravity Failure', 'Reality Overlap', 'Time Fracture'];
    const randomEvent = events[Math.floor(Math.random() * events.length)];
    this.stats.worldShiftName = randomEvent;
    this.stats.worldShiftTimeRemaining = 25; // event lasts 25 seconds

    this.applyWorldShiftEffects(randomEvent);
    this.callbacks.onStatsUpdate({ ...this.stats });
    this.callbacks.onKill(`WORLD SHIFT: [${randomEvent.toUpperCase()}] DETECTED`, false); // show on feed
  }

  private applyWorldShiftEffects(eventName: string) {
    if (eventName === 'Total Blackout') {
      if (this.mapData && this.mapData.ambientLight) {
        this.mapData.ambientLight.color.setHex(0x05010a);
        this.mapData.ambientLight.intensity = 0.05;
      }
    } else if (eventName === 'Reality Overlap') {
      this.spawnRealityOverlapAmbush();
    }
  }

  private resetWorldShiftEffects() {
    if (this.mapData && this.mapData.ambientLight) {
      let ambientColor = 0x94a3b8;
      if (this.stats.biome === 'neon') ambientColor = 0xa21caf;
      else if (this.stats.biome === 'bio') ambientColor = 0x15803d;
      else if (this.stats.biome === 'frozen') ambientColor = 0x38bdf8;
      
      this.mapData.ambientLight.color.setHex(ambientColor);
      this.mapData.ambientLight.intensity = 0.75;
    }
  }

  private spawnRealityOverlapAmbush() {
    const types: EnemyType[] = ['grunt', 'patrol', 'heavy'];
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      const type = types[Math.floor(Math.random() * types.length)];
      this.spawnEnemyAt({ x, y: 1.2, z }, type);
    }
  }

  private spawnEnemyAt(pos: { x: number, y: number, z: number }, type: EnemyType) {
    const diff = this.getDifficultyParams();
    const waveNum = this.stats.wave;
    const baseHealth = (28 + waveNum * 8) * diff.healthMult;
    let healthMult = 1.0;
    let tierName = 'Tactical Trooper';
    if (type === 'grunt') {
      tierName = 'Vanguard Scout';
      healthMult = 0.75;
    } else if (type === 'heavy') {
      tierName = 'Enforcer Juggernaut';
      healthMult = 1.8;
    }

    const calculatedHealth = Math.round(baseHealth * healthMult);
    const id = `overlap_enemy_${Math.floor(Math.random() * 10000)}`;

    const enemy: EnemyData = {
      id,
      type,
      name: tierName,
      health: calculatedHealth,
      maxHealth: calculatedHealth,
      position: { x: pos.x, y: pos.y, z: pos.z },
      rotationY: Math.random() * Math.PI * 2,
      patrolPoints: [
        { x: pos.x, y: pos.y, z: pos.z },
        { x: pos.x + (Math.random() - 0.5) * 10, y: pos.y, z: pos.z + (Math.random() - 0.5) * 10 }
      ],
      patrolIndex: 0,
      state: 'PATROL',
      isHitFlashing: false,
      hitFlashTimer: 0,
      attackCooldown: diff.attackCooldownMin + Math.random() * diff.attackCooldownRand,
      alertLevel: 0.5,
    };

    this.enemies.push(enemy);
    this.createEnemy3DMesh(enemy);
    this.createSpawnBeamEffect(new THREE.Vector3(pos.x, 0, pos.z), type);
  }

  private updateCryoSlows(dt: number) {
    this.activeSlows.forEach((slow, id) => {
      slow.duration -= dt;
      if (slow.duration <= 0) {
        this.activeSlows.delete(id);
      }
    });
  }

  private updateElementalTickers(dt: number) {
    this.activeBurns.forEach((burn, id) => {
      burn.timer -= dt;
      if (burn.timer <= 0) {
        burn.timer = 0.5;
        burn.ticks -= 1;
        const enemy = this.enemies.find(e => e.id === id);
        if (enemy && enemy.state !== 'DEAD') {
          this.damageEnemy(id, burn.dmg, false, new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z));
          this.createSparks(new THREE.Vector3(enemy.position.x, enemy.position.y + 0.5, enemy.position.z), 0xf97316);
        }
        if (burn.ticks <= 0) {
          this.activeBurns.delete(id);
        }
      }
    });

    this.activeVortices.forEach((vortex, index) => {
      vortex.age += dt;
      if (vortex.age >= vortex.maxAge) {
        this.scene.remove(vortex.mesh);
        this.activeVortices.splice(index, 1);
      } else {
        this.enemies.forEach((enemy) => {
          if (enemy.state !== 'DEAD') {
            const ePos = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
            const dist = ePos.distanceTo(vortex.pos);
            if (dist < 10.0) {
              const pullForce = (10.0 - dist) * 1.5 * dt;
              const dir = vortex.pos.clone().sub(ePos).normalize();
              enemy.position.x += dir.x * pullForce;
              enemy.position.z += dir.z * pullForce;
              if (Math.random() < 0.15) {
                this.createSparks(ePos, 0xa855f7);
              }
            }
          }
        });
      }
    });
  }

  // Create Spark Particle Burst
  private createSparks(pos: THREE.Vector3, colorHex: number) {
    const particleCount = 12;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = pos.x;
      positions[i * 3 + 1] = pos.y;
      positions[i * 3 + 2] = pos.z;

      velocities.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 6 + 2,
          (Math.random() - 0.5) * 6
        )
      );
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color: colorHex, size: 0.15, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);

    this.particleEffects.push({ mesh: points, age: 0, maxAge: 0.35, vel: velocities });
  }

  // Spawn Pickups in Scene
  private initPickups() {
    this.mapData.pickupSpawns.forEach((pos) => {
      this.spawnPickupAt(pos);
    });
  }

  private spawnPickupAt(pos: Point3D) {
    const types: PickupType[] = ['health', 'ammo_rifle', 'ammo_shotgun', 'shield', 'ammo_pistol'];
    const type = types[Math.floor(Math.random() * types.length)];
    const id = Math.random().toString();

    let colorHex = 0x22c55e; // Green health
    if (type.includes('ammo')) colorHex = 0xf59e0b; // Amber ammo
    if (type === 'shield') colorHex = 0x38bdf8; // Blue shield

    const geo = new THREE.BoxGeometry(0.7, 0.7, 0.7);
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(pos.x, pos.y, pos.z);
    mesh.castShadow = true;
    this.scene.add(mesh);

    this.pickups.push({ id, type, position: pos, active: true, rotation: 0 });
    this.pickupMeshes.set(id, mesh);
  }

  private spawnDroppedPickupAt(pos: Point3D, isBoss: boolean = false) {
    let type: PickupType = 'health';
    const rand = Math.random();
    if (isBoss) {
      type = 'anomaly_core';
    } else {
      if (rand < 0.40) {
        type = 'anomaly_core';
      } else if (rand < 0.60) {
        type = 'health';
      } else if (rand < 0.75) {
        type = 'shield';
      } else if (rand < 0.90) {
        const ammoTypes: PickupType[] = ['ammo_rifle', 'ammo_shotgun', 'ammo_pistol', 'ammo_launcher', 'ammo_sniper'];
        type = ammoTypes[Math.floor(Math.random() * ammoTypes.length)];
      } else {
        type = 'grenade';
      }
    }

    const id = `drop_${Math.random().toString()}`;

    let colorHex = 0x22c55e; // Green health
    if (type.includes('ammo')) colorHex = 0xf59e0b; // Amber ammo
    if (type === 'shield') colorHex = 0x38bdf8; // Blue shield
    if (type === 'grenade') colorHex = 0xef4444; // Red grenade
    if (type === 'anomaly_core') colorHex = 0xa855f7; // Purple anomaly core

    const group = new THREE.Group();
    group.position.set(pos.x, pos.y, pos.z);

    // 1. Spinning Inner Core Mesh
    let innerMesh: THREE.Mesh | THREE.Group;
    if (type === 'anomaly_core') {
      const coreGroup = new THREE.Group();
      
      const topConeGeo = new THREE.ConeGeometry(0.25, 0.4, 4);
      const botConeGeo = new THREE.ConeGeometry(0.25, 0.4, 4);
      botConeGeo.rotateX(Math.PI);

      const coneMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 1.2,
        roughness: 0.1,
        metalness: 0.8,
      });

      const topCone = new THREE.Mesh(topConeGeo, coneMat);
      topCone.position.y = 0.2;
      const botCone = new THREE.Mesh(botConeGeo, coneMat);
      botCone.position.y = -0.2;

      coreGroup.add(topCone);
      coreGroup.add(botCone);
      
      const sphereGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const sphere = new THREE.Mesh(sphereGeo, sphereMat);
      coreGroup.add(sphere);

      innerMesh = coreGroup;
    } else {
      const boxGroup = new THREE.Group();

      const boxGeo = new THREE.BoxGeometry(0.4, 0.4, 0.4);
      const boxMat = new THREE.MeshStandardMaterial({
        color: colorHex,
        emissive: colorHex,
        emissiveIntensity: 0.7,
        roughness: 0.4,
      });
      const box = new THREE.Mesh(boxGeo, boxMat);
      boxGroup.add(box);

      const cageGeo = new THREE.BoxGeometry(0.55, 0.55, 0.55);
      const cageMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        wireframe: true,
        transparent: true,
        opacity: 0.4,
      });
      const cage = new THREE.Mesh(cageGeo, cageMat);
      boxGroup.add(cage);

      innerMesh = boxGroup;
    }

    innerMesh.name = 'inner_item';
    group.add(innerMesh);

    // 2. High-Tech Beacon Light Beam (risky, glowing visual indicator)
    const beamGeo = new THREE.CylinderGeometry(0.02, 0.2, 3.0, 8, 1, true);
    const beamMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(beamGeo, beamMat);
    beam.position.y = 1.0;
    group.add(beam);

    this.scene.add(group);

    this.pickups.push({
      id,
      type,
      position: pos,
      active: true,
      rotation: 0,
      isDropped: true,
      lifetimeRemaining: 15.0,
    });
    this.pickupMeshes.set(id, group);

    if (isBoss) {
      this.spawnDroppedPickupAt({ x: pos.x + 2, y: pos.y, z: pos.z }, false);
      this.spawnDroppedPickupAt({ x: pos.x - 2, y: pos.y, z: pos.z }, false);
    }
  }

  // Select Procedural Enemy Tier based on wave and difficulty
  private selectProceduralEnemyTier(waveNum: number, difficulty: GameDifficulty): EnemyType {
    const rand = Math.random();
    if (waveNum <= 1) {
      if (difficulty === 'hard' || difficulty === 'nightmare') {
        if (rand < 0.40) return 'grunt';
        if (rand < 0.75) return 'patrol';
        return 'heavy';
      } else {
        if (rand < 0.60) return 'grunt';
        return 'patrol';
      }
    } else if (waveNum === 2) {
      if (difficulty === 'nightmare') {
        if (rand < 0.25) return 'grunt';
        if (rand < 0.55) return 'patrol';
        if (rand < 0.80) return 'heavy';
        return 'sniper';
      } else {
        if (rand < 0.35) return 'grunt';
        if (rand < 0.70) return 'patrol';
        return 'heavy';
      }
    } else {
      // Wave 3+
      if (difficulty === 'nightmare' || difficulty === 'hard') {
        if (rand < 0.20) return 'grunt';
        if (rand < 0.45) return 'patrol';
        if (rand < 0.75) return 'heavy';
        return 'sniper';
      } else {
        if (rand < 0.30) return 'grunt';
        if (rand < 0.60) return 'patrol';
        if (rand < 0.85) return 'heavy';
        return 'sniper';
      }
    }
  }

  // Spawn a single procedural enemy unit
  private spawnSingleProceduralEnemy() {
    if (!this.mapData || !this.mapData.enemyPatrolRoutes) return;

    const diff = this.getDifficultyParams();
    const waveNum = this.stats.wave;
    const tier = this.selectProceduralEnemyTier(waveNum, this.settings.difficulty);

    // Pick random spawn route at a safe distance from player (at least 12m away)
    const routes = this.mapData.enemyPatrolRoutes;
    const safeMinDist = 12.0;

    const safeRoutes = routes.filter((r) => {
      const startPoint = new THREE.Vector3(r[0].x, 0, r[0].z);
      return startPoint.distanceTo(this.playerPos) >= safeMinDist;
    });

    // Pick a truly random route from safe routes (or all routes if player is near all)
    const candidateRoutes = safeRoutes.length > 0 ? safeRoutes : routes;
    const selectedRoute = candidateRoutes[Math.floor(Math.random() * candidateRoutes.length)];

    // Scatter position slightly so multiple enemies at same route don't overlap exactly
    const basePoint = selectedRoute[0];
    const scatterX = (Math.random() - 0.5) * 5.0;
    const scatterZ = (Math.random() - 0.5) * 5.0;
    const startPos = {
      x: Math.max(-45, Math.min(45, basePoint.x + scatterX)),
      y: basePoint.y,
      z: Math.max(-45, Math.min(45, basePoint.z + scatterZ)),
    };
    const baseHealth = (28 + waveNum * 8) * diff.healthMult;

    let tierName = 'Tactical Trooper';
    let healthMult = 1.0;

    if (tier === 'grunt') {
      tierName = 'Vanguard Scout';
      healthMult = 0.75;
    } else if (tier === 'patrol') {
      tierName = 'Tactical Trooper';
      healthMult = 1.0;
    } else if (tier === 'heavy') {
      tierName = 'Enforcer Juggernaut';
      healthMult = 1.8;
    } else if (tier === 'sniper') {
      tierName = 'Cyber Marksman';
      healthMult = 0.85;
    }

    const calculatedHealth = Math.round(baseHealth * healthMult);
    const id = `enemy_${waveNum}_${this.waveEnemiesSpawned}_${Math.floor(Math.random() * 1000)}`;

    const enemy: EnemyData = {
      id,
      type: tier,
      name: tierName,
      health: calculatedHealth,
      maxHealth: calculatedHealth,
      position: { x: startPos.x, y: startPos.y, z: startPos.z },
      rotationY: Math.random() * Math.PI * 2,
      patrolPoints: selectedRoute,
      patrolIndex: 0,
      state: 'PATROL',
      isHitFlashing: false,
      hitFlashTimer: 0,
      attackCooldown: diff.attackCooldownMin + Math.random() * diff.attackCooldownRand,
      alertLevel: 0,
    };

    this.enemies.push(enemy);
    this.waveEnemiesSpawned++;
    this.createEnemy3DMesh(enemy);

    // Spawn visual warp effect
    this.createSpawnBeamEffect(new THREE.Vector3(startPos.x, 0, startPos.z), tier);
  }

  // Create Teleport Beam Particle Visual for Spawner
  private createSpawnBeamEffect(pos: THREE.Vector3, tier: EnemyType) {
    let beamColor = 0x38bdf8;
    if (tier === 'grunt') beamColor = 0x06b6d4;
    if (tier === 'heavy') beamColor = 0xf59e0b;
    if (tier === 'sniper') beamColor = 0xd946ef;

    const light = new THREE.PointLight(beamColor, 6, 8);
    light.position.set(pos.x, 1.2, pos.z);
    this.scene.add(light);

    const geo = new THREE.CylinderGeometry(0.6, 0.6, 3.5, 12, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: beamColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
    });
    const cylinder = new THREE.Mesh(geo, mat);
    cylinder.position.set(pos.x, 1.75, pos.z);
    this.scene.add(cylinder);

    let fadeAge = 0;
    const fadeInterval = setInterval(() => {
      fadeAge += 0.05;
      mat.opacity = Math.max(0, 0.6 * (1 - fadeAge / 0.4));
      light.intensity = Math.max(0, 6 * (1 - fadeAge / 0.4));
      if (fadeAge >= 0.4) {
        clearInterval(fadeInterval);
        this.scene.remove(light);
        this.scene.remove(cylinder);
      }
    }, 50);
  }

  // Wave Spawner (Procedural Enemy Spawning Manager)
  private startWave(waveNum: number) {
    // Clear previous enemies
    this.enemies.forEach((e) => {
      const mesh = this.enemyMeshes.get(e.id);
      if (mesh) this.scene.remove(mesh);
    });
    this.enemies = [];
    this.enemyMeshes.clear();

    this.activeRagdolls.forEach((r) => {
      this.scene.remove(r.meshGroup);
      if (r.gunMesh) this.scene.remove(r.gunMesh);
    });
    this.activeRagdolls = [];

    const diff = this.getDifficultyParams();
    this.waveTotalEnemiesNeeded = Math.round((4 + waveNum * 3) * diff.spawnMult);
    this.waveEnemiesSpawned = 0;
    this.proceduralSpawnInterval = Math.max(1.8, (4.5 - waveNum * 0.3) / diff.spawnMult);

    // Spawn initial squad immediately
    const initialCount = Math.min(
      diff.maxEnemies,
      Math.min(this.waveTotalEnemiesNeeded, Math.max(2, Math.round(2 + waveNum * 0.5)))
    );

    for (let i = 0; i < initialCount; i++) {
      this.spawnSingleProceduralEnemy();
    }

    this.proceduralSpawnTimer = this.proceduralSpawnInterval;
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Periodic Spawner Check
  private updateProceduralSpawner(dt: number) {
    const diff = this.getDifficultyParams();
    const activeAliveCount = this.enemies.filter((e) => e.state !== 'DEAD').length;

    if (this.waveEnemiesSpawned < this.waveTotalEnemiesNeeded && activeAliveCount < diff.maxEnemies) {
      this.proceduralSpawnTimer -= dt;
      if (this.proceduralSpawnTimer <= 0) {
        this.spawnSingleProceduralEnemy();
        this.proceduralSpawnTimer = this.proceduralSpawnInterval + (Math.random() * 1.2 - 0.6);
      }
    }
  }

  // Procedural Day/Night Cycle & Dynamic Atmosphere System
  private updateDayNightCycle(dt: number) {
    if (this.mapData && this.mapData.sunLight) {
      const skyColor = new THREE.Color();
      const fogColor = new THREE.Color();
      const sunColor = new THREE.Color();
      const ambientColor = new THREE.Color();

      let fogDensity = 0.02;
      let sunIntensity = 0.5;
      let ambientIntensity = 0.5;
      let lampIntensity = 1.5;
      let flashlightIntensity = this.stats.flashlightActive ? 4.5 : 0.0;

      const time = this.stats.timeOfNight || 'Midnight';
      const weather = this.stats.weatherState || 'clear';

      // Determine lighting from campaign Time of Night
      if (time === 'Dusk') {
        this.environmentPhase = 'SUNSET';
        skyColor.setHex(0x31103f); // Crimson/violet dusk
        fogColor.setHex(0x2a0833);
        sunColor.setHex(0xf97316); // Amber
        ambientColor.setHex(0x7c3aed);
        fogDensity = 0.02;
        sunIntensity = 0.6;
        ambientIntensity = 0.45;
        lampIntensity = 1.0;
      } else if (time === 'Twilight') {
        this.environmentPhase = 'SUNSET';
        skyColor.setHex(0x1e1b4b); // Indigo twilight
        fogColor.setHex(0x110c2d);
        sunColor.setHex(0xec4899); // Magenta neon Sun
        ambientColor.setHex(0x6366f1);
        fogDensity = 0.018;
        sunIntensity = 0.7;
        ambientIntensity = 0.5;
        lampIntensity = 2.0;
      } else if (time === 'Midnight') {
        this.environmentPhase = 'NIGHT';
        skyColor.setHex(0x020617); // Slate midnight
        fogColor.setHex(0x050e1d);
        sunColor.setHex(0x38bdf8); // Blue moonlight
        ambientColor.setHex(0x1e293b);
        fogDensity = 0.022;
        sunIntensity = 0.35;
        ambientIntensity = 0.3;
        lampIntensity = 2.5;
      } else if (time === 'Storm') {
        this.environmentPhase = 'NIGHT';
        skyColor.setHex(0x081121); // Heavy dark storm clouds
        fogColor.setHex(0x030d1a);
        sunColor.setHex(0x0c4a6e);
        ambientColor.setHex(0x0284c7);
        fogDensity = 0.035; // Thicker storm fog
        sunIntensity = 0.2;
        ambientIntensity = 0.25;
        lampIntensity = 1.8;
      } else if (time === 'Blackout') {
        this.environmentPhase = 'NIGHT';
        skyColor.setHex(0x022c22); // Greenish hazardous underearth
        fogColor.setHex(0x021e17);
        sunColor.setHex(0x10b981);
        ambientColor.setHex(0x064e3b);
        fogDensity = 0.04;
        sunIntensity = 0.05; // Total blackness!
        ambientIntensity = 0.15;
        lampIntensity = 0.1; // Almost offline streetlamps
      } else if (time === 'Dawn') {
        this.environmentPhase = 'DAWN';
        skyColor.setHex(0x0c4a6e); // Steel blue dawn
        fogColor.setHex(0x0a1f33);
        sunColor.setHex(0x0ea5e9);
        ambientColor.setHex(0x38bdf8);
        fogDensity = 0.015;
        sunIntensity = 0.8;
        ambientIntensity = 0.6;
        lampIntensity = 1.0;
      }

      // Add dynamic lightning or flash if heavy storm weather is active
      if (weather === 'storm' && Math.random() < 0.003) {
        sunIntensity = 5.0; // Flash!
        sunColor.setHex(0xffffff);
        ambientIntensity = 3.0;
      }

      // Apply environmental changes
      this.scene.background = skyColor;
      if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
        this.scene.fog.color.copy(fogColor);
        this.scene.fog.density = fogDensity;
      }

      this.mapData.sunLight.color.copy(sunColor);
      this.mapData.sunLight.intensity = sunIntensity;
      this.mapData.ambientLight.color.copy(ambientColor);
      this.mapData.ambientLight.intensity = ambientIntensity;

      // Update point lamps on map
      if (this.mapData.pointLamps) {
        this.mapData.pointLamps.forEach((lamp) => {
          lamp.intensity = lampIntensity;
        });
      }

      // Update player camera flashlight
      if (this.flashlight) {
        this.flashlight.intensity = flashlightIntensity;
      }
    }
  }

  // Build 3D Enemy Mesh per Tier
  private createEnemy3DMesh(enemy: EnemyData) {
    const group = new THREE.Group();
    const type = enemy.type;

    let gltfToUse: any = null;
    let isRobot = false;

    if ((type === 'heavy' || type === 'boss') && this.robotGLTF) {
      gltfToUse = this.robotGLTF;
      isRobot = true;
    } else if (this.soldierGLTF) {
      gltfToUse = this.soldierGLTF;
      isRobot = false;
    } else if (this.robotGLTF) {
      gltfToUse = this.robotGLTF;
      isRobot = true;
    }

    if (gltfToUse) {
      const clonedScene = (SkeletonUtils as any).clone(gltfToUse.scene);
      
      if (isRobot) {
        const scale = type === 'boss' ? 1.5 : (type === 'heavy' ? 1.05 : 0.75);
        clonedScene.scale.set(scale, scale, scale);
      } else {
        const scale = type === 'boss' ? 2.6 : (type === 'heavy' ? 2.2 : 1.8);
        clonedScene.scale.set(scale, scale, scale);
      }

      clonedScene.traverse((child: any) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      group.add(clonedScene);

      // Play walking/running animation
      if (gltfToUse.animations && gltfToUse.animations.length > 0) {
        const mixer = new THREE.AnimationMixer(clonedScene);
        const preferredName = isRobot ? 'Walking' : 'Walk';
        let clip = THREE.AnimationClip.findByName(gltfToUse.animations, preferredName);
        if (!clip) clip = THREE.AnimationClip.findByName(gltfToUse.animations, 'Run') || gltfToUse.animations[0];
        if (clip) {
          const action = mixer.clipAction(clip);
          action.play();
        }
        this.enemyAnimationMixers.set(enemy.id, mixer);
      }

      // Colliders for headshot and torso hits
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const headMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const headMesh = new THREE.Mesh(headGeo, headMat);
      headMesh.name = 'head';
      headMesh.position.y = isRobot ? 1.5 : 1.7;
      group.add(headMesh);

      const torsoGeo = new THREE.BoxGeometry(0.7, 1.0, 0.5);
      const torsoMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
      const torsoMesh = new THREE.Mesh(torsoGeo, torsoMat);
      torsoMesh.name = 'torso';
      torsoMesh.position.y = isRobot ? 0.8 : 0.95;
      group.add(torsoMesh);

      group.position.set(enemy.position.x, 0, enemy.position.z);
      group.rotation.y = enemy.rotationY;
      this.scene.add(group);
      this.enemyMeshes.set(enemy.id, group);
      return;
    }

    let armorColor = 0x94a3b8; // Silver for patrol
    let visorColor = 0xef4444; // Red for patrol
    let visorEmissive = 0x7f1d1d;
    let torsoWidth = 0.7;
    let torsoHeight = 1.0;
    let torsoDepth = 0.4;
    let gunLength = 0.6;
    let gunWidth = 0.1;

    if (type === 'grunt') {
      armorColor = 0x06b6d4; // Cyan
      visorColor = 0x22d3ee; // Bright cyan
      visorEmissive = 0x0891b2;
      torsoWidth = 0.6;
      torsoHeight = 0.9;
      torsoDepth = 0.35;
      gunLength = 0.45;
    } else if (type === 'heavy') {
      armorColor = 0xd97706; // Bronze/Amber
      visorColor = 0xfacc15; // Gold/Yellow
      visorEmissive = 0xb45309;
      torsoWidth = 0.9;
      torsoHeight = 1.15;
      torsoDepth = 0.55;
      gunLength = 0.8;
      gunWidth = 0.18;
    } else if (type === 'sniper') {
      armorColor = 0x4f46e5; // Indigo
      visorColor = 0xe879f9; // Magenta/Violet
      visorEmissive = 0xa21caf;
      torsoWidth = 0.65;
      torsoHeight = 1.05;
      torsoDepth = 0.38;
      gunLength = 1.0;
    }

    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
    const armorMat = new THREE.MeshStandardMaterial({ color: armorColor, roughness: 0.3, metalness: 0.5 });
    const headMat = new THREE.MeshStandardMaterial({ color: visorColor, roughness: 0.2, emissive: visorEmissive });

    // Torso Body
    const torsoGeo = new THREE.BoxGeometry(torsoWidth, torsoHeight, torsoDepth);
    const torsoMesh = new THREE.Mesh(torsoGeo, armorMat);
    torsoMesh.position.y = torsoHeight / 2 + 0.6;
    torsoMesh.castShadow = true;
    torsoMesh.name = 'torso';
    group.add(torsoMesh);

    // Heavy Shoulder Pauldrons
    if (type === 'heavy') {
      const padGeo = new THREE.BoxGeometry(0.35, 0.35, 0.45);
      const padMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.2, metalness: 0.7 });

      const leftPad = new THREE.Mesh(padGeo, padMat);
      leftPad.position.set(-0.55, 1.25, 0);
      leftPad.name = 'leftPad';
      group.add(leftPad);

      const rightPad = new THREE.Mesh(padGeo, padMat);
      rightPad.position.set(0.55, 1.25, 0);
      rightPad.name = 'rightPad';
      group.add(rightPad);
    }

    // Head / Helmet (Named 'head' for headshot raycast detection)
    const headGeo = new THREE.BoxGeometry(0.38, 0.38, 0.38);
    const headMesh = new THREE.Mesh(headGeo, headMat);
    headMesh.name = 'head';
    headMesh.position.y = torsoHeight + 0.8;
    headMesh.castShadow = true;
    group.add(headMesh);

    // Sniper Antenna
    if (type === 'sniper') {
      const antGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4);
      const antMat = new THREE.MeshBasicMaterial({ color: 0xe879f9 });
      const ant = new THREE.Mesh(antGeo, antMat);
      ant.position.set(0.12, torsoHeight + 1.1, -0.05);
      ant.name = 'antenna';
      group.add(ant);
    }

    // Arms & Weapon in Hand
    const armGeo = new THREE.BoxGeometry(0.2, 0.7, 0.2);
    const leftArm = new THREE.Mesh(armGeo, bodyMat);
    leftArm.position.set(-(torsoWidth / 2 + 0.1), 1.1, 0);
    leftArm.name = 'leftArm';
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, bodyMat);
    rightArm.position.set(torsoWidth / 2 + 0.1, 1.1, 0.2);
    rightArm.rotation.x = -Math.PI / 3; // Holding gun forward
    rightArm.name = 'rightArm';
    group.add(rightArm);

    // Enemy Gun Model
    const enemyGunGeo = new THREE.BoxGeometry(gunWidth, 0.12, gunLength);
    const enemyGunMat = new THREE.MeshStandardMaterial({ color: 0x0f172a });
    const enemyGun = new THREE.Mesh(enemyGunGeo, enemyGunMat);
    enemyGun.position.set(torsoWidth / 2 + 0.1, 1.1, gunLength / 2 + 0.1);
    enemyGun.name = 'gun';
    group.add(enemyGun);

    // Scope on Sniper Gun
    if (type === 'sniper') {
      const scopeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.3);
      const scopeMat = new THREE.MeshStandardMaterial({ color: 0xd946ef, emissive: 0xa21caf });
      const scope = new THREE.Mesh(scopeGeo, scopeMat);
      scope.rotation.x = Math.PI / 2;
      scope.position.set(torsoWidth / 2 + 0.1, 1.2, gunLength / 2 + 0.1);
      scope.name = 'scope';
      group.add(scope);
    }

    // Legs
    const legGeo = new THREE.BoxGeometry(0.25, 0.8, 0.25);
    const leftLeg = new THREE.Mesh(legGeo, bodyMat);
    leftLeg.position.set(-0.2, 0.4, 0);
    leftLeg.name = 'leftLeg';
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, bodyMat);
    rightLeg.position.set(0.2, 0.4, 0);
    rightLeg.name = 'rightLeg';
    group.add(rightLeg);

    group.position.set(enemy.position.x, 0, enemy.position.z);
    this.scene.add(group);
    this.enemyMeshes.set(enemy.id, group);
  }

  // Look Around Input (Touch drag or Mouse move)
  public applyLookDelta(deltaX: number, deltaY: number) {
    const sens = this.settings.touchSensitivity * 0.0025;
    this.yaw -= deltaX * sens;
    const ySign = this.settings.invertY ? -1 : 1;
    this.pitch -= deltaY * sens * ySign;

    // Clamp pitch between -85 and +85 degrees
    const maxPitch = (Math.PI / 2) * 0.94;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));
  }

  // Player Jump
  public jump() {
    if (this.isGrounded) {
      this.playerVel.y = 11.0;
      this.isGrounded = false;
    }
  }

  // Player High-Speed Dash
  public dash() {
    if (this.dashCooldown > 0) return;

    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, this.moveForward)
      .addScaledVector(right, this.moveRight);

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      this.dashDir.copy(moveDir);
    } else {
      forward.normalize();
      this.dashDir.copy(forward);
    }

    this.isDashing = true;
    this.dashTimer = 0.2; // 0.2 seconds dash burst
    this.dashCooldown = 0.9; // 0.9 seconds cooldown

    soundEffects.playDash();

    // Camera FOV punch
    if (this.camera) {
      this.camera.fov = 88;
      this.camera.updateProjectionMatrix();
    }
  }

  // Main Frame Loop
  private update = () => {
    const now = performance.now();
    const dt = Math.min((now - this.lastFrameTime) / 1000, 0.1);
    this.lastFrameTime = now;

    if (this.isRunning) {
      let enemyDt = dt;
      if (this.chronoSlowTimer > 0) {
        enemyDt = dt * 0.25; // 4x slower enemies under Chrono warp!
      }

      this.updatePlayerPhysics(dt);
      this.updateRecoilAndSway(dt);
      this.updateReloadProgress(now);
      this.updateEnemyAI(enemyDt);
      this.enemyAnimationMixers.forEach((mixer) => mixer.update(enemyDt));
      this.updateProceduralSpawner(enemyDt);
      this.updateDayNightCycle(dt);
      this.updatePickups(dt);
      this.updateVisualEffects(dt);
      this.updateRagdolls(dt);
      this.updateCampaignSystems(dt);

      // New tactical expansion update methods
      this.updateProjectiles(enemyDt);
      this.updateMissionObjectives(dt);
      this.updateADSAndSliding(dt);

      // Eclipse Protocol update tickers
      this.updateElementalTickers(dt);
      this.updateCryoSlows(dt);
      this.updateWorldShifts(dt);

      // Auto fire continuously if trigger held for automatic weapons (rifle)
      if (this.isShooting && this.stats.selectedWeaponId === 'rifle') {
        this.fireWeapon();
      }

      // Render Three.js Scene
      this.renderer.render(this.scene, this.camera);
    }

    this.animFrameId = requestAnimationFrame(this.update);
  };

  // Tactical ADS Zoom and Slide Camera Height Handling
  private updateADSAndSliding(dt: number) {
    // 1. Zoom Camera FOV
    let targetFov = 75;
    if (this.dashTimer > 0) {
      targetFov = 88;
    } else if (this.isADS) {
      targetFov = this.stats.selectedWeaponId === 'sniper' ? 18 : 42;
    }
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, targetFov, 12 * dt);
    this.camera.updateProjectionMatrix();

    // 2. Iron Sights Centering
    const targetGunPos = new THREE.Vector3();
    if (this.isADS) {
      targetGunPos.set(0, -0.11, -0.25);
    } else {
      targetGunPos.set(0.25, -0.2, -0.4);
    }
    this.weaponGroup.position.lerp(targetGunPos, 14 * dt);

    // 3. Crouching & Sliding Viewport Height
    let targetHeight = 1.6; // Stand
    if (this.isSliding) {
      targetHeight = 0.65;
    } else if (this.isCrouching) {
      targetHeight = 0.85;
    }
    this.camera.position.y = THREE.MathUtils.lerp(this.camera.position.y, targetHeight, 10 * dt);

    // 4. Sliding Friction Decay
    if (this.isSliding) {
      this.slideTimer -= dt;
      // Inject slide speed
      const slideSpeed = 16.0 * (this.slideTimer / 0.6) + 4.0;
      this.playerVel.x = this.slideDir.x * slideSpeed;
      this.playerVel.z = this.slideDir.z * slideSpeed;

      if (this.slideTimer <= 0) {
        this.isSliding = false;
        this.stats.isSliding = false;
        this.callbacks.onStatsUpdate({ ...this.stats });
      }
    }

    // 5. Ability Cooldowns Update
    if (this.empCooldownSeconds > 0) {
      this.empCooldownSeconds = Math.max(0, this.empCooldownSeconds - dt);
      this.stats.empCooldownSeconds = this.empCooldownSeconds;
      this.stats.empCooldown = Math.max(0, 1 - this.empCooldownSeconds / 30.0);
    }
  }

  // Handle Rocket and Grenade Physical Projectiles Physics & Collisions
  private updateProjectiles(dt: number) {
    // A. Rockets Update
    for (let i = this.rocketProjectiles.length - 1; i >= 0; i--) {
      const rocket = this.rocketProjectiles[i];
      rocket.age += dt;

      // Translate rocket
      rocket.mesh.position.addScaledVector(rocket.vel, dt);

      // Out of bounds check
      if (rocket.age > 4.5) {
        this.scene.remove(rocket.mesh);
        this.rocketProjectiles.splice(i, 1);
        continue;
      }

      // Check collision against obstacles
      const rocketBox = new THREE.Box3().setFromObject(rocket.mesh);
      let hit = false;
      if (this.mapData && this.mapData.obstacles) {
        for (const box of this.mapData.obstacles) {
          if (box.intersectsBox(rocketBox)) {
            hit = true;
            break;
          }
        }
      }

      // Check collision against jammer tower
      if (this.stage === 3 && this.jammerMesh && !hit) {
        const jammerBox = new THREE.Box3().setFromObject(this.jammerMesh);
        if (jammerBox.intersectsBox(rocketBox)) {
          hit = true;
          this.damageJammer(110);
        }
      }

      // Check collision against enemies
      let hitEnemyId: string | null = null;
      for (const enemy of this.enemies) {
        if (enemy.state === 'DEAD') continue;
        const mesh = this.enemyMeshes.get(enemy.id);
        if (mesh) {
          const enemyBox = new THREE.Box3().setFromObject(mesh);
          if (enemyBox.intersectsBox(rocketBox)) {
            hit = true;
            hitEnemyId = enemy.id;
            break;
          }
        }
      }

      if (hit) {
        // Trigger Explosion!
        this.triggerExplosionAt(rocket.mesh.position, 6.0, 140);
        this.scene.remove(rocket.mesh);
        this.rocketProjectiles.splice(i, 1);
      }
    }

    // B. Grenades Update
    for (let i = this.grenadeProjectiles.length - 1; i >= 0; i--) {
      const grenade = this.grenadeProjectiles[i];
      grenade.age += dt;

      // Gravity force
      grenade.vel.y -= 9.81 * dt;
      grenade.mesh.position.addScaledVector(grenade.vel, dt);

      // Rotate grenade mesh
      grenade.mesh.rotation.x += dt * 5;
      grenade.mesh.rotation.y += dt * 3;

      // Floor bounce
      if (grenade.mesh.position.y < 0.08) {
        grenade.mesh.position.y = 0.08;
        grenade.vel.y = -grenade.vel.y * 0.45; // bounce decay
        grenade.vel.x *= 0.7; // roll friction
        grenade.vel.z *= 0.7;
        grenade.bounceCount++;
      }

      // Detonate grenade after 2.5s
      if (grenade.age >= 2.5) {
        this.triggerExplosionAt(grenade.mesh.position, 7.5, 160);
        this.scene.remove(grenade.mesh);
        this.grenadeProjectiles.splice(i, 1);
      }
    }
  }

  // Handle explosion damage & visuals
  private triggerExplosionAt(pos: THREE.Vector3, radius: number, maxDamage: number) {
    soundEffects.playGunshot('launcher'); // Explosion sound

    // Visual fire sparks
    this.createSparks(pos, 0xf97316); // Orange sparks
    this.createSparks(pos, 0xef4444); // Red sparks

    // Spawn expanding glowing sphere
    const sphereGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const sphereMat = new THREE.MeshBasicMaterial({ color: 0xf97316, transparent: true, opacity: 0.8 });
    const explosionBall = new THREE.Mesh(sphereGeo, sphereMat);
    explosionBall.position.copy(pos);
    this.scene.add(explosionBall);

    let scale = 1.0;
    const interval = setInterval(() => {
      scale += 1.2;
      explosionBall.scale.set(scale, scale, scale);
      sphereMat.opacity -= 0.12;
      if (sphereMat.opacity <= 0) {
        clearInterval(interval);
        this.scene.remove(explosionBall);
      }
    }, 25);

    // Apply splash damage to enemies
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'DEAD') return;
      const enemyPos = new THREE.Vector3(enemy.position.x, 1.0, enemy.position.z);
      const dist = pos.distanceTo(enemyPos);
      if (dist <= radius) {
        const damage = Math.round(maxDamage * (1 - dist / radius));
        if (damage > 0) {
          enemy.health -= damage;
          enemy.isHitFlashing = true;
          enemy.hitFlashTimer = 0.15;

          // Push enemy back!
          const pushDir = new THREE.Vector3().subVectors(enemyPos, pos);
          pushDir.y = 0;
          pushDir.normalize();
          enemy.position.x += pushDir.x * 1.5;
          enemy.position.z += pushDir.z * 1.5;

          if (enemy.health <= 0) {
            enemy.health = 0;
            enemy.state = 'DEAD';
            this.handleEnemyDeath(enemy.id);
          }
        }
      }
    });

    // Check player self damage
    const distToPlayer = pos.distanceTo(this.playerPos);
    if (distToPlayer <= radius) {
      const selfDamage = Math.round(maxDamage * 0.4 * (1 - distToPlayer / radius));
      if (selfDamage > 0) {
        this.damagePlayer(selfDamage, pos);
      }
    }
  }

  // Handle stage 3 Comm Jammer Core damage
  private damageJammer(damage: number) {
    if (this.stage !== 3 || this.jammerHealth <= 0) return;
    this.jammerHealth = Math.max(0, this.jammerHealth - damage);
    this.objectiveProgress = Math.round((1 - this.jammerHealth / 150) * 100);
    this.stats.objectiveProgress = this.objectiveProgress;

    // Hit sparks
    const sparkPos = new THREE.Vector3(-12, 5.0, -12);
    this.createSparks(sparkPos, 0xef4444);

    if (this.jammerHealth <= 0) {
      this.completeStage3();
    }
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Track Real-time Stage Progression Countdowns
  private updateMissionObjectives(dt: number) {
    const playerVec = this.playerPos.clone();

    // Stun recovery ticker for enemies
    this.enemies.forEach((enemy) => {
      if (enemy.state === 'STUNNED') {
        const timer = (enemy as any).stunTimer - dt;
        (enemy as any).stunTimer = timer;
        if (timer <= 0) {
          enemy.state = 'ATTACKING';
        }
      }
    });

    // 1. Stage 4 Terminal Defence Countdown
    if (this.stage === 4 && this.overrideActive) {
      const termPos = new THREE.Vector3(10, 0.5, -10);
      const dist = playerVec.distanceTo(termPos);

      if (dist <= 8.0) {
        this.overrideTimeLeft -= dt;
        this.objectiveProgress = Math.round((1 - this.overrideTimeLeft / 40.0) * 100);
        this.stats.objectiveProgress = this.objectiveProgress;
        this.objectiveText = `HOLD CORE OVERRIDE: ${Math.round(this.overrideTimeLeft)}s REMAINING`;
        this.stats.objectiveText = this.objectiveText;

        if (this.overrideTimeLeft <= 0) {
          this.overrideTimeLeft = 0;
          this.overrideActive = false;
          this.completeStage4();
        }
      } else {
        // Warning penalty: timer stops and alerts player
        this.objectiveText = 'WARNING: LEFT TERMINAL SECURITY SHIELD PERIMETER!';
        this.stats.objectiveText = this.objectiveText;
      }
      this.callbacks.onStatsUpdate({ ...this.stats });
    }

    // 2. Stage 5 Evacuation LZ Extraction
    if (this.extractionActive) {
      this.extractionTimeLeft -= dt;
      this.objectiveProgress = Math.round((this.extractionTimeLeft / 45) * 100);
      this.stats.objectiveProgress = this.objectiveProgress;

      const lzPos = new THREE.Vector3(0, 0, 35);
      const dist = playerVec.distanceTo(lzPos);

      if (dist < 4.0) {
        // Mission complete success victory!
        this.isRunning = false;
        this.stats.health = 99999; // code for victory UI
        this.callbacks.onGameOver();
        return;
      }

      if (this.extractionTimeLeft <= 0) {
        // Evacuation failed!
        this.isRunning = false;
        this.stats.health = 0;
        this.callbacks.onGameOver();
        return;
      }

      this.objectiveText = `EVACUATE TO BEACON LZ: ${Math.round(this.extractionTimeLeft)}s REMAINING`;
      this.stats.objectiveText = this.objectiveText;
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
  }

  // Player Movement & Obstacle Bounding Box Collision
  private updatePlayerPhysics(dt: number) {
    // Cooldown management
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);

    // Smoothly restore FOV after dash
    if (this.camera && this.camera.fov > 75) {
      this.camera.fov = Math.max(75, this.camera.fov - dt * 60);
      this.camera.updateProjectionMatrix();
    }

    // Check Dashing State
    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      const dashSpeed = 34.0;
      this.playerVel.x = this.dashDir.x * dashSpeed;
      this.playerVel.z = this.dashDir.z * dashSpeed;

      if (this.dashTimer <= 0) {
        this.isDashing = false;
      }
    } else {
      // Standard Movement Vector based on Camera Yaw
      const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
      const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0));

      const moveDir = new THREE.Vector3()
        .addScaledVector(forward, this.moveForward)
        .addScaledVector(right, this.moveRight);

      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const moveSpeed = 9.0;
        this.playerVel.x = moveDir.x * moveSpeed;
        this.playerVel.z = moveDir.z * moveSpeed;

        // Footstep sound tick
        if (this.isGrounded && Math.random() < 0.08) {
          soundEffects.playFootstep();
        }
      } else {
        this.playerVel.x *= 0.8;
        this.playerVel.z *= 0.8;
      }
    }

    // Gravity
    this.playerVel.y -= 22.0 * dt;

    // Apply Velocity to Position with Wall Collision Check
    const nextPos = this.playerPos.clone();
    nextPos.x += this.playerVel.x * dt;
    nextPos.z += this.playerVel.z * dt;
    nextPos.y += this.playerVel.y * dt;

    // Ground floor collision
    if (nextPos.y <= this.playerHeight) {
      nextPos.y = this.playerHeight;
      this.playerVel.y = 0;
      this.isGrounded = true;
    }

    // Check Obstacle Bounding Box Collisions
    const playerBox = new THREE.Box3(
      new THREE.Vector3(
        nextPos.x - this.playerRadius,
        nextPos.y - this.playerHeight,
        nextPos.z - this.playerRadius
      ),
      new THREE.Vector3(
        nextPos.x + this.playerRadius,
        nextPos.y,
        nextPos.z + this.playerRadius
      )
    );

    let collides = false;
    for (const box of this.mapData.obstacles) {
      if (box.intersectsBox(playerBox)) {
        collides = true;
        break;
      }
    }

    if (!collides) {
      this.playerPos.copy(nextPos);
    } else {
      // Try X slide only
      const xPos = this.playerPos.clone();
      xPos.x += this.playerVel.x * dt;
      const xBox = new THREE.Box3(
        new THREE.Vector3(xPos.x - this.playerRadius, xPos.y - this.playerHeight, xPos.z - this.playerRadius),
        new THREE.Vector3(xPos.x + this.playerRadius, xPos.y, xPos.z + this.playerRadius)
      );
      if (!this.mapData.obstacles.some((b) => b.intersectsBox(xBox))) {
        this.playerPos.x = xPos.x;
      }

      // Try Z slide only
      const zPos = this.playerPos.clone();
      zPos.z += this.playerVel.z * dt;
      const zBox = new THREE.Box3(
        new THREE.Vector3(zPos.x - this.playerRadius, zPos.y - this.playerHeight, zPos.z - this.playerRadius),
        new THREE.Vector3(zPos.x + this.playerRadius, zPos.y, zPos.z + this.playerRadius)
      );
      if (!this.mapData.obstacles.some((b) => b.intersectsBox(zBox))) {
        this.playerPos.z = zPos.z;
      }
    }

    // Set Camera Position & Rotation
    this.camera.position.copy(this.playerPos);

    // Apply Camera Rotation with Recoil Offset
    const finalPitch = this.pitch + this.recoilOffsetPitch;
    const finalYaw = this.yaw + this.recoilOffsetYaw;

    const euler = new THREE.Euler(finalPitch, finalYaw, 0, 'YXZ');
    this.camera.quaternion.setFromEuler(euler);
  }

  // Smooth Recoil Spring Recovery & Viewmodel Sway
  private updateRecoilAndSway(dt: number) {
    const weapon = WEAPON_CONFIGS[this.stats.selectedWeaponId];

    // Decay recoil offset back to zero
    this.recoilOffsetPitch = THREE.MathUtils.lerp(this.recoilOffsetPitch, 0, weapon.recoilRecovery * dt);
    this.recoilOffsetYaw = THREE.MathUtils.lerp(this.recoilOffsetYaw, 0, weapon.recoilRecovery * dt);

    // Viewmodel return back to rest position
    if (this.currentGunMesh) {
      this.currentGunMesh.position.z = THREE.MathUtils.lerp(this.currentGunMesh.position.z, 0, 10 * dt);
      this.currentGunMesh.rotation.x = THREE.MathUtils.lerp(this.currentGunMesh.rotation.x, 0, 10 * dt);

      // Weapon movement sway
      const speed = Math.sqrt(this.playerVel.x * this.playerVel.x + this.playerVel.z * this.playerVel.z);
      if (speed > 1.0) {
        this.weaponSwayTime += dt * 10;
        this.currentGunMesh.position.x = Math.sin(this.weaponSwayTime) * 0.015;
        this.currentGunMesh.position.y = Math.cos(this.weaponSwayTime * 2) * 0.01;
      } else {
        this.currentGunMesh.position.x = THREE.MathUtils.lerp(this.currentGunMesh.position.x, 0, 5 * dt);
        this.currentGunMesh.position.y = THREE.MathUtils.lerp(this.currentGunMesh.position.y, 0, 5 * dt);
      }
    }
  }

  // Reload Progress Bar Update
  private updateReloadProgress(now: number) {
    if (!this.stats.isReloading) return;

    const weapon = WEAPON_CONFIGS[this.stats.selectedWeaponId];
    const elapsed = now - this.reloadStartTime;
    const progress = Math.min(1.0, elapsed / weapon.reloadTime);
    this.stats.reloadProgress = progress;

    if (progress >= 1.0) {
      // Reload Complete!
      const ammoState = this.stats.ammo[this.stats.selectedWeaponId];
      const needed = weapon.magazineSize - ammoState.clip;
      const transfer = Math.min(needed, ammoState.reserve);

      ammoState.clip += transfer;
      ammoState.reserve -= transfer;

      this.stats.isReloading = false;
      this.stats.reloadProgress = 0;
      this.callbacks.onStatsUpdate({ ...this.stats });
    }
  }

  // AI Enemy Patrol, Pursuit, and Engagement Loop
  private updateEnemyAI(dt: number) {
    const playerPosVector = this.playerPos.clone();
    const diff = this.getDifficultyParams();

    this.enemies.forEach((enemy) => {
      if (enemy.state === 'DEAD') return;

      const meshGroup = this.enemyMeshes.get(enemy.id);
      if (!meshGroup) return;

      const enemyPos = new THREE.Vector3(enemy.position.x, 1.2, enemy.position.z);
      const distToPlayer = enemyPos.distanceTo(playerPosVector);

      // Hit flash visual recovery
      if (enemy.isHitFlashing) {
        enemy.hitFlashTimer -= dt;
        if (enemy.hitFlashTimer <= 0) {
          enemy.isHitFlashing = false;
        }
      }

      // State Machine Transitions
      if (distToPlayer < 22) {
        if (enemy.state === 'PATROL') {
          enemy.state = 'ALERT';
        }
      } else if (distToPlayer > 35) {
        enemy.state = 'PATROL';
      }

      switch (enemy.state) {
        case 'PATROL': {
          // Patrol between waypoints
          const targetWaypoint = enemy.patrolPoints[enemy.patrolIndex];
          const targetVec = new THREE.Vector3(targetWaypoint.x, 1.2, targetWaypoint.z);
          const dir = new THREE.Vector3().subVectors(targetVec, enemyPos);
          dir.y = 0;

          if (dir.length() < 1.0) {
            enemy.patrolIndex = (enemy.patrolIndex + 1) % enemy.patrolPoints.length;
          } else {
            dir.normalize();
            enemyPos.addScaledVector(dir, 4.0 * diff.speedMult * dt); // Active patrol walk speed
            enemy.rotationY = Math.atan2(dir.x, dir.z);
          }
          break;
        }

        case 'ALERT': {
          // Turn toward player and transition to ATTACKING
          const dir = new THREE.Vector3().subVectors(playerPosVector, enemyPos);
          dir.y = 0;
          dir.normalize();
          enemy.rotationY = Math.atan2(dir.x, dir.z);

          enemy.alertLevel += dt * diff.alertSpeed;
          if (enemy.alertLevel >= 1.0) {
            enemy.state = 'ATTACKING';
          }
          break;
        }

        case 'PURSUING':
        case 'ATTACKING': {
          // Face player
          const dir = new THREE.Vector3().subVectors(playerPosVector, enemyPos);
          dir.y = 0;
          const dist = dir.length();
          dir.normalize();
          enemy.rotationY = Math.atan2(dir.x, dir.z);

          // Fast tactical chase or combat strafe
          const baseMoveSpeed =
            enemy.type === 'grunt' ? 7.5 :
            enemy.type === 'heavy' ? 4.2 :
            enemy.type === 'sniper' ? 5.2 : 6.0;

          const moveSpeed = baseMoveSpeed * diff.speedMult;
          const minEngageDist = enemy.type === 'sniper' ? 6.5 : 3.0;

          if (dist > minEngageDist) {
            enemyPos.addScaledVector(dir, moveSpeed * dt);
          } else {
            // Strafe dynamically when in close quarters
            const sideDir = new THREE.Vector3(-dir.z, 0, dir.x);
            const strafeDir = (Math.floor(performance.now() / 1200) % 2 === 0 ? 1 : -1);
            enemyPos.addScaledVector(sideDir, strafeDir * 2.5 * diff.speedMult * dt);
          }

          // Attack Cooldown
          enemy.attackCooldown -= dt;
          if (enemy.attackCooldown <= 0) {
            enemy.attackCooldown = diff.attackCooldownMin + Math.random() * diff.attackCooldownRand;
            this.enemyFireAtPlayer(enemy, enemyPos, playerPosVector);
          }
          break;
        }
      }

      // Resolve Obstacle Collision so enemies do not clip through blocks
      const currentPos = new THREE.Vector3(enemy.position.x, 0, enemy.position.z);
      const safePos = this.resolveEnemyObstacleCollision(currentPos, enemyPos);

      // Update position & rotation on Three.js mesh
      enemy.position.x = safePos.x;
      enemy.position.z = safePos.z;
      meshGroup.position.set(safePos.x, 0, safePos.z);
      meshGroup.rotation.y = enemy.rotationY;
    });
  }

  // Enemy Obstacle Box Collision Resolution
  private resolveEnemyObstacleCollision(currentPos: THREE.Vector3, nextPos: THREE.Vector3, enemyRadius: number = 0.6): THREE.Vector3 {
    if (!this.mapData || !this.mapData.obstacles) return nextPos;

    const enemyBox = new THREE.Box3(
      new THREE.Vector3(nextPos.x - enemyRadius, 0, nextPos.z - enemyRadius),
      new THREE.Vector3(nextPos.x + enemyRadius, 2.0, nextPos.z + enemyRadius)
    );

    let collides = false;
    for (const box of this.mapData.obstacles) {
      if (box.intersectsBox(enemyBox)) {
        collides = true;
        break;
      }
    }

    if (!collides) return nextPos;

    // Try sliding along X
    const slideX = currentPos.clone();
    slideX.x = nextPos.x;
    const boxX = new THREE.Box3(
      new THREE.Vector3(slideX.x - enemyRadius, 0, slideX.z - enemyRadius),
      new THREE.Vector3(slideX.x + enemyRadius, 2.0, slideX.z + enemyRadius)
    );
    if (!this.mapData.obstacles.some((b) => b.intersectsBox(boxX))) {
      return slideX;
    }

    // Try sliding along Z
    const slideZ = currentPos.clone();
    slideZ.z = nextPos.z;
    const boxZ = new THREE.Box3(
      new THREE.Vector3(slideZ.x - enemyRadius, 0, slideZ.z - enemyRadius),
      new THREE.Vector3(slideZ.x + enemyRadius, 2.0, slideZ.z + enemyRadius)
    );
    if (!this.mapData.obstacles.some((b) => b.intersectsBox(boxZ))) {
      return slideZ;
    }

    return currentPos;
  }

  // Enemy Fire Bullet at Player
  private enemyFireAtPlayer(enemy: EnemyData, enemyPos: THREE.Vector3, playerPos: THREE.Vector3) {
    soundEffects.playEnemyGunshot();

    const diff = this.getDifficultyParams();
    let tracerColor = 0xfde047; // Yellow for patrol
    let spreadMult = 1.0;
    let damageMult = 1.0;

    if (enemy.type === 'grunt') {
      tracerColor = 0x22d3ee; // Cyan
      spreadMult = 1.3;
      damageMult = 0.75;
    } else if (enemy.type === 'heavy') {
      tracerColor = 0xf97316; // Orange heavy blast
      spreadMult = 1.1;
      damageMult = 1.6;
    } else if (enemy.type === 'sniper') {
      tracerColor = 0xe879f9; // Violet laser
      spreadMult = 0.35; // Sharp precision!
      damageMult = 2.2;
    }

    const startPos = enemyPos.clone().add(new THREE.Vector3(0, 0.4, 0));
    const effectiveSpread = diff.spread * spreadMult;

    const targetPos = playerPos.clone().add(
      new THREE.Vector3(
        (Math.random() - 0.5) * effectiveSpread,
        (Math.random() - 0.5) * (effectiveSpread * 0.6),
        (Math.random() - 0.5) * effectiveSpread
      )
    );

    // Draw tracer line with tier color
    const geo = new THREE.BufferGeometry().setFromPoints([startPos, targetPos]);
    const mat = new THREE.LineBasicMaterial({ color: tracerColor, transparent: true, opacity: 0.95 });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.bulletTracers.push({ line, age: 0 });

    // Calculate difficulty-based damage on Player
    const baseDamage = diff.minDamage + Math.random() * diff.randDamage;
    const enemyDamage = Math.round(baseDamage * damageMult);
    this.damagePlayer(enemyDamage, startPos);
  }

  // Damage Player Health System
  public damagePlayer(damage: number, sourcePos: THREE.Vector3) {
    soundEffects.playPlayerHurt();

    // Shield absorbs damage first
    if (this.stats.shield > 0) {
      if (this.stats.shield >= damage) {
        this.stats.shield -= damage;
      } else {
        const remaining = damage - this.stats.shield;
        this.stats.shield = 0;
        this.stats.health -= remaining;
      }
    } else {
      this.stats.health -= damage;
    }

    if (this.stats.health <= 0) {
      this.stats.health = 0;
      this.isRunning = false;
      this.callbacks.onGameOver();
    }

    // Direction angle relative to camera view
    const dirToSource = new THREE.Vector3().subVectors(sourcePos, this.playerPos);
    const sourceAngle = Math.atan2(dirToSource.x, dirToSource.z);
    const viewAngle = this.yaw;
    const relAngle = sourceAngle - viewAngle;

    this.callbacks.onDamageTaken(relAngle);
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // BLACKSITE: FALLEN CITY - Immersive Sim Console Interactions
  private handleConsoleInteraction(consoleData: any) {
    const id = consoleData.id;
    const type = consoleData.type;

    soundEffects.playPickup('shield');

    if (type.startsWith('travel_')) {
      const targetDistrict = type.replace('travel_', '') as any;
      this.travelToDistrict(targetDistrict);
      this.callbacks.onKill(`TRAVELLING TO ${targetDistrict.toUpperCase().replace('_', ' ')}...`, false);
    } else if (id === 'gate_transmitter') {
      this.stats.objectiveProgress = 100;
      this.stats.objectiveText = "TRANSMITTER ONLINE. PROCEED TO THE NEON MARKET.";
      this.completeMission('gate_reconnect');
      this.stats.rebelInfluence = Math.min(100, this.stats.rebelInfluence + 25);
      this.callbacks.onKill("MISSION COMPLETE: TRANS-LINK SECURED (+25 REBEL)", false);
    } else if (id === 'neon_grid_hack') {
      this.stats.objectiveProgress = 100;
      this.stats.objectiveText = "GRID OVERRIDDEN. PROCEED TO METRO TRANSIT HUB.";
      this.completeMission('neon_hacks');
      this.stats.heliosControl = Math.max(0, this.stats.heliosControl - 30);
      this.callbacks.onKill("MISSION COMPLETE: SECURITY BYPASSED (-30 HELIOS)", false);
    } else if (id === 'transit_reboot') {
      this.stats.objectiveProgress = 100;
      this.stats.objectiveText = "SUBWAY RUNNING. TRAVEL COMPLETED TO FLOODED OLD CITY.";
      this.completeMission('metro_restart');
      this.stats.metroStatus = 'active';
      this.callbacks.onKill("MISSION COMPLETE: EXPRESS RAIL RUNNING", false);
    } else if (id === 'drain_flood') {
      this.stats.powerGrid = 'unstable';
      const valve = this.mapData.valves?.find((v: any) => v.id === 'floodgate_valve');
      if (valve) {
        valve.drained = true;
        valve.valveMesh.rotation.y += Math.PI / 2;
      }
      this.stats.objectiveProgress = 100;
      this.stats.objectiveText = "SEWER WATER DRAINED. SEEK UNDERCITY PORTAL CORE.";
      this.callbacks.onKill("VALVE OPERATED: WATER LEVEL REDUCED", false);
    } else if (id === 'crane_drop') {
      const containerMesh = this.scene.getObjectByName('droppable_cargo');
      if (containerMesh) {
        containerMesh.position.y = 0.5; // Smacked down!
        const containerPos = containerMesh.position;
        this.enemies.forEach(enemy => {
          const enemyPos = new THREE.Vector3(enemy.position.x, enemy.position.y, enemy.position.z);
          if (enemyPos.distanceTo(containerPos) < 6.0) {
            enemy.health = 0;
            enemy.state = 'DEAD';
            this.stats.kills++;
            this.callbacks.onKill(`CRANE DRIPPED! Cargo crushed ${enemy.name}`, false);
          }
        });
      }
      this.callbacks.onKill("CRANE CONTROL TRIPPED: CARGO BOX DROPPED", false);
    } else if (id === 'spire_terminal') {
      this.isRunning = false;
      this.stats.health = 99999; // Win indicator code
      this.stats.objectiveText = "HELIOS TERMINATED. VEYRA CITY LIBERATED.";
      this.callbacks.onGameOver();
    } else if (id === 'undercity_core') {
      this.stats.powerGrid = 'offline';
      this.callbacks.onKill("WORLD COLLAPSE EVENT: CITYWIDE BLACKOUT", false);
    } else if (id === 'view_tactical_map') {
      this.stats.workbenchActive = !this.stats.workbenchActive;
      this.callbacks.onKill("TACTICAL COMPUTER LOGGED", false);
    }

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  public travelToDistrict(districtId: any) {
    soundEffects.playPickup('shield');

    if (this.mapData && this.mapData.pointLamps) {
      this.mapData.pointLamps.forEach((lamp) => this.scene.remove(lamp));
    }
    this.mapData.obstacleMeshes.forEach((mesh) => this.scene.remove(mesh));
    if (this.mapData.particles) {
      this.scene.remove(this.mapData.particles);
    }

    if (this.mapData.interactiveConsoles) {
      this.mapData.interactiveConsoles.forEach((c: any) => this.scene.remove(c.mesh));
    }
    if (this.mapData.trains) {
      this.mapData.trains.forEach((t: any) => this.scene.remove(t.trainGroup));
    }
    if (this.mapData.elevators) {
      this.mapData.elevators.forEach((e: any) => this.scene.remove(e.elevatorGroup));
    }
    if (this.mapData.valves) {
      this.mapData.valves.forEach((v: any) => this.scene.remove(v.valveMesh));
    }

    this.stats.activeDistrict = districtId;
    this.stats.biome = districtId === 'undercity' ? 'bio' : districtId === 'flooded_city' ? 'frozen' : 'neon';

    // Transition state
    if (districtId === 'collapsed_gate') {
      this.stats.weatherState = 'rain';
      this.stats.timeOfNight = 'Dusk';
    } else if (districtId === 'neon_market') {
      this.stats.weatherState = 'clear';
      this.stats.timeOfNight = 'Twilight';
    } else if (districtId === 'transit_hub') {
      this.stats.weatherState = 'clear';
      this.stats.timeOfNight = 'Midnight';
    } else if (districtId === 'flooded_city') {
      this.stats.weatherState = 'storm';
      this.stats.timeOfNight = 'Storm';
    } else if (districtId === 'industrial_spine') {
      this.stats.weatherState = 'clear';
      this.stats.timeOfNight = 'Midnight';
    } else if (districtId === 'corporate_skyline') {
      this.stats.weatherState = 'clear';
      this.stats.timeOfNight = 'Dawn';
    } else if (districtId === 'undercity') {
      this.stats.weatherState = 'acid-rain';
      this.stats.timeOfNight = 'Blackout';
    } else {
      this.stats.weatherState = 'clear';
      this.stats.timeOfNight = 'Dusk';
    }

    this.mapData = buildFPSMap(this.scene, districtId);
    this.initPickups();
    this.playerPos.set(this.mapData.playerSpawn.x, this.mapData.playerSpawn.y, this.mapData.playerSpawn.z);

    this.enemies.forEach((enemy) => {
      const mesh = this.enemyMeshes.get(enemy.id);
      if (mesh) this.scene.remove(mesh);
    });
    this.enemies = [];
    this.enemyMeshes.clear();

    this.activeRagdolls.forEach((r) => {
      this.scene.remove(r.meshGroup);
      if (r.gunMesh) this.scene.remove(r.gunMesh);
    });
    this.activeRagdolls = [];

    this.spawnDistrictEnemies(districtId);

    if (districtId === 'safehouse') {
      this.stats.objectiveText = "OPERATIONS SHELTER. LOG TACTICAL DISPLAY COMPUTER (PRESS E) TO VIEW WORLD STATUS.";
    } else {
      const currentMission = this.stats.activeMissions.find(m => m.district === districtId && m.status === 'active');
      if (currentMission) {
        this.stats.objectiveText = `${currentMission.name.toUpperCase()}: ${currentMission.desc.toUpperCase()} (INTERACT CONSOLE TO COMPLETE)`;
      } else {
        this.stats.objectiveText = "EXPLORE VEYRA CITY DISTRICTS. SEEK HELIOS SPIRE TO REBOOT NETWORK CORE.";
      }
    }

    this.stats.objectiveProgress = 0;
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private completeMission(id: string) {
    const m = this.stats.activeMissions.find(x => x.id === id);
    if (m) {
      m.status = 'completed';
    }
  }

  private spawnDistrictEnemies(districtId: string) {
    if (districtId === 'safehouse') return;

    const numEnemies = districtId === 'corporate_skyline' ? 5 : 3;
    for (let i = 0; i < numEnemies; i++) {
      const id = `guard_${Math.random()}`;
      const type = i === 0 ? 'heavy' : 'patrol';
      const name = `Helios Sentry #${Math.floor(Math.random() * 90 + 10)}`;

      const enemy: EnemyData = {
        id,
        type: type as any,
        name,
        health: type === 'heavy' ? 140 : 80,
        maxHealth: type === 'heavy' ? 140 : 80,
        position: { x: (Math.random() - 0.5) * 30, y: 1.2, z: (Math.random() - 0.5) * 30 - 5 },
        rotationY: Math.random() * Math.PI * 2,
        patrolPoints: this.mapData.enemyPatrolRoutes[i % this.mapData.enemyPatrolRoutes.length] || [{ x: 0, y: 1.2, z: 0 }],
        patrolIndex: 0,
        state: 'PATROL',
        isHitFlashing: false,
        hitFlashTimer: 0,
        attackCooldown: 0,
        alertLevel: 0,
      };

      this.enemies.push(enemy);
      this.createEnemy3DMesh(enemy);
    }
  }

  // Update loop moving carriages, elevators and precipitation
  private updateCampaignSystems(dt: number) {
    if (this.mapData) {
      if (this.mapData.trains) {
        this.mapData.trains.forEach((t: any) => {
          t.positionX += dt * 9.0 * t.direction;
          if (Math.abs(t.positionX) > t.trackLength / 2) {
            t.direction *= -1;
          }
          t.trainGroup.position.z = t.positionX;
        });
      }

      if (this.mapData.elevators) {
        this.mapData.elevators.forEach((e: any) => {
          if (e.direction === 1) {
            e.elevatorGroup.position.y += dt * 3.0;
            if (e.elevatorGroup.position.y >= e.maxY) {
              e.elevatorGroup.position.y = e.maxY;
              e.direction = 0;
            }
          } else if (e.direction === -1) {
            e.elevatorGroup.position.y -= dt * 3.0;
            if (e.elevatorGroup.position.y <= e.minY) {
              e.elevatorGroup.position.y = e.minY;
              e.direction = 0;
            }
          } else {
            if (Math.random() < 0.003) {
              e.direction = e.elevatorGroup.position.y <= e.minY ? 1 : -1;
            }
          }
        });
      }

      if (this.mapData.particles) {
        const posAttr = this.mapData.particles.geometry.attributes.position as THREE.BufferAttribute;
        if (posAttr) {
          for (let i = 1; i < posAttr.array.length; i += 3) {
            posAttr.array[i] -= dt * (this.stats.weatherState === 'storm' ? 14.0 : 7.0);
            if (posAttr.array[i] < 0) {
              posAttr.array[i] = 20.0;
            }
          }
          posAttr.needsUpdate = true;
        }
      }
    }
  }

  // Pickups Proximity Check
  private updatePickups(dt: number) {
    const playerVec = this.playerPos.clone();

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];

      if (!pickup.active) {
        if (pickup.isDropped) {
          const mesh = this.pickupMeshes.get(pickup.id);
          if (mesh) {
            this.scene.remove(mesh);
            this.pickupMeshes.delete(pickup.id);
          }
          this.pickups.splice(i, 1);
        }
        continue;
      }

      const mesh = this.pickupMeshes.get(pickup.id);
      if (!mesh) continue;

      // Handle Decaying Lifetime for Dropped Items
      if (pickup.isDropped && pickup.lifetimeRemaining !== undefined) {
        pickup.lifetimeRemaining -= dt;

        if (pickup.lifetimeRemaining <= 0) {
          pickup.active = false;
          this.scene.remove(mesh);
          this.pickupMeshes.delete(pickup.id);
          this.pickups.splice(i, 1);
          continue;
        }

        // Blinking Effect when decay is imminent (< 4.5 seconds left)
        if (pickup.lifetimeRemaining < 4.5) {
          const freq = pickup.lifetimeRemaining < 1.5 ? 20.0 : 10.0;
          mesh.visible = Math.floor(pickup.lifetimeRemaining * freq) % 2 === 0;
        } else {
          mesh.visible = true;
        }

        // Rotates faster when about to decay
        const speedMult = pickup.lifetimeRemaining < 4.5 ? 4.0 : 1.0;
        pickup.rotation += dt * 2.0 * speedMult;
      } else {
        pickup.rotation += dt * 2.0;
      }

      // Rotate and float
      const innerItem = mesh.getObjectByName('inner_item');
      if (innerItem) {
        innerItem.rotation.y = pickup.rotation;
        innerItem.rotation.x = pickup.rotation * 0.5;
        innerItem.position.y = Math.sin(pickup.rotation * 1.5) * 0.15;
      } else {
        mesh.rotation.y = pickup.rotation;
        mesh.position.y = pickup.position.y + Math.sin(pickup.rotation * 1.5) * 0.15;
      }

      // Distance check to player
      const pickupVec = new THREE.Vector3(pickup.position.x, pickup.position.y, pickup.position.z);
      if (playerVec.distanceTo(pickupVec) < 2.0) {
        // Collect Pickup!
        pickup.active = false;
        mesh.visible = false;
        soundEffects.playPickup(pickup.type);

        this.applyPickupBenefit(pickup.type);

        if (pickup.isDropped) {
          this.scene.remove(mesh);
          this.pickupMeshes.delete(pickup.id);
          this.pickups.splice(i, 1);
        } else {
          // Respawn regular pickup after 15s
          const pId = pickup.id;
          setTimeout(() => {
            const p = this.pickups.find((x) => x.id === pId);
            const m = this.pickupMeshes.get(pId);
            if (p && m) {
              p.active = true;
              m.visible = true;
            }
          }, 15000);
        }
      }
    }
  }

  private applyPickupBenefit(type: PickupType) {
    if (type === 'health') {
      this.stats.health = Math.min(this.stats.maxHealth, this.stats.health + 40);
      this.callbacks.onKill(`RECOVERED TACTICAL STIM (+40 HEALTH)`, false);
    } else if (type === 'shield') {
      this.stats.shield = Math.min(this.stats.maxShield, this.stats.shield + 25);
      this.callbacks.onKill(`CHARGED TACTICAL SHIELD (+25 SHIELD)`, false);
    } else if (type === 'grenade') {
      this.stats.grenades = Math.min(5, this.stats.grenades + 1);
      this.callbacks.onKill(`TACTICAL GRENADE RECOVERED (+1 GRENADE)`, false);
    } else if (type === 'anomaly_core') {
      const coreGain = Math.floor(Math.random() * 2) + 2; // Drops 2 or 3 cores
      this.stats.anomalyCores += coreGain;
      this.callbacks.onKill(`+${coreGain} ANOMALY CORES SECURED`, false);
    } else if (type.startsWith('ammo_')) {
      const weaponKey = type.replace('ammo_', '') as WeaponId;
      if (this.stats.ammo[weaponKey]) {
        const config = WEAPON_CONFIGS[weaponKey];
        this.stats.ammo[weaponKey].reserve = Math.min(
          config.maxReserveAmmo,
          this.stats.ammo[weaponKey].reserve + config.magazineSize * 2
        );
        this.callbacks.onKill(`RELOADED ${weaponKey.toUpperCase()} TACTICAL AMMO`, false);
      }
    }
    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  // Update Tracer Lines & Particles
  private updateVisualEffects(dt: number) {
    // Tracers
    for (let i = this.bulletTracers.length - 1; i >= 0; i--) {
      const t = this.bulletTracers[i];
      t.age += dt;
      if (t.age > 0.08) {
        this.scene.remove(t.line);
        this.bulletTracers.splice(i, 1);
      }
    }

    // Spark Particles
    for (let i = this.particleEffects.length - 1; i >= 0; i--) {
      const p = this.particleEffects[i];
      p.age += dt;
      if (p.age >= p.maxAge) {
        this.scene.remove(p.mesh);
        this.particleEffects.splice(i, 1);
      } else {
        const posAttr = p.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let j = 0; j < p.vel.length; j++) {
          posAttr.setXYZ(
            j,
            posAttr.getX(j) + p.vel[j].x * dt,
            posAttr.getY(j) + p.vel[j].y * dt,
            posAttr.getZ(j) + p.vel[j].z * dt
          );
        }
        posAttr.needsUpdate = true;
      }
    }
  }

  // Trigger procedural physical ragdoll for defeated enemies
  private triggerRagdoll(meshGroup: THREE.Group, enemy: EnemyData, isHeadshot: boolean) {
    // 1. Calculate impact direction from player to enemy
    const playerDirection = new THREE.Vector3()
      .copy(meshGroup.position)
      .sub(this.playerPos)
      .setY(0)
      .normalize();

    // Make the body recoil backward and pop upward
    const recoilSpeed = isHeadshot ? 11.0 : 7.0;
    const velocity = playerDirection.clone().multiplyScalar(recoilSpeed);
    velocity.y = 3.5 + Math.random() * 2.5; // Pop up in the air!

    // Random rotation spin
    const angularVelocity = new THREE.Vector3(
      (Math.random() - 0.5) * 5.0,
      (Math.random() - 0.5) * 2.0,
      (Math.random() - 0.5) * 5.0
    );

    // Get individual sub-limbs by name for joint crumpling
    const torso = meshGroup.getObjectByName('torso');
    const head = meshGroup.getObjectByName('head');
    const leftArm = meshGroup.getObjectByName('leftArm');
    const rightArm = meshGroup.getObjectByName('rightArm');
    const leftLeg = meshGroup.getObjectByName('leftLeg');
    const rightLeg = meshGroup.getObjectByName('rightLeg');
    const leftPad = meshGroup.getObjectByName('leftPad');
    const rightPad = meshGroup.getObjectByName('rightPad');
    const antenna = meshGroup.getObjectByName('antenna');
    const scope = meshGroup.getObjectByName('scope');

    // Detach the gun mesh to let it fly and spin independently!
    const gunMesh = meshGroup.getObjectByName('gun');
    let detGunMesh: THREE.Object3D | undefined = undefined;
    let gunVel: THREE.Vector3 | undefined = undefined;
    let gunAngVel: THREE.Vector3 | undefined = undefined;

    if (gunMesh) {
      const gunWorldPos = new THREE.Vector3();
      const gunWorldQuat = new THREE.Quaternion();
      gunMesh.getWorldPosition(gunWorldPos);
      gunMesh.getWorldQuaternion(gunWorldQuat);

      // Remove from character group and attach directly to world scene
      meshGroup.remove(gunMesh);
      this.scene.add(gunMesh);

      gunMesh.position.copy(gunWorldPos);
      gunMesh.quaternion.copy(gunWorldQuat);
      detGunMesh = gunMesh;

      // Toss gun with high energy
      gunVel = playerDirection.clone().multiplyScalar(recoilSpeed * 1.3);
      gunVel.y = 5.0 + Math.random() * 3.0;
      gunVel.x += (Math.random() - 0.5) * 3.0;
      gunVel.z += (Math.random() - 0.5) * 3.0;

      gunAngVel = new THREE.Vector3(
        (Math.random() - 0.5) * 15.0,
        (Math.random() - 0.5) * 15.0,
        (Math.random() - 0.5) * 15.0
      );
    }

    this.activeRagdolls.push({
      meshGroup,
      velocity,
      angularVelocity,
      age: 0,
      maxAge: 4.5, // 4.5 seconds lifecycle
      groundY: 0.1,

      torso,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      leftPad,
      rightPad,
      antenna,
      scope,

      gunMesh: detGunMesh,
      gunVelocity: gunVel,
      gunAngularVelocity: gunAngVel,
      gunOnGround: false,
    });
  }

  // Update physical positions, collisions, limb foldings, and gun trajectories
  private updateRagdolls(dt: number) {
    for (let i = this.activeRagdolls.length - 1; i >= 0; i--) {
      const r = this.activeRagdolls[i];
      r.age += dt;

      // Cleanup expired ragdolls
      if (r.age >= r.maxAge) {
        this.scene.remove(r.meshGroup);
        if (r.gunMesh) {
          this.scene.remove(r.gunMesh);
        }
        this.activeRagdolls.splice(i, 1);
        continue;
      }

      // 1. Overall Body Movement & Friction
      if (r.meshGroup.position.y > r.groundY) {
        r.velocity.y -= 9.8 * dt; // gravity
        r.meshGroup.position.addScaledVector(r.velocity, dt);

        // Spin group in air
        r.meshGroup.rotation.x += r.angularVelocity.x * dt;
        r.meshGroup.rotation.y += r.angularVelocity.y * dt;
        r.meshGroup.rotation.z += r.angularVelocity.z * dt;
      } else {
        // Clamp to floor
        r.meshGroup.position.y = r.groundY;

        // Bounce
        if (r.velocity.y < -1.5) {
          r.velocity.y = -r.velocity.y * 0.25;
        } else {
          r.velocity.y = 0;
        }

        // Horizontal friction
        r.velocity.x *= Math.max(0, 1 - 7 * dt);
        r.velocity.z *= Math.max(0, 1 - 7 * dt);
        r.meshGroup.position.x += r.velocity.x * dt;
        r.meshGroup.position.z += r.velocity.z * dt;

        // Settle flat on the floor (pitch/roll towards horizontal)
        const targetRotX = Math.PI / 2;
        r.meshGroup.rotation.x += (targetRotX - r.meshGroup.rotation.x) * dt * 4.5;
        r.angularVelocity.multiplyScalar(Math.max(0, 1 - 10 * dt));
        r.meshGroup.rotation.y += r.angularVelocity.y * dt;
      }

      // 2. Procedural Crumple / Limb Joint Collapses (Ragdoll behavior)
      const age = r.age;
      // Floppy arms
      if (r.leftArm) {
        r.leftArm.rotation.z += (Math.sin(age * 9) * 0.25 - 0.7 - r.leftArm.rotation.z) * dt * 4;
        r.leftArm.rotation.x += (Math.PI / 3 - r.leftArm.rotation.x) * dt * 4;
      }
      if (r.rightArm) {
        r.rightArm.rotation.z += (-Math.sin(age * 9) * 0.25 + 0.7 - r.rightArm.rotation.z) * dt * 4;
        r.rightArm.rotation.x += (Math.PI / 3 - r.rightArm.rotation.x) * dt * 4;
      }
      // Tilting head
      if (r.head) {
        r.head.rotation.x += (Math.PI / 4 - r.head.rotation.x) * dt * 3.5;
        r.head.rotation.z += (Math.cos(age * 6) * 0.2 - r.head.rotation.z) * dt * 3.5;
      }
      // Buckling knees / split legs
      if (r.leftLeg) {
        r.leftLeg.rotation.x += (-Math.PI / 3 - r.leftLeg.rotation.x) * dt * 5;
        r.leftLeg.rotation.z += (-Math.PI / 6 - r.leftLeg.rotation.z) * dt * 5;
      }
      if (r.rightLeg) {
        r.rightLeg.rotation.x += (-Math.PI / 3 - r.rightLeg.rotation.x) * dt * 5;
        r.rightLeg.rotation.z += (Math.PI / 6 - r.rightLeg.rotation.z) * dt * 5;
      }

      // 3. Independent Gun Simulation
      if (r.gunMesh && !r.gunOnGround) {
        r.gunVelocity!.y -= 9.8 * dt; // gravity
        r.gunMesh.position.addScaledVector(r.gunVelocity!, dt);

        r.gunMesh.rotation.x += r.gunAngularVelocity!.x * dt;
        r.gunMesh.rotation.y += r.gunAngularVelocity!.y * dt;
        r.gunMesh.rotation.z += r.gunAngularVelocity!.z * dt;

        // Ground check for weapon
        if (r.gunMesh.position.y <= 0.05) {
          r.gunMesh.position.y = 0.05;
          if (r.gunVelocity!.y < -1.0) {
            r.gunVelocity!.y = -r.gunVelocity!.y * 0.35; // bounce
            r.gunAngularVelocity!.multiplyScalar(0.5);
          } else {
            r.gunVelocity!.set(0, 0, 0);
            r.gunAngularVelocity!.set(0, 0, 0);
            r.gunOnGround = true;
            r.gunMesh.rotation.set(Math.PI / 2, 0, Math.random() * Math.PI * 2);
          }
          r.gunVelocity!.x *= Math.max(0, 1 - 5 * dt);
          r.gunVelocity!.z *= Math.max(0, 1 - 5 * dt);
        }
      }

      // 4. Fade to nothing in final second of life
      const remainingTime = r.maxAge - r.age;
      if (remainingTime < 1.0) {
        const opacity = Math.max(0, remainingTime);
        r.meshGroup.traverse((child) => {
          if ((child as any).isMesh) {
            const mat = (child as any).material;
            if (mat) {
              mat.transparent = true;
              mat.opacity = opacity;
            }
          }
        });
        if (r.gunMesh) {
          r.gunMesh.traverse((child) => {
            if ((child as any).isMesh) {
              const mat = (child as any).material;
              if (mat) {
                mat.transparent = true;
                mat.opacity = opacity;
              }
            }
          });
        }
      }
    }
  }

  private onWindowResize = () => {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  };

  public loadBiome(biomeName: 'neon' | 'bio' | 'frozen') {
    // Remove previous biome elements from the scene
    if (this.mapData) {
      this.scene.remove(this.mapData.ambientLight);
      this.scene.remove(this.mapData.sunLight);
      this.mapData.pointLamps.forEach((lamp) => this.scene.remove(lamp));
      this.mapData.obstacleMeshes.forEach((mesh) => this.scene.remove(mesh));
      if (this.mapData.particles) this.scene.remove(this.mapData.particles);
    }

    // Clean up interactive meshes from scene
    if (this.keycardMesh) this.scene.remove(this.keycardMesh);
    if (this.jammerMesh) this.scene.remove(this.jammerMesh);
    if (this.extractionZoneMesh) this.scene.remove(this.extractionZoneMesh);
    if (this.centralConsoleMesh) this.scene.remove(this.centralConsoleMesh);
    if (this.lockdownConsoleMesh) this.scene.remove(this.lockdownConsoleMesh);
    if (this.overrideConsoleMesh) this.scene.remove(this.overrideConsoleMesh);

    // Remove any hologram objects added in stage setup
    this.scene.traverse((child) => {
      if (child.name && (child.name.startsWith('holo') || child.name.startsWith('portal_'))) {
        this.scene.remove(child);
      }
    });

    // Remove portals
    this.removePortals();

    // Set biome state
    this.stats.biome = biomeName;

    // Rebuild map for the new biome!
    this.mapData = buildFPSMap(this.scene, biomeName);

    // Re-initialize Pickups
    this.initPickups();

    // Reposition player to the spawn point
    this.playerPos.set(this.mapData.playerSpawn.x, this.mapData.playerSpawn.y, this.mapData.playerSpawn.z);

    // Clean up current enemies
    this.enemies.forEach((enemy) => {
      const mesh = this.enemyMeshes.get(enemy.id);
      if (mesh) this.scene.remove(mesh);
    });
    this.enemies = [];
    this.enemyMeshes.clear();

    this.activeRagdolls.forEach((r) => {
      this.scene.remove(r.meshGroup);
      if (r.gunMesh) this.scene.remove(r.gunMesh);
    });
    this.activeRagdolls = [];

    // Spawn current stage consoles
    this.rebuildStageConsoles();

    // Spawn a gorgeous workbench mesh for the fusion lab
    this.spawnWorkbenchMesh();

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  private rebuildStageConsoles() {
    const termGeo = new THREE.BoxGeometry(0.6, 1.0, 0.6);
    const termMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.9, roughness: 0.1 });
    const hologMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, transparent: true, opacity: 0.45, wireframe: true });
    const hologRingGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16);

    if (this.stage === 1) {
      this.centralConsoleMesh = new THREE.Mesh(termGeo, termMat);
      this.centralConsoleMesh.position.set(0, 0.5, -10);
      this.scene.add(this.centralConsoleMesh);
      const holo1 = new THREE.Mesh(hologRingGeo, hologMat);
      holo1.position.set(0, 1.1, -10);
      holo1.name = 'holo1';
      this.scene.add(holo1);
    } else if (this.stage === 2) {
      this.lockdownConsoleMesh = new THREE.Mesh(termGeo, termMat);
      this.lockdownConsoleMesh.position.set(0, 0.5, -32);
      this.scene.add(this.lockdownConsoleMesh);
      const holo2 = new THREE.Mesh(hologRingGeo, new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.45, wireframe: true }));
      holo2.position.set(0, 1.1, -32);
      holo2.name = 'holo2';
      this.scene.add(holo2);
    } else if (this.stage === 4) {
      this.overrideConsoleMesh = new THREE.Mesh(termGeo, termMat);
      this.overrideConsoleMesh.position.set(10, 0.5, -10);
      this.scene.add(this.overrideConsoleMesh);
      const holo3 = new THREE.Mesh(hologRingGeo, new THREE.MeshBasicMaterial({ color: 0xeab308, transparent: true, opacity: 0.4, wireframe: true }));
      holo3.position.set(10, 1.1, -10);
      holo3.name = 'holo3';
      this.scene.add(holo3);
    }
  }

  public handlePortalActivation(portalId: string) {
    if (portalId === 'extraction') {
      this.isRunning = false;
      this.stats.health = 99999; // code for victory UI
      this.callbacks.onGameOver();
      return;
    }

    soundEffects.playPickup('shield');

    // Advance Stage
    this.stats.runStage += 1;

    // Roll random biome
    const biomes: ('neon' | 'bio' | 'frozen')[] = ['neon', 'bio', 'frozen'];
    let nextBiome = biomes[Math.floor(Math.random() * biomes.length)];
    if (nextBiome === this.stats.biome) {
      nextBiome = biomes[(biomes.indexOf(nextBiome) + 1) % biomes.length];
    }

    // Apply Portal Modifiers
    if (portalId === 'hazard') {
      this.stats.anomalyCores += 12;
      this.stats.score += 500;
      this.triggerWorldShift();
    } else if (portalId === 'unknown') {
      this.stats.anomalyCores += 18;
      this.triggerWorldShift();
    } else {
      this.stats.anomalyCores += 5;
    }

    // Advance existing stage objective progression
    if (this.stage === 1) {
      this.stage = 2;
      this.stats.stage = 2;
      this.objectiveProgress = 0;
      this.stats.objectiveProgress = 0;
      this.objectiveText = 'RECOVER ENEMY SECURITY KEYCARD (FLUX COUPLER YARD)';
      this.stats.objectiveText = this.objectiveText;
      this.activeObjectiveCoords.set(15, 0, 15);

      const cardGeo = new THREE.BoxGeometry(0.2, 0.02, 0.35);
      const cardMat = new THREE.MeshStandardMaterial({
        color: 0x06b6d4,
        emissive: 0x06b6d4,
        emissiveIntensity: 0.6,
      });
      this.keycardMesh = new THREE.Mesh(cardGeo, cardMat);
      this.keycardMesh.position.set(15, 0.5, 15);
      this.scene.add(this.keycardMesh);
    } else if (this.stage === 2) {
      this.stage = 3;
      this.stats.stage = 3;
      this.objectiveProgress = 0;
      this.stats.objectiveProgress = 0;
      this.objectiveText = 'DESTROY THE AUXILIARY COMM JAMMER (ANTENNA ON ROOF)';
      this.stats.objectiveText = this.objectiveText;
      this.activeObjectiveCoords.set(-12, 4, -12);

      const jammerGroup = new THREE.Group();
      const towerGeo = new THREE.CylinderGeometry(0.2, 0.4, 3.5, 8);
      const towerMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.9 });
      const tower = new THREE.Mesh(towerGeo, towerMat);
      tower.position.y = 1.75;
      jammerGroup.add(tower);

      const dishGeo = new THREE.SphereGeometry(0.6, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2);
      const dish = new THREE.Mesh(dishGeo, towerMat);
      dish.position.set(0, 3.3, 0);
      dish.rotation.x = Math.PI / 4;
      jammerGroup.add(dish);

      const coreGeo = new THREE.SphereGeometry(0.2, 16, 16);
      const coreMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 0.8 });
      const core = new THREE.Mesh(coreGeo, coreMat);
      core.position.set(0, 3.3, 0);
      core.name = 'jammer_core';
      jammerGroup.add(core);

      jammerGroup.position.set(-12, 2.8, -12);
      this.scene.add(jammerGroup);
      this.jammerMesh = jammerGroup;
      this.jammerHealth = 150;
    } else if (this.stage === 3) {
      this.stage = 4;
      this.stats.stage = 4;
      this.objectiveProgress = 0;
      this.stats.objectiveProgress = 0;
      this.objectiveText = 'INITIATE SECURITY OVERRIDE TERMINAL (PRESS E)';
      this.stats.objectiveText = this.objectiveText;
      this.activeObjectiveCoords.set(10, 0, -10);
    } else if (this.stage === 4) {
      this.stage = 5;
      this.stats.stage = 5;
      this.objectiveProgress = 0;
      this.stats.objectiveProgress = 0;
      this.objectiveText = 'PURGE THE BIOMECHANICAL WARDEN ORBITAL BOSS!';
      this.stats.objectiveText = this.objectiveText;
      this.activeObjectiveCoords.set(0, 0, 0);
      this.spawnWardenBoss();
    } else {
      // Loop or restart mechanics
      this.stage = 1;
      this.stats.stage = 1;
      this.objectiveProgress = 0;
      this.stats.objectiveProgress = 0;
      this.objectiveText = 'RESTORE POWER AT CENTRAL GENERATOR (PRESS E AT CONSOLE)';
      this.stats.objectiveText = this.objectiveText;
      this.activeObjectiveCoords.set(0, 0, -10);
    }

    // Load new biome layout
    this.loadBiome(nextBiome);

    this.callbacks.onStatsUpdate({ ...this.stats });
  }

  public start() {
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.update();
  }

  public pause() {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  public restart() {
    this.stats = {
      health: 100,
      maxHealth: 100,
      shield: 50,
      maxShield: 50,
      score: 0,
      kills: 0,
      headshots: 0,
      wave: 1,
      selectedWeaponId: 'pistol',
      ammo: {
        pistol: { clip: 12, reserve: 72 },
        rifle: { clip: 30, reserve: 180 },
        shotgun: { clip: 8, reserve: 32 },
        launcher: { clip: 3, reserve: 9 },
        sniper: { clip: 5, reserve: 15 },
      },
      isReloading: false,
      reloadProgress: 0,
      grenades: 3,
      empCooldown: 0,
      empCooldownSeconds: 0,
      stage: 1,
      objectiveProgress: 0,
      objectiveText: 'RESTORE POWER AT CENTRAL GENERATOR (PRESS E AT CONSOLE)',
      isSprinting: false,
      isCrouching: false,
      isSliding: false,
      isADS: false,
      slideTimer: 0,
      activeUpgrades: [],
      
      // Eclipse Protocol State
      biome: 'neon',
      weaponElements: {
        pistol: 'none',
        rifle: 'none',
        shotgun: 'none',
        launcher: 'none',
        sniper: 'none',
      },
      weaponBehaviors: {
        pistol: 'none',
        rifle: 'none',
        shotgun: 'none',
        launcher: 'none',
        sniper: 'none',
      },
      activePortals: [],
      hunterActive: false,
      hunterAdaptation: '',
      worldShiftName: '',
      worldShiftTimeRemaining: 0,
      anomalyCores: 0,
      runStage: 1,
      extractionActive: false,
      workbenchActive: false,
      activeDistrict: 'collapsed_gate',
      powerGrid: 'online',
      metroStatus: 'active',
      securityLevel: 1,
      civilianSafety: 100,
      heliosControl: 100,
      rebelInfluence: 0,
      militaryInfluence: 0,
      weatherState: 'clear',
      timeOfNight: 'Dusk',
      flashlightActive: false,
      nightVisionActive: false,
      activeMissions: [
        { id: 'gate_reconnect', name: 'Establish Link', desc: 'Find the transmitter in Collapsed Gate and reboot it.', status: 'active', district: 'collapsed_gate' },
        { id: 'neon_hacks', name: 'Breach Market Grid', desc: 'Infiltrate Neon Market and override HELIOS sensors.', status: 'active', district: 'neon_market' },
        { id: 'metro_restart', name: 'Reboot Transit Rail', desc: 'Secure the central station and start the automated express train.', status: 'active', district: 'transit_hub' },
      ],
    };

    // Clean up projectile meshes
    this.rocketProjectiles.forEach((r) => this.scene.remove(r.mesh));
    this.rocketProjectiles = [];
    this.grenadeProjectiles.forEach((g) => this.scene.remove(g.mesh));
    this.grenadeProjectiles = [];

    // Reset stages
    this.stage = 1;
    this.grenades = 3;
    this.empCooldownSeconds = 0;
    this.objectiveProgress = 0;
    this.objectiveText = 'RESTORE POWER AT CENTRAL GENERATOR (PRESS E AT CONSOLE)';
    this.activeObjectiveCoords.set(0, 0, -10);
    this.keycardAcquired = false;
    this.overrideActive = false;
    this.bossSpawned = false;
    this.extractionActive = false;
    this.activeUpgrades = [];

    if (this.keycardMesh) {
      this.scene.remove(this.keycardMesh);
      this.keycardMesh = null;
    }
    if (this.jammerMesh) {
      this.scene.remove(this.jammerMesh);
      this.jammerMesh = null;
    }
    if (this.extractionZoneMesh) {
      this.scene.remove(this.extractionZoneMesh);
      this.extractionZoneMesh = null;
    }

    // Remove active enemies
    this.enemies.forEach((enemy) => {
      const mesh = this.enemyMeshes.get(enemy.id);
      if (mesh) {
        this.scene.remove(mesh);
      }
    });
    this.enemies = [];
    this.enemyMeshes.clear();

    this.activeRagdolls.forEach((r) => {
      this.scene.remove(r.meshGroup);
      if (r.gunMesh) this.scene.remove(r.gunMesh);
    });
    this.activeRagdolls = [];

    this.playerPos.set(this.mapData.playerSpawn.x, this.mapData.playerSpawn.y, this.mapData.playerSpawn.z);
    this.yaw = 0;
    this.pitch = 0;
    this.startWave(1);
    this.start();
  }

  public dispose() {
    this.pause();
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer.dispose();
  }
}
