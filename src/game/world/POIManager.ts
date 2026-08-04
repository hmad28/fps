import * as THREE from 'three';
import { AssetLoader } from '../assets/AssetLoader';

export type POIReward = 'ANTI_ARMOR' | 'SAMPLE' | 'AMMO' | 'MEDICAL';
export interface POI {
  id: string;
  name: string;
  type: 'crashed_transport' | 'research_trailer' | 'fuel_depot' | 'bunker' | 'supply_pod';
  position: THREE.Vector3;
  mesh: THREE.Group;
  reward: POIReward;
  looted: boolean;
}

export class POIManager {
  public pois: POI[] = [];

  public generatePOIs(scene: THREE.Scene, obstacles: THREE.Box3[]) {
    const loader = AssetLoader.getInstance();
    const sites: Array<[number, number, POI['type'], POIReward]> = [
      [-78, -106, 'crashed_transport', 'ANTI_ARMOR'],
      [88, -86, 'research_trailer', 'SAMPLE'],
      [-126, 68, 'fuel_depot', 'AMMO'],
      [112, 118, 'bunker', 'SAMPLE'],
      [-57, 142, 'supply_pod', 'MEDICAL'],
      [72, -146, 'crashed_transport', 'SAMPLE'],
      [143, 52, 'research_trailer', 'AMMO'],
      [-148, -8, 'bunker', 'SAMPLE'],
    ];

    sites.forEach(([x, z, type, reward], index) => {
      const group = new THREE.Group();
      group.position.set(x, 0, z);
      const shell = loader.getModel(type === 'supply_pod' ? 'crate' : type === 'bunker' ? 'door' : 'container_wide');
      if (shell) {
        shell.scale.setScalar(type === 'bunker' ? 3.2 : 2.4);
        shell.rotation.y = (index * 1.7) % Math.PI;
        group.add(shell);
      }
      const cache = loader.getModel(reward === 'ANTI_ARMOR' ? 'rifle' : 'crate');
      if (cache) {
        cache.name = 'poi_reward';
        cache.scale.setScalar(reward === 'ANTI_ARMOR' ? 1.6 : 0.8);
        cache.position.set(0, 1.1, 2.2);
        cache.rotation.y = Math.PI / 2;
        group.add(cache);
      }
      const beacon = new THREE.PointLight(0xd69d52, 3.5, 18);
      beacon.position.set(0, 2.4, 1.8);
      group.add(beacon);
      scene.add(group);
      obstacles.push(new THREE.Box3().setFromObject(group).expandByScalar(-0.35));
      this.pois.push({ id: `poi_${index}`, name: type.replaceAll('_', ' ').toUpperCase(), type, reward, position: group.position.clone(), mesh: group, looted: false });
    });
  }

  public nearestLootable(position: THREE.Vector3, range = 4.5): POI | null {
    return this.pois.find((poi) => !poi.looted && poi.position.distanceTo(position) <= range) ?? null;
  }

  public loot(poi: POI): POIReward {
    poi.looted = true;
    const rewardModel = poi.mesh.getObjectByName('poi_reward');
    if (rewardModel) rewardModel.visible = false;
    poi.mesh.traverse((child) => {
      if (child instanceof THREE.PointLight) child.color.setHex(0x39413c);
    });
    return poi.reward;
  }
}
