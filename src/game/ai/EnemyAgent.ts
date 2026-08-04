import * as THREE from 'three';
import { AIState, EnemyArchetype, FactionType } from './AIStateMachine';
import { AssetLoader } from '../assets/AssetLoader';

export interface EnemyUpdateContext {
  playerPos: THREE.Vector3;
  playerVelocity: THREE.Vector3;
  obstacles: THREE.Box3[];
  obstacleMeshes: THREE.Object3D[];
  otherAgents: EnemyAgent[];
  onTriggerReinforcement: (agent: EnemyAgent) => void;
  onDamagePlayer: (amount: number, zone: 'TORSO' | 'LEFT_ARM' | 'RIGHT_ARM' | 'LEFT_LEG' | 'RIGHT_LEG', source: THREE.Vector3) => void;
  onEnemyShot: (from: THREE.Vector3, to: THREE.Vector3, color: number) => void;
}

const clampAngle = (angle: number) => Math.atan2(Math.sin(angle), Math.cos(angle));

export class EnemyAgent {
  public id: string;
  public name: string;
  public faction: FactionType;
  public archetype: EnemyArchetype;
  public health: number;
  public maxHealth: number;
  public armorRating = 1;
  public state: AIState = 'PATROL';
  public position = new THREE.Vector3();
  public velocity = new THREE.Vector3();
  public rotationY = 0;
  public moveSpeed = 3.1;
  public turnRate = 3.2;
  public attackRange = 32;
  public radius = 0.8;
  public isCaller = false;
  public callTimer = 0;
  public maxCallDuration = 2.5;
  public suppression = 0;
  public group = new THREE.Group();
  public animationMixer: THREE.AnimationMixer | null = null;
  public patrolWaypoints: THREE.Vector3[] = [];
  public currentWaypointIdx = 0;
  public attackCooldown = Math.random() * 1.4;
  public investigatePoint: THREE.Vector3 | null = null;
  public forcedTarget: THREE.Vector3 | null = null;
  public corpseTimer = 0;
  public components = { head: 32, leftArm: 45, rightArm: 45, leftLeg: 55, rightLeg: 55, reactor: 65 };
  private currentAction: THREE.AnimationAction | null = null;
  private callEffect: THREE.Group | null = null;
  private lastKnownPlayer = new THREE.Vector3();
  private sightAccumulator = 0;
  private rocketTelegraph = 0;

  constructor(id: string, name: string, faction: FactionType, archetype: EnemyArchetype, health: number, pos: THREE.Vector3, waypoints: THREE.Vector3[] = []) {
    this.id = id;
    this.name = name;
    this.faction = faction;
    this.archetype = archetype;
    this.health = health;
    this.maxHealth = health;
    this.position.copy(pos);
    this.patrolWaypoints = waypoints.map((p) => p.clone());
    this.isCaller = archetype === 'legion_rifleman' || archetype === 'scuttler' || archetype === 'oracle_drone';
    if (archetype === 'rocket_legionary') { this.moveSpeed = 2.7; this.attackRange = 48; }
    if (archetype === 'bulwark_gunner') { this.moveSpeed = 1.8; this.turnRate = 2.1; this.armorRating = 3; this.radius = 1.2; }
    if (archetype === 'red_reaper') { this.moveSpeed = 5.2; this.attackRange = 2.2; this.turnRate = 5.2; }
    if (archetype === 'forge_enforcer') { this.moveSpeed = 2.35; this.turnRate = 1.7; this.armorRating = 4; this.radius = 1.55; this.attackRange = 36; }
    this.initModel();
  }

