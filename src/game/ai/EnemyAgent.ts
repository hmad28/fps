import * as THREE from 'three';
import { AIState, EnemyArchetype, FactionType } from './AIStateMachine';
import { AssetLoader } from '../assets/AssetLoader';

export class EnemyAgent {
  public id: string;
  public name: string;
  public faction: FactionType;
  public archetype: EnemyArchetype;

  public health: number;
  public maxHealth: number;
  public state: AIState = 'PATROL';

  public position: THREE.Vector3 = new THREE.Vector3();
  public rotationY: number = 0;
  public velocity: THREE.Vector3 = new THREE.Vector3();

  public moveSpeed: number = 3.5;
  public turnRate: number = 4.0; // rad/s
  public attackRange: number = 18.0;

  // Reinforcement Call Telegraph
  public isCaller: boolean = false;
  public callTimer: number = 0;
  public maxCallDuration: number = 2.5;

  public group: THREE.Group;
  public animationMixer: THREE.AnimationMixer | null = null;
  public patrolWaypoints: THREE.Vector3[] = [];
  public currentWaypointIdx: number = 0;
  public attackCooldown: number = 0;

  constructor(
    id: string,
    name: string,
    faction: FactionType,
    archetype: EnemyArchetype,
    health: number,
    pos: THREE.Vector3,
    waypoints: THREE.Vector3[] = []
  ) {
    this.id = id;
    this.name = name;
    this.faction = faction;
    this.archetype = archetype;
    this.health = health;
    this.maxHealth = health;
    this.position.copy(pos);
    this.patrolWaypoints = waypoints;

    this.isCaller = archetype === 'scuttler' || archetype === 'legion_rifleman' || archetype === 'oracle_drone';
    if (archetype === 'scuttler') this.moveSpeed = 4.8;
    if (archetype === 'razorleaper') this.moveSpeed = 5.5;
    if (archetype === 'bulwark_gunner') this.moveSpeed = 2.2;
    if (archetype === 'forge_enforcer') this.moveSpeed = 2.8;

    this.group = new THREE.Group();
    this.init3DMesh();
  }

  private init3DMesh() {
    const loader = AssetLoader.getInstance();
    let modelName = 'soldier';
    if (this.faction === 'iron' && (this.archetype === 'forge_enforcer' || this.archetype === 'bulwark_gunner')) {
      modelName = 'robot';
    } else if (this.faction === 'brood') {
      modelName = 'robot'; // Retargeted biological mecha model
    }

    const model = loader.getModel(modelName);
    if (model) {
      if (modelName === 'soldier') {
        model.rotation.y = Math.PI; // Face forward in movement vector direction!
        model.scale.set(1.8, 1.8, 1.8);
      } else {
        model.scale.set(1.1, 1.1, 1.1);
      }

      const bbox = new THREE.Box3().setFromObject(model);
      model.position.y = -bbox.min.y; // Align feet bottom to Y=0
      this.group.add(model);

      const gltf = loader.getGLTF(modelName);
      if (gltf && gltf.animations && gltf.animations.length > 0) {
        this.animationMixer = new THREE.AnimationMixer(model);
        const animName = modelName === 'robot' ? 'Walking' : 'Walk';
        let clip = THREE.AnimationClip.findByName(gltf.animations, animName) || gltf.animations[0];
        if (clip) {
          const action = this.animationMixer.clipAction(clip);
          action.play();
        }
      }
    } else {
      // Fallback cylinder geometry
      const geo = new THREE.CylinderGeometry(0.4, 0.4, 1.8, 8);
      const mat = new THREE.MeshStandardMaterial({ color: this.faction === 'brood' ? 0x22c55e : (this.faction === 'iron' ? 0xef4444 : 0xa855f7) });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.y = 0.9;
      this.group.add(mesh);
    }

    // Hitboxes
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.5, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    head.name = 'head';
    head.position.y = 1.7;
    this.group.add(head);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.0, 0.5), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0 }));
    torso.name = 'torso';
    torso.position.y = 0.95;
    this.group.add(torso);

    this.group.position.copy(this.position);
    this.group.frustumCulled = false;
  }

  public update(dt: number, playerPos: THREE.Vector3, otherAgents: EnemyAgent[], onTriggerReinforcement: (agent: EnemyAgent) => void) {
    if (this.state === 'DEAD') return;

    if (this.animationMixer) {
      this.animationMixer.update(dt);
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    }

    const distToPlayer = this.position.distanceTo(playerPos);

    // Perception & Alert logic
    if (this.state === 'PATROL' || this.state === 'IDLE') {
      if (distToPlayer < 24.0) {
        this.state = 'ALERT';
      }
    } else if (this.state === 'ALERT') {
      // Check if this unit is a caller and should initiate reinforcement call!
      if (this.isCaller && distToPlayer < 28.0 && Math.random() < 0.3) {
        this.state = 'CALL_REINFORCEMENT';
        this.callTimer = 0;
      } else {
        this.state = 'ENGAGE';
      }
    } else if (this.state === 'CALL_REINFORCEMENT') {
      this.callTimer += dt;
      // Telegraph particle ring / sound
      if (this.callTimer >= this.maxCallDuration) {
        onTriggerReinforcement(this);
        this.state = 'ENGAGE';
      }
      return; // Stand in place while calling
    }

    // Locomotion & Turning
    let targetPos = playerPos;
    if (this.state === 'PATROL' && this.patrolWaypoints.length > 0) {
      targetPos = this.patrolWaypoints[this.currentWaypointIdx];
      if (this.position.distanceTo(targetPos) < 2.0) {
        this.currentWaypointIdx = (this.currentWaypointIdx + 1) % this.patrolWaypoints.length;
      }
    }

    // Desired direction vector
    const desiredDir = targetPos.clone().sub(this.position).setY(0);
    if (desiredDir.lengthSq() > 0.01) {
      desiredDir.normalize();
      const targetYaw = Math.atan2(desiredDir.x, desiredDir.z);

      // Smooth turning rate
      let diff = targetYaw - this.rotationY;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;

      this.rotationY += Math.sign(diff) * Math.min(Math.abs(diff), this.turnRate * dt);
      this.group.rotation.y = this.rotationY;

      // Move forward in facing direction
      const forward = new THREE.Vector3(Math.sin(this.rotationY), 0, Math.cos(this.rotationY));
      this.velocity.copy(forward.multiplyScalar(this.moveSpeed));
    } else {
      this.velocity.set(0, 0, 0);
    }

    // Separation forces so enemies do not stack into one blob
    const separation = new THREE.Vector3();
    otherAgents.forEach((other) => {
      if (other !== this && other.state !== 'DEAD') {
        const d = this.position.distanceTo(other.position);
        if (d < 1.8 && d > 0.01) {
          const push = this.position.clone().sub(other.position).normalize().multiplyScalar((1.8 - d) * 2.0);
          separation.add(push);
        }
      }
    });

    this.position.addScaledVector(this.velocity, dt).addScaledVector(separation, dt);
    this.group.position.copy(this.position);
  }

  public takeDamage(damage: number): boolean {
    this.health -= damage;
    if (this.health <= 0) {
      this.health = 0;
      this.state = 'DEAD';
      if (this.animationMixer) {
        this.animationMixer.stopAllAction(); // Stop walk animation immediately on death
      }
      return true; // Killed
    }
    return false;
  }
}
