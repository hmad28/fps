import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';

export type ObjectiveStep = 'DESTROY_FABRICATOR' | 'REROUTE_POWER' | 'SEVER_RELAYS' | 'PURGE_UPLINK' | 'COMPLETE';

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
  public step: ObjectiveStep = 'DESTROY_FABRICATOR';
  public relaysRemaining = 2;
  public uplinkPosition = new THREE.Vector3(4, 0, -126);
  public fabricatorId = 'outpost_1';
  private powerPosition = new THREE.Vector3(-3, 0, -119);
  private terminalPosition = new THREE.Vector3(4, 0, -122);

  public initObjectives(scene: THREE.Scene) {
    const loader = AssetLoader.getInstance();
    const primaryGroup = new THREE.Group();
    primaryGroup.position.copy(this.uplinkPosition);
    const terminal = loader.getModel('terminal');
    if (terminal) {
      terminal.scale.setScalar(3.4);
      terminal.position.set(0, 0, 4);
      primaryGroup.add(terminal);
    }
    const mast = loader.getModel('pillar');
    if (mast) {
      mast.scale.set(4.5, 9, 4.5);
      primaryGroup.add(mast);
    }
    for (let i = 0; i < 2; i++) {
      const relay = loader.getModel('computer-system');
      const fallback = relay ?? loader.getModel('terminal');
      if (!fallback) continue;
      fallback.name = `uplink_relay_${i}`;
      fallback.userData.kind = 'uplink_relay';
      fallback.userData.relayId = i;
      fallback.scale.setScalar(2.2);
      fallback.position.set(i ? 6 : -6, 0, 0);
      fallback.traverse((child) => {
        child.userData.kind = 'uplink_relay';
        child.userData.relayId = i;
      });
      primaryGroup.add(fallback);
    }
    const light = new THREE.PointLight(0xc34f3c, 8, 30);
    light.name = 'uplink_light';
    light.position.set(0, 7, 0);
    primaryGroup.add(light);
    scene.add(primaryGroup);

    const secondaryGroup = new THREE.Group();
    secondaryGroup.position.set(-126, 0, 68);
    const blackbox = loader.getModel('crate');
    if (blackbox) {
      blackbox.name = 'blackbox';
      blackbox.scale.setScalar(1.4);
      secondaryGroup.add(blackbox);
    }
    scene.add(secondaryGroup);

    this.objectives = [
      { id: 'primary_uplink', title: 'DISABLE MACHINE COMMAND UPLINK', description: 'Cut power, destroy both relays, then purge the command lattice.', type: 'PRIMARY', completed: false, position: this.uplinkPosition.clone(), mesh: primaryGroup },
      { id: 'secondary_blackbox', title: 'RECOVER AEGIS FLIGHT RECORDER', description: 'Recover encrypted flight telemetry from the west fuel depot.', type: 'SECONDARY', completed: false, position: secondaryGroup.position.clone(), mesh: secondaryGroup },
    ];
  }

  public onOutpostDestroyed(id: string) {
    if (id === this.fabricatorId && this.step === 'DESTROY_FABRICATOR') this.step = 'REROUTE_POWER';
  }

  public damageRelay(object: THREE.Object3D): boolean {
    if (this.step !== 'SEVER_RELAYS' || object.userData.kind !== 'uplink_relay' || object.userData.destroyed) return false;
    const relayId = object.userData.relayId;
    const root = this.objectives[0].mesh.getObjectByName(`uplink_relay_${relayId}`);
    if (!root || root.userData.destroyed) return false;
    root.userData.destroyed = true;
    root.visible = false;
    this.relaysRemaining--;
    if (this.relaysRemaining <= 0) this.step = 'PURGE_UPLINK';
    return true;
  }

  public getInteractionPrompt(playerPosition: THREE.Vector3): string | null {
    if (this.step === 'REROUTE_POWER' && playerPosition.distanceTo(this.powerPosition) < 5) return '[E] REROUTE AUXILIARY POWER';
    if (this.step === 'PURGE_UPLINK' && playerPosition.distanceTo(this.terminalPosition) < 5) return '[E] PURGE COMMAND LATTICE';
    const secondary = this.objectives[1];
    if (!secondary.completed && playerPosition.distanceTo(secondary.position) < 4.5) return '[E] RECOVER FLIGHT RECORDER';
    return null;
  }

  public interact(playerPosition: THREE.Vector3): 'POWER' | 'PRIMARY' | 'SECONDARY' | null {
    if (this.step === 'REROUTE_POWER' && playerPosition.distanceTo(this.powerPosition) < 5) {
      this.step = 'SEVER_RELAYS';
      return 'POWER';
    }
    if (this.step === 'PURGE_UPLINK' && playerPosition.distanceTo(this.terminalPosition) < 5) {
      this.step = 'COMPLETE';
      this.objectives[0].completed = true;
      const light = this.objectives[0].mesh.getObjectByName('uplink_light');
      if (light instanceof THREE.PointLight) light.color.setHex(0x6e9a7d);
      return 'PRIMARY';
    }
    const secondary = this.objectives[1];
    if (!secondary.completed && playerPosition.distanceTo(secondary.position) < 4.5) {
      secondary.completed = true;
      secondary.mesh.visible = false;
      return 'SECONDARY';
    }
    return null;
  }

  public getObjectiveText(): string {
    switch (this.step) {
      case 'DESTROY_FABRICATOR': return 'DESTROY OUTPOST FABRICATOR — EAST WORKS';
      case 'REROUTE_POWER': return 'REROUTE AUXILIARY POWER AT THE UPLINK';
      case 'SEVER_RELAYS': return `SEVER COMMAND RELAYS — ${this.relaysRemaining} REMAIN`;
      case 'PURGE_UPLINK': return 'PURGE THE COMMAND LATTICE';
      case 'COMPLETE': return 'PRIMARY COMPLETE — REACH EXTRACTION';
    }
  }

  public isPrimaryComplete() { return this.step === 'COMPLETE'; }
}
