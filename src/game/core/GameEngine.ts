import * as THREE from 'three';
import { PlayerHealth } from '../player/PlayerHealth';
import { PlayerInventory } from '../player/PlayerInventory';
import { PlayerController } from '../player/PlayerController';
import { WorldGenerator, OperationWorld, BiomeType } from '../world/WorldGenerator';
import { EnemyManager } from '../ai/EnemyManager';
import { EnemyAgent } from '../ai/EnemyAgent';
import { CommandSupportSystem, ActiveBeacon, SUPPORT_CATALOG, Direction } from '../support/CommandSupportSystem';
import { ObjectiveManager } from '../missions/ObjectiveManager';
import { ExtractionManager } from '../missions/ExtractionManager';
import { ProjectileSystem, PhysicalProjectile } from '../weapons/ProjectileSystem';
import { AssetLoader } from '../assets/AssetLoader';
import { AudioManager } from '../audio/AudioManager';
import { GameClock } from './GameClock';
import { GameLoop } from './GameLoop';

export interface EngineCallbacks {
  onStatsUpdate: (stats: any) => void;
  onHitMarker: (hit: any) => void;
  onKill: (name: string, isHeadshot: boolean) => void;
  onDamage: (angle: number) => void;
  onMessage: (message: string) => void;
  onReady: () => void;
  onGameOver: () => void;
  onOperationSuccess: (report: OperationReport) => void;
}

export interface OperationReport { kills: number; samples: number; optionalComplete: boolean; resourcesExtracted: number; timeSeconds: number; }
interface TimedEffect { object: THREE.Object3D; age: number; duration: number; update?: (t: number, dt: number) => void; complete?: () => void; }
interface Sentry { group: THREE.Group; position: THREE.Vector3; cooldown: number; life: number; }

export class GameEngine {
  private container: HTMLElement;
  private scene = new THREE.Scene();
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  public health = new PlayerHealth();
  public inventory = new PlayerInventory();
  public player = new PlayerController(this.health, this.inventory);
  public world!: OperationWorld;
  public enemyManager = new EnemyManager();
  public supportSystem = new CommandSupportSystem();
  public objectiveManager = new ObjectiveManager();
  public extractionManager = new ExtractionManager();
  public projectileSystem = new ProjectileSystem();
  private clock = new GameClock();
  private audioManager = AudioManager.getInstance();
  private callbacks: EngineCallbacks;
  private weaponGroup = new THREE.Group();
  private currentGunMesh: THREE.Group | null = null;
  private gameLoop = new GameLoop(() => this.tick());
  private isRunning = false;
  private isReady = false;
  private fireCooldown = 0;
  private missionTime = 0;
  private kills = 0;
  private lastObjectiveStep = '';
  private heavyDeployed = false;
  private productionTimer = 0;
  private convergenceTimer = 0;
  private effects: TimedEffect[] = [];
  private sentries: Sentry[] = [];
  private supplyPods: THREE.Group[] = [];
  private viewmodelBase = new THREE.Vector3(0.28, -0.25, -0.48);

  constructor(container: HTMLElement, callbacks: EngineCallbacks, private biome: BiomeType = 'forge_city') {
    this.container = container;
    this.callbacks = callbacks;
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    await AssetLoader.getInstance().preloadAssets();
    if (!this.isRunning) return;
    this.initThree();
    this.isReady = true;
    this.clock.start();
    this.callbacks.onReady();
    this.gameLoop.start();
  }

  private initThree() {
    this.camera = new THREE.PerspectiveCamera(74, this.container.clientWidth / this.container.clientHeight, 0.08, 650);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;
    this.container.replaceChildren(this.renderer.domElement);
    this.world = new WorldGenerator().generateWorld(this.scene, this.biome);
    this.objectiveManager.initObjectives(this.scene);
    this.extractionManager.initExtractionLZ(this.scene);
    this.player.position.set(0, 1.8, 112);
    this.scene.add(this.camera);
    this.camera.add(this.weaponGroup);
    this.weaponGroup.position.copy(this.viewmodelBase);
    this.enemyManager.initializeMission(this.scene);
    this.enemyManager.setCallbacks({
      onDamagePlayer: (amount, zone, source) => this.damagePlayer(amount, zone, source),
      onEnemyShot: (from, to, color) => this.addTracer(from, to, color),
      onExplosion: (position, radius, damage) => this.explode(position, radius, damage, true),
    });
    this.updateWeaponViewmodel();
    window.addEventListener('resize', this.onWindowResize);
  }