  private initModel() {
    const loader = AssetLoader.getInstance();
    const heavy = this.archetype === 'bulwark_gunner' || this.archetype === 'forge_enforcer';
    const modelId = 'robot';
    const model = loader.getModel(modelId);
    if (model) {
      const scale = this.archetype === 'forge_enforcer' ? 1.6 : heavy ? 1.05 : 0.76;
      model.scale.setScalar(scale);
      model.rotation.y = Math.PI;
      const box = new THREE.Box3().setFromObject(model);
      model.position.y = -box.min.y;
      this.group.add(model);
      const weapon = loader.getModel('rifle');
      if (weapon) {
        weapon.scale.setScalar(this.archetype === 'rocket_legionary' ? 1.1 : 0.58);
        weapon.position.set(0.48, 1.08, 0.32);
        weapon.rotation.set(0, Math.PI, -0.15);
        this.group.add(weapon);
      }
      const gltf = loader.getGLTF(modelId);
      if (gltf?.animations.length) {
        this.animationMixer = new THREE.AnimationMixer(model);
        this.playAnimation('Walk');
      }
    }
    // Invisible component hit volumes provide independently destructible systems.
    const hitMaterial = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const parts: Array<[string, THREE.Vector3, THREE.Vector3]> = [
      ['head', new THREE.Vector3(0, 1.72, 0), new THREE.Vector3(0.5, 0.46, 0.48)],
      ['leftArm', new THREE.Vector3(-0.47, 1.13, 0), new THREE.Vector3(0.3, 0.75, 0.4)],
      ['rightArm', new THREE.Vector3(0.47, 1.13, 0), new THREE.Vector3(0.3, 0.75, 0.4)],
      ['leftLeg', new THREE.Vector3(-0.2, 0.42, 0), new THREE.Vector3(0.3, 0.72, 0.38)],
      ['rightLeg', new THREE.Vector3(0.2, 0.42, 0), new THREE.Vector3(0.3, 0.72, 0.38)],
      ['reactor', new THREE.Vector3(0, 1.05, -0.28), new THREE.Vector3(0.56, 0.55, 0.25)],
    ];
    parts.forEach(([name, pos, size]) => {
      const hitbox = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), hitMaterial);
      hitbox.name = name;
      hitbox.userData.enemyId = this.id;
      hitbox.userData.component = name;
      hitbox.position.copy(pos).multiplyScalar(heavy ? 1.35 : 1);
      this.group.add(hitbox);
    });
    if (this.archetype === 'bulwark_gunner') {
      const shield = loader.getModel('door');
      if (shield) {
        shield.name = 'shield';
        shield.userData.enemyId = this.id;
        shield.userData.component = 'shield';
        shield.scale.set(1.3, 1.9, 0.45);
        shield.position.set(-0.72, 1.15, 0.38);
        this.group.add(shield);
      }
    }
    this.group.position.copy(this.position);
  }

  private playAnimation(preferred: string) {
    if (!this.animationMixer) return;
    const modelId = 'robot';
    const clips = AssetLoader.getInstance().getGLTF(modelId)?.animations ?? [];
    const clip = clips.find((item) => item.name.toLowerCase().includes(preferred.toLowerCase())) ?? clips[0];
    if (!clip) return;
    const next = this.animationMixer.clipAction(clip);
    if (next === this.currentAction) return;
    next.reset().fadeIn(0.18).play();
    this.currentAction?.fadeOut(0.18);
    this.currentAction = next;
  }

  public hear(position: THREE.Vector3, strength: number) {
    if (this.state === 'DEAD' || this.position.distanceTo(position) > strength) return;
    this.investigatePoint = position.clone();
    if (this.state === 'PATROL' || this.state === 'IDLE') this.state = 'INVESTIGATE';
  }

  public forceConverge(position: THREE.Vector3) {
    this.forcedTarget = position.clone();
    if (this.state === 'PATROL') this.state = 'INVESTIGATE';
  }

  public update(dt: number, context: EnemyUpdateContext) {
    if (this.state === 'DEAD') { this.corpseTimer += dt; return; }
    this.animationMixer?.update(dt);
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.suppression = Math.max(0, this.suppression - dt * 0.2);

    const toPlayer = context.playerPos.clone().sub(this.position);
    const distance = toPlayer.length();
    const canSee = this.canSeePlayer(context, toPlayer, distance);
    if (canSee) {
      this.sightAccumulator += dt * (distance < 18 ? 2.1 : 1);
      this.lastKnownPlayer.copy(context.playerPos);
      if (this.sightAccumulator > 0.45 && ['PATROL', 'IDLE', 'INVESTIGATE', 'SUSPICIOUS'].includes(this.state)) this.state = 'ALERT';
    } else {
      this.sightAccumulator = Math.max(0, this.sightAccumulator - dt * 1.4);
    }

    if (this.state === 'ALERT') {
      if (this.isCaller && Math.random() < 0.72) {
        this.state = 'CALL_REINFORCEMENT';
        this.callTimer = 0;
        this.createCallEffect();
      } else this.state = 'ENGAGE';
    }
    if (this.state === 'CALL_REINFORCEMENT') {
      this.velocity.set(0, 0, 0);
      this.callTimer += dt;
      if (this.callEffect) {
        this.callEffect.rotation.y += dt * 4;
        this.callEffect.scale.setScalar(0.7 + this.callTimer / this.maxCallDuration);
      }
      if (this.callTimer >= this.maxCallDuration) {
        this.removeCallEffect();
        context.onTriggerReinforcement(this);
        this.state = 'ENGAGE';
      }
      return;
    }

    if (['ENGAGE', 'FLANK', 'REPOSITION', 'SUPPRESSED'].includes(this.state)) {
      this.combat(dt, context, distance, canSee);
    } else {
      const target = this.forcedTarget ?? this.investigatePoint ?? this.patrolWaypoints[this.currentWaypointIdx];
      if (target) {
        if (this.position.distanceTo(target) < 2.5) {
          if (this.investigatePoint) { this.investigatePoint = null; this.state = 'SUSPICIOUS'; }
          else this.currentWaypointIdx = (this.currentWaypointIdx + 1) % Math.max(1, this.patrolWaypoints.length);
        }
        this.moveToward(target, dt, context, 0.72);
      } else this.velocity.multiplyScalar(Math.max(0, 1 - dt * 5));
    }
    this.applyMovement(dt, context);
  }

  private canSeePlayer(context: EnemyUpdateContext, toPlayer: THREE.Vector3, distance: number) {
    if (distance > 54) return false;
    const forward = new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY));
    const flatDirection = toPlayer.clone().setY(0).normalize();
    if (this.state === 'PATROL' && forward.dot(flatDirection) < 0.38) return false;
    const origin = this.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    const target = context.playerPos.clone().add(new THREE.Vector3(0, -0.55, 0));
    const ray = new THREE.Raycaster(origin, target.clone().sub(origin).normalize(), 0, origin.distanceTo(target));
    const hit = ray.intersectObjects(context.obstacleMeshes, true).find((item) => item.object.name !== 'terrain');
    return !hit;
  }

  private combat(dt: number, context: EnemyUpdateContext, distance: number, canSee: boolean) {
    if (!canSee && this.position.distanceTo(this.lastKnownPlayer) > 3) {
      this.moveToward(this.lastKnownPlayer, dt, context, 1);
      return;
    }
    const ideal = this.archetype === 'red_reaper' ? 1.5 : this.archetype === 'bulwark_gunner' ? 18 : 27;
    if (distance > ideal + 5) this.moveToward(context.playerPos, dt, context, 1);
    else if (distance < ideal - 7 && this.archetype !== 'red_reaper') this.moveToward(context.playerPos, dt, context, -0.55);
    else this.velocity.multiplyScalar(Math.max(0, 1 - dt * 8));

    if (!canSee || distance > this.attackRange || this.attackCooldown > 0) return;
    if (this.archetype === 'rocket_legionary') {
      if (this.rocketTelegraph <= 0) { this.rocketTelegraph = 1.15; this.attackCooldown = 1.15; return; }
    }
    if (this.rocketTelegraph > 0) {
      this.rocketTelegraph -= dt;
      context.onEnemyShot(this.position.clone().add(new THREE.Vector3(0, 1.4, 0)), context.playerPos, 0xd95032);
      if (this.rocketTelegraph <= 0) {
        const impact = context.playerPos.clone().addScaledVector(context.playerVelocity, 0.35);
        context.onEnemyShot(this.position.clone().add(new THREE.Vector3(0, 1.5, 0)), impact, 0xff793f);
        if (impact.distanceTo(context.playerPos) < 4.2) context.onDamagePlayer(36, 'TORSO', this.position);
        this.attackCooldown = 5.2;
      }
      return;
    }
    const source = this.position.clone().add(new THREE.Vector3(0, 1.45, 0));
    context.onEnemyShot(source, context.playerPos, this.archetype === 'forge_enforcer' ? 0xff5f33 : 0xd03c2f);
    const baseAccuracy = this.archetype === 'red_reaper' ? 0.92 : this.archetype === 'bulwark_gunner' ? 0.42 : 0.55;
    const hitChance = Math.max(0.12, baseAccuracy - distance / 95 - this.suppression * 0.38);
    if (Math.random() < hitChance) {
      const zones = ['TORSO', 'LEFT_ARM', 'RIGHT_ARM', 'LEFT_LEG', 'RIGHT_LEG'] as const;
      context.onDamagePlayer(this.archetype === 'red_reaper' ? 18 : this.archetype === 'forge_enforcer' ? 22 : 9, zones[Math.floor(Math.random() * zones.length)], this.position);
    }
    this.attackCooldown = this.archetype === 'bulwark_gunner' ? 0.16 : this.archetype === 'red_reaper' ? 0.72 : 0.48 + Math.random() * 0.55;
  }

  private moveToward(target: THREE.Vector3, dt: number, context: EnemyUpdateContext, speedFactor: number) {
    const desired = target.clone().sub(this.position).setY(0);
    if (desired.lengthSq() < 0.02) return;
    desired.normalize();
    const targetYaw = Math.atan2(desired.x, desired.z) + (speedFactor < 0 ? Math.PI : 0);
    const difference = clampAngle(targetYaw - this.rotationY);
    this.rotationY += Math.sign(difference) * Math.min(Math.abs(difference), this.turnRate * dt);
    const alignment = Math.max(0.15, 1 - Math.abs(difference) / Math.PI);
    const disabledLegs = Number(this.components.leftLeg <= 0) + Number(this.components.rightLeg <= 0);
    const componentFactor = disabledLegs === 2 ? 0.18 : disabledLegs === 1 ? 0.56 : 1;
    const forward = new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY));
    const targetVelocity = forward.multiplyScalar(this.moveSpeed * Math.abs(speedFactor) * alignment * componentFactor);
    this.velocity.lerp(targetVelocity, Math.min(1, dt * 5));
    this.group.rotation.y = this.rotationY;
    this.playAnimation(this.velocity.length() > this.moveSpeed * 0.8 ? 'Run' : 'Walk');
  }

  private applyMovement(dt: number, context: EnemyUpdateContext) {
    const separation = new THREE.Vector3();
    context.otherAgents.forEach((other) => {
      if (other === this || other.state === 'DEAD') return;
      const delta = this.position.clone().sub(other.position);
      const minDistance = this.radius + other.radius;
      const distance = delta.length();
      if (distance > 0.01 && distance < minDistance) separation.add(delta.normalize().multiplyScalar((minDistance - distance) * 3));
    });
    const candidate = this.position.clone().addScaledVector(this.velocity, dt).addScaledVector(separation, dt);
    const bounds = new THREE.Box3().setFromCenterAndSize(candidate.clone().add(new THREE.Vector3(0, 0.9, 0)), new THREE.Vector3(this.radius * 1.6, 1.8, this.radius * 1.6));
    if (!context.obstacles.some((obstacle) => obstacle.intersectsBox(bounds))) this.position.copy(candidate);
    else {
      this.rotationY += dt * this.turnRate * 0.8;
      this.velocity.multiplyScalar(0.2);
    }
    this.group.position.copy(this.position);
  }

  private createCallEffect() {
    const effect = new THREE.Group();
    const light = new THREE.PointLight(0xe5482e, 12, 34);
    light.position.y = 2.2;
    effect.add(light);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.11, 18, 8), new THREE.MeshBasicMaterial({ color: 0xef5a3c, transparent: true, opacity: 0.72 }));
    beam.position.y = 9;
    effect.add(beam);
    this.group.add(effect);
    this.callEffect = effect;
  }

  private removeCallEffect() {
    if (this.callEffect) this.group.remove(this.callEffect);
    this.callEffect = null;
  }

  public applySuppression(amount: number) { this.suppression = Math.min(1, this.suppression + amount); }

  public takeDamage(damage: number, component = 'torso', penetration = 2): boolean {
    if (component === 'shield' && this.archetype === 'bulwark_gunner' && penetration < 4) return false;
    const armorReduction = Math.max(0.15, 1 - Math.max(0, this.armorRating - penetration) * 0.3);
    let applied = damage * armorReduction;
    if (component === 'head') applied *= 1.9;
    if (component === 'reactor') applied *= 1.55;
    if (component in this.components) {
      const key = component as keyof typeof this.components;
      this.components[key] -= applied;
      if (this.components[key] <= 0 && (key === 'rightArm' || key === 'leftArm')) this.attackCooldown += 1.2;
    }
    this.health -= applied;
    if (this.state === 'CALL_REINFORCEMENT') this.removeCallEffect();
    if (this.state === 'PATROL' || this.state === 'CALL_REINFORCEMENT') this.state = 'ENGAGE';
    if (this.health > 0) return false;
    this.health = 0;
    this.state = 'DEAD';
    this.velocity.set(0, 0, 0);
    this.removeCallEffect();
    this.playAnimation('Death');
    this.group.rotation.z = (Math.random() - 0.5) * 0.7;
    return true;
  }
}
