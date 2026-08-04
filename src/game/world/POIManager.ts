import * as THREE from 'three';

export interface POI {
  id: string;
  name: string;
  type: 'crashed_transport' | 'research_trailer' | 'fuel_depot' | 'bunker' | 'supply_pod';
  position: THREE.Vector3;
  mesh: THREE.Group;
  looted: boolean;
}

export class POIManager {
  public pois: POI[] = [];

  public generatePOIs(scene: THREE.Scene, obstacles: THREE.Box3[]) {
    const poiTypes: POI['type'][] = ['crashed_transport', 'research_trailer', 'fuel_depot', 'bunker', 'supply_pod'];

    const poiLocations = [
      { x: -80, z: -110 }, { x: 90, z: -90 },
      { x: -120, z: 70 }, { x: 110, z: 120 },
      { x: -60, z: 140 }, { x: 70, z: -140 },
    ];

    poiLocations.forEach((loc, idx) => {
      const type = poiTypes[idx % poiTypes.length];
      const group = new THREE.Group();
      group.position.set(loc.x, 0, loc.z);

      const baseGeo = new THREE.BoxGeometry(4.0, 2.5, 4.0);
      const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6 });
      const base = new THREE.Mesh(baseGeo, baseMat);
      base.position.y = 1.25;
      group.add(base);

      // Yellow beacon indicator
      const beaconGeo = new THREE.SphereGeometry(0.3, 8, 8);
      const beaconMat = new THREE.MeshBasicMaterial({ color: 0xeab308 });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      beacon.position.y = 2.8;
      group.add(beacon);

      scene.add(group);
      const bbox = new THREE.Box3().setFromObject(group);
      obstacles.push(bbox);

      this.pois.push({
        id: `poi_${idx}`,
        name: `Minor POI #${idx + 1} (${type.replace('_', ' ').toUpperCase()})`,
        type,
        position: group.position.clone(),
        mesh: group,
        looted: false,
      });
    });
  }
}