  public stop() {
    this.isRunning = false;
    this.clock.stop();
    this.gameLoop.stop();
    window.removeEventListener('resize', this.onWindowResize);
    this.renderer?.dispose();
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => material.dispose());
      }
    });
    this.container.replaceChildren();
  }

  private tick = () => {
    if (!this.isRunning || !this.isReady) return;
    const dt = this.clock.getDelta();
    this.missionTime += dt;
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    this.health.update(dt);
    this.player.update(dt, this.world.obstacles);
    this.camera.position.copy(this.player.position);
    this.camera.rotation.set(this.player.pitch, this.player.yaw, 0, 'YXZ');
    this.camera.fov = THREE.MathUtils.lerp(this.camera.fov, this.player.isADS ? 54 : 74, Math.min(1, dt * 11));
    this.camera.updateProjectionMatrix();
    this.updateViewmodel(dt);
    this.enemyManager.update(dt, this.player.position, this.player.velocity, this.scene, this.world.obstacles, this.world.obstacleMeshes);
    this.supportSystem.update(dt, this.scene, (beacon) => this.handleSupportImpact(beacon));
    this.projectileSystem.update(dt, this.scene, (projectile) => this.handleProjectileExplosion(projectile));
    this.extractionManager.update(dt, this.scene, () => this.finishOperation());
    this.updateWorldSources(dt);
    this.updateEffects(dt);
    this.updateSentries(dt);
    if (this.player.isShooting) this.fireWeapon();
    this.renderer.render(this.scene, this.camera);
    this.notifyStats();
  };

  private updateWorldSources(dt: number) {
    this.productionTimer += dt;
    if (this.productionTimer > 4) {
      this.productionTimer = 0;
      this.world.outpostBuilder.outposts.forEach((outpost) => {
        if (outpost.destroyed) return;
        outpost.spawnCooldown -= 4;
        if (outpost.spawnCooldown <= 0 && this.enemyManager.activeEnemies.filter((enemy) => enemy.state !== 'DEAD').length < 27) {
          outpost.spawnCooldown = 38 + Math.random() * 16;
          const guard = new EnemyAgent(`fabricated_${Date.now()}_${outpost.id}`, 'Legion Rifleman', 'iron', 'legion_rifleman', 54, outpost.position.clone().add(new THREE.Vector3(5, 0, 3)), [outpost.position.clone(), outpost.position.clone().add(new THREE.Vector3(18, 0, -12))]);
          this.enemyManager.addEnemy(guard, this.scene);
          this.callbacks.onMessage('FABRICATOR SIGNATURE: NEW MACHINE UNIT ONLINE');
        }
      });
    }
    if (this.objectiveManager.step !== this.lastObjectiveStep) {
      this.lastObjectiveStep = this.objectiveManager.step;
      if (this.objectiveManager.step === 'SEVER_RELAYS' && !this.heavyDeployed) {
        this.heavyDeployed = true;
        const heavy = new EnemyAgent(`enforcer_${Date.now()}`, 'Forge Enforcer', 'iron', 'forge_enforcer', 430, new THREE.Vector3(22, 0, -112), [new THREE.Vector3(22, 0, -112), this.objectiveManager.uplinkPosition]);
        heavy.state = 'ALERT';
        this.enemyManager.addEnemy(heavy, this.scene);
        this.callbacks.onMessage('HEAVY SEISMIC SIGNATURE — FORGE ENFORCER DEPLOYED');
      }
    }
    if (this.extractionManager.isExtractionCalled && !this.extractionManager.isShuttleLanded) {
      this.convergenceTimer += dt;
      if (this.convergenceTimer > 8) { this.convergenceTimer = 0; this.enemyManager.convergeOn(this.extractionManager.extractionZonePos); }
    }
  }

  public fireWeapon() {
    const weapon = this.inventory.getActiveWeapon();
    if (this.fireCooldown > 0 || !this.inventory.consumeActiveBullet()) return;
    this.fireCooldown = 1 / weapon.fireRate;
    this.audioManager.playGunshot();
    this.enemyManager.hearSound(this.player.position, weapon.category === 'launcher' ? 130 : 82);
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    const movementPenalty = Math.min(0.055, this.player.velocity.length() * 0.0045);
    const stanceFactor = this.player.stance === 'PRONE' ? 0.42 : this.player.stance === 'CROUCHING' ? 0.68 : 1;
    const adsFactor = this.player.isADS ? 0.42 : 1;
    const injuryFactor = this.health.hasArmInjury() ? 1.8 : 1;
    const spread = (weapon.spread + movementPenalty) * stanceFactor * adsFactor * injuryFactor;
    direction.x += (Math.random() - 0.5) * spread;
    direction.y += (Math.random() - 0.5) * spread;
    direction.z += (Math.random() - 0.5) * spread;
    direction.normalize();
    this.player.pitch = Math.min(1.45, this.player.pitch + weapon.recoilPitch * (this.player.isADS ? 0.62 : 1));
    this.player.yaw += (Math.random() - 0.5) * weapon.recoilYaw;
    this.weaponGroup.position.z += 0.045;

    const raycaster = new THREE.Raycaster(this.camera.position, direction, 0.1, weapon.effectiveRange);
    const targets = [...this.enemyManager.activeEnemies.map((enemy) => enemy.group), ...this.world.outpostBuilder.outposts.map((outpost) => outpost.mesh), this.objectiveManager.objectives[0].mesh, ...this.world.obstacleMeshes];
    const hits = raycaster.intersectObjects(targets, true);
    const hit = hits.find((item) => item.object.name !== 'terrain');
    const endpoint = hit?.point ?? this.camera.position.clone().addScaledVector(direction, weapon.effectiveRange);
    if (weapon.category === 'launcher') {
      this.projectileSystem.spawnRocket(this.camera.position.clone().addScaledVector(direction, 1), direction, weapon.damage, this.scene, endpoint.distanceTo(this.camera.position) / 45);
      return;
    }
    this.addTracer(this.camera.position.clone().addScaledVector(direction, 0.7), endpoint, 0xd7b36b);
    this.enemyManager.suppressNear(endpoint, 4);
    if (!hit) return;
    const enemyId = this.findUserData(hit.object, 'enemyId') as string | undefined;
    const component = (this.findUserData(hit.object, 'component') as string | undefined) ?? 'torso';
    if (enemyId) {
      const enemy = this.enemyManager.activeEnemies.find((agent) => agent.id === enemyId);
      if (enemy) {
        const killed = enemy.takeDamage(weapon.damage, component, weapon.armorPenetration);
        const isHeadshot = component === 'head';
        this.callbacks.onHitMarker({ isHeadshot, damage: Math.round(weapon.damage) });
        this.audioManager.playHitmarker(isHeadshot);
        if (killed) { this.kills++; this.callbacks.onKill(enemy.name.toUpperCase(), isHeadshot); }
      }
      return;
    }
    const outpostId = this.findUserData(hit.object, 'outpostId') as string | undefined;
    if (outpostId) {
      const destroyed = this.world.outpostBuilder.damageOutpost(outpostId, weapon.damage * 0.48);
      if (destroyed) { this.objectiveManager.onOutpostDestroyed(outpostId); this.explode(hit.point, 9, 80, false); this.callbacks.onMessage('MACHINE FABRICATOR DESTROYED — LOCAL PRODUCTION HALTED'); }
      return;
    }
    if (this.findUserData(hit.object, 'kind') === 'uplink_relay' && this.objectiveManager.damageRelay(hit.object)) { this.explode(hit.point, 2.5, 0, false); this.callbacks.onMessage('UPLINK RELAY SEVERED'); }
    const dropshipId = this.findUserData(hit.object, 'dropshipId') as string | undefined;
    if (dropshipId && this.enemyManager.damageDropship(dropshipId, weapon.damage)) this.callbacks.onMessage('DROPSHIP ENGINE FAILURE — CLEAR THE CRASH ZONE');
  }

  private findUserData(object: THREE.Object3D, key: string): unknown {
    let current: THREE.Object3D | null = object;
    while (current) { if (current.userData[key] !== undefined) return current.userData[key]; current = current.parent; }
    return undefined;
  }

  public reloadWeapon() {
    if (this.inventory.reloadActiveWeapon()) { this.fireCooldown = Math.max(this.fireCooldown, this.inventory.getActiveWeapon().reloadTime); this.callbacks.onMessage('MAGAZINE DISCARDED'); }
  }

  public interact() {
    if (this.extractionManager.isShuttleLanded && this.extractionManager.board(this.player.position)) { this.callbacks.onMessage('BOARDING LOCK — ASC VALIANT RECOVERY CONFIRMED'); return; }
    if (this.extractionManager.beginTerminal(this.player.position)) { this.callbacks.onMessage('EXTRACTION TERMINAL ACTIVE — ENTER D → R → U'); return; }
    const result = this.objectiveManager.interact(this.player.position);
    if (result === 'PRIMARY') { this.extractionManager.isExtractionAvailable = true; this.callbacks.onMessage('COMMAND UPLINK OFFLINE — EXTRACTION AUTHORIZED'); return; }
    if (result === 'POWER') { this.callbacks.onMessage('POWER REROUTED — SHOOT BOTH EXPOSED RELAY CORES'); return; }
    if (result === 'SECONDARY') { this.inventory.samplesCollected += 2; this.callbacks.onMessage('FLIGHT RECORDER SECURED — 2 ARCHIVE SAMPLES ACQUIRED'); return; }
    const poi = this.world.poiManager.nearestLootable(this.player.position);
    if (poi) {
      const reward = this.world.poiManager.loot(poi);
      if (reward === 'ANTI_ARMOR') { this.inventory.collectAntiArmor(); this.updateWeaponViewmodel(); this.callbacks.onMessage('ML-6 MANTICORE RECOVERED — PRESS 3'); }
      if (reward === 'SAMPLE') { this.inventory.samplesCollected++; this.callbacks.onMessage('ENCRYPTED ALLOY SAMPLE SECURED'); }
      if (reward === 'AMMO') { this.inventory.resupply(); this.callbacks.onMessage('FIELD AMMUNITION RECOVERED'); }
      if (reward === 'MEDICAL') { this.health.medInjectors = Math.min(this.health.maxInjectors, this.health.medInjectors + 2); this.callbacks.onMessage('MEDICAL CACHE RECOVERED'); }
      return;
    }
    const pod = this.supplyPods.find((item) => item.position.distanceTo(this.player.position) < 4.5 && !item.userData.used);
    if (pod) { pod.userData.used = true; this.inventory.resupply(); this.health.medInjectors = this.health.maxInjectors; this.callbacks.onMessage('SUPPLY CAPSULE STRIPPED'); }
  }

  public inputDirection(direction: Direction) {
    if (this.extractionManager.isTerminalActive) return this.extractionManager.inputDirection(direction);
    const supportId = this.supportSystem.inputDirection(direction);
    if (!supportId) return false;
    const cameraDirection = new THREE.Vector3();
    this.camera.getWorldDirection(cameraDirection);
    this.supportSystem.throwBeacon(supportId, this.player.position, cameraDirection, this.scene);
    this.callbacks.onMessage(`${SUPPORT_CATALOG[supportId].name.toUpperCase()} — BEACON DEPLOYED`);
    return true;
  }

  private handleSupportImpact(beacon: ActiveBeacon) {
    if (beacon.supportId === 'kinetic_lance') this.launchKineticLance(beacon.position);
    else if (beacon.supportId === 'supply_capsule') this.dropSupplyCapsule(beacon.position);
    else if (beacon.supportId === 'vtol_strafe') this.runVtolStrafe(beacon.position);
    else if (beacon.supportId === 'autocannon_sentry') this.dropSentry(beacon.position);
  }

  private launchKineticLance(position: THREE.Vector3) {
    const slug = AssetLoader.getInstance().getModel('grenade') ?? new THREE.Group();
    slug.scale.set(1.2, 4.8, 1.2);
    slug.position.copy(position).add(new THREE.Vector3(0, 150, 0));
    this.scene.add(slug);
    this.effects.push({ object: slug, age: 0, duration: 0.85, update: (t) => { slug.position.y = 150 * (1 - t) + 0.2; }, complete: () => this.explode(position, 13, 480, true) });
  }

  private dropSupplyCapsule(position: THREE.Vector3) {
    const pod = AssetLoader.getInstance().getModel('crate') ?? new THREE.Group();
    pod.scale.setScalar(2.2);
    pod.position.copy(position).add(new THREE.Vector3(0, 85, 0));
    this.scene.add(pod);
    this.supplyPods.push(pod);
    this.effects.push({ object: pod, age: 0, duration: 2.4, update: (t) => { pod.position.y = 85 * (1 - t) * (1 - t); pod.rotation.y += 0.12; }, complete: () => { pod.position.y = 0; this.explode(position, 3.5, 18, true); } });
  }

  private runVtolStrafe(position: THREE.Vector3) {
    const craft = new THREE.Group();
    const hull = AssetLoader.getInstance().getModel('container_wide');
    if (hull) { hull.scale.set(5.5, 1.8, 8); craft.add(hull); }
    craft.position.copy(position).add(new THREE.Vector3(-90, 18, -45));
    this.scene.add(craft);
    this.effects.push({ object: craft, age: 0, duration: 4, update: (t, dt) => {
      craft.position.lerp(position.clone().add(new THREE.Vector3(90, 18, 45)), dt * 1.2);
      craft.lookAt(position.clone().add(new THREE.Vector3(100, 12, 50)));
      if (t > 0.28 && t < 0.7 && Math.random() < 0.45) {
        const target = position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 18, 0, (Math.random() - 0.5) * 18));
        this.addTracer(craft.position, target, 0xe6b45c);
        this.explode(target, 2.2, 52, true);
      }
    } });
  }

  private dropSentry(position: THREE.Vector3) {
    const group = new THREE.Group();
    const base = AssetLoader.getInstance().getModel('terminal');
    const gun = AssetLoader.getInstance().getModel('rifle');
    if (base) { base.scale.setScalar(1.25); group.add(base); }
    if (gun) { gun.scale.setScalar(2); gun.position.y = 2; gun.rotation.y = Math.PI / 2; group.add(gun); }
    group.position.copy(position);
    this.scene.add(group);
    this.sentries.push({ group, position: position.clone(), cooldown: 0, life: 55 });
  }

  private updateSentries(dt: number) {
    this.sentries = this.sentries.filter((sentry) => {
      sentry.life -= dt; sentry.cooldown -= dt;
      const target = this.enemyManager.activeEnemies.filter((enemy) => enemy.state !== 'DEAD' && enemy.position.distanceTo(sentry.position) < 42).sort((a, b) => a.position.distanceToSquared(sentry.position) - b.position.distanceToSquared(sentry.position))[0];
      if (target) {
        sentry.group.lookAt(target.position);
        if (sentry.cooldown <= 0) { sentry.cooldown = 0.42; this.addTracer(sentry.position.clone().add(new THREE.Vector3(0, 2, 0)), target.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xe3aa54); if (target.takeDamage(48, 'torso', 4)) this.kills++; }
      }
      if (sentry.life > 0) return true;
      this.scene.remove(sentry.group); return false;
    });
  }

  private handleProjectileExplosion(projectile: PhysicalProjectile) { this.explode(projectile.mesh.position, projectile.radius, projectile.damage, true); }

  private explode(position: THREE.Vector3, radius: number, damage: number, friendlyFire: boolean) {
    this.audioManager.playExplosion();
    this.enemyManager.hearSound(position, Math.max(70, radius * 8));
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0xe97832, transparent: true, opacity: 0.75, depthWrite: false }));
    sphere.position.copy(position).add(new THREE.Vector3(0, 1, 0));
    this.scene.add(sphere);
    this.effects.push({ object: sphere, age: 0, duration: 0.55, update: (t) => { sphere.scale.setScalar(1 + radius * t); (sphere.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - t); } });
    if (damage > 0) {
      this.enemyManager.activeEnemies.forEach((enemy) => {
        const distance = enemy.position.distanceTo(position);
        if (enemy.state !== 'DEAD' && distance < radius && enemy.takeDamage(damage * (1 - distance / radius), 'torso', 5)) { this.kills++; this.callbacks.onKill(enemy.name.toUpperCase(), false); }
      });
      this.world?.outpostBuilder.outposts.forEach((outpost) => { if (outpost.position.distanceTo(position) < radius && this.world.outpostBuilder.damageOutpost(outpost.id, damage)) this.objectiveManager.onOutpostDestroyed(outpost.id); });
      if (friendlyFire && this.player.position.distanceTo(position) < radius) this.damagePlayer(damage * (1 - this.player.position.distanceTo(position) / radius), 'TORSO', position);
    }
  }

  private addTracer(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const delta = to.clone().sub(from);
    const length = delta.length();
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, length, 5), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.88 }));
    mesh.position.copy(from).add(to).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    this.scene.add(mesh);
    this.effects.push({ object: mesh, age: 0, duration: 0.065 });
  }

  private updateEffects(dt: number) {
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i]; effect.age += dt;
      effect.update?.(Math.min(1, effect.age / effect.duration), dt);
      if (effect.age < effect.duration) continue;
      effect.complete?.(); this.scene.remove(effect.object); this.effects.splice(i, 1);
    }
  }

  private damagePlayer(amount: number, zone: 'TORSO' | 'LEFT_ARM' | 'RIGHT_ARM' | 'LEFT_LEG' | 'RIGHT_LEG', source: THREE.Vector3) {
    const armorFactor = this.inventory.armorType === 'heavy' ? 0.67 : this.inventory.armorType === 'light' ? 1.16 : 0.86;
    const died = this.health.takeDamage(amount * armorFactor, zone);
    const sourceAngle = Math.atan2(source.x - this.player.position.x, source.z - this.player.position.z);
    this.callbacks.onDamage(sourceAngle - this.player.yaw);
    if (died) this.callbacks.onGameOver();
  }

  private updateViewmodel(dt: number) {
    const speed = this.player.velocity.length();
    const bob = Math.sin(this.missionTime * (this.player.isSprinting ? 11 : 7)) * Math.min(0.014, speed * 0.0024);
    const target = this.player.isSprinting ? new THREE.Vector3(0.38, -0.43, -0.38) : this.player.isADS ? new THREE.Vector3(0, -0.17, -0.38) : this.viewmodelBase;
    this.weaponGroup.position.lerp(target.clone().add(new THREE.Vector3(0, bob, 0)), Math.min(1, dt * 10));
    this.weaponGroup.rotation.z = THREE.MathUtils.lerp(this.weaponGroup.rotation.z, this.player.isSprinting ? -0.52 : 0, dt * 9);
  }

  private updateWeaponViewmodel() {
    if (this.currentGunMesh) this.weaponGroup.remove(this.currentGunMesh);
    const model = AssetLoader.getInstance().getModel(this.inventory.getActiveWeapon().category === 'launcher' ? 'rifle' : 'rifle') ?? new THREE.Group();
    model.scale.setScalar(this.inventory.getActiveWeapon().category === 'launcher' ? 0.8 : 0.62);
    model.rotation.set(0, Math.PI, 0);
    model.position.set(0, -0.03, 0);
    model.traverse((child) => { if (child instanceof THREE.Mesh) child.frustumCulled = false; });
    this.currentGunMesh = model;
    this.weaponGroup.add(model);
  }

  public switchWeapon(slot: 'primary' | 'secondary' | 'support') { if (this.inventory.switchWeaponSlot(slot)) this.updateWeaponViewmodel(); }

  public getInteractionPrompt() {
    if (this.extractionManager.isShuttleLanded && this.player.position.distanceTo(this.extractionManager.extractionZonePos) < 5) return '[E] BOARD ASC VALIANT SHUTTLE';
    if (this.extractionManager.isExtractionAvailable && !this.extractionManager.isExtractionCalled && this.player.position.distanceTo(this.extractionManager.extractionZonePos) < 10) return '[E] ACCESS EXTRACTION TERMINAL';
    return this.objectiveManager.getInteractionPrompt(this.player.position) ?? (this.world.poiManager.nearestLootable(this.player.position) ? '[E] SEARCH FIELD CACHE' : null);
  }

  private finishOperation() { this.callbacks.onOperationSuccess({ kills: this.kills, samples: this.inventory.samplesCollected, optionalComplete: this.objectiveManager.objectives[1].completed, resourcesExtracted: this.inventory.samplesCollected, timeSeconds: this.missionTime }); }

  public getRadarData() {
    return {
      playerPos: { x: this.player.position.x, y: this.player.position.y, z: this.player.position.z }, playerYaw: this.player.yaw,
      objective: this.objectiveManager.isPrimaryComplete() ? null : { x: this.objectiveManager.uplinkPosition.x, z: this.objectiveManager.uplinkPosition.z },
      extraction: this.extractionManager.isExtractionAvailable ? { x: this.extractionManager.extractionZonePos.x, z: this.extractionManager.extractionZonePos.z } : null,
      enemies: this.enemyManager.activeEnemies.filter((enemy) => enemy.state !== 'DEAD' && enemy.state !== 'PATROL' ? true : enemy.position.distanceTo(this.player.position) < 34).map((enemy) => ({ id: enemy.id, x: enemy.position.x, z: enemy.position.z, type: enemy.archetype, state: enemy.state, health: enemy.health, maxHealth: enemy.maxHealth })),
      pois: this.world.poiManager.pois.map((poi) => ({ x: poi.position.x, z: poi.position.z, looted: poi.looted })),
    };
  }

  private notifyStats() {
    const mag = this.inventory.getActiveMagState(); const weapon = this.inventory.getActiveWeapon();
    const alertStates = this.enemyManager.activeEnemies.filter((enemy) => ['ALERT', 'ENGAGE', 'CALL_REINFORCEMENT'].includes(enemy.state)).length;
    this.callbacks.onStatsUpdate({
      health: this.health.health, maxHealth: this.health.maxHealth, shield: 0, maxShield: 0, stamina: this.player.stamina, medInjectors: this.health.medInjectors,
      currentClip: mag.currentClip, reserveMags: mag.reserveMags, weaponName: weapon.name, weaponCategory: weapon.category, grenadesCount: this.inventory.grenadesCount,
      supportSequence: this.supportSystem.currentSequenceInput, isSupportOpen: this.supportSystem.isInterfaceOpen, supportCooldowns: this.supportSystem.cooldowns,
      objectiveText: this.objectiveManager.getObjectiveText(), extractionAvailable: this.extractionManager.isExtractionAvailable, extractionCalled: this.extractionManager.isExtractionCalled,
      extractionTimer: this.extractionManager.extractionTimer, extractionInput: this.extractionManager.input, extractionTerminal: this.extractionManager.isTerminalActive,
      injuries: this.health.injuries, stance: this.player.stance, samples: this.inventory.samplesCollected, interactionPrompt: this.getInteractionPrompt(), alertLevel: alertStates > 5 ? 'HEAVY' : alertStates > 0 ? 'CONTACT' : 'LOW', armorType: this.inventory.armorType,
    });
  }

  private onWindowResize = () => { if (!this.renderer) return; this.camera.aspect = this.container.clientWidth / this.container.clientHeight; this.camera.updateProjectionMatrix(); this.renderer.setSize(this.container.clientWidth, this.container.clientHeight); };
}
