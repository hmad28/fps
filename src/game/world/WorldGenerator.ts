import * as THREE from 'three';
import { POIManager } from './POIManager';
import { OutpostBuilder } from './OutpostBuilder';
import { AssetLoader } from '../assets/AssetLoader';

export type BiomeType = 'ashen_frontier' | 'verdant_colony' | 'forge_city';

export interface OperationWorld {
  scene: THREE.Scene;
  obstacles: THREE.Box3[];
  obstacleMeshes: THREE.Object3D[];
  poiManager: POIManager;
  outpostBuilder: OutpostBuilder;
  biome: BiomeType;
  mapSize: number; // 450m diameter
}

export class WorldGenerator {
  public generateWorld(scene: THREE.Scene, biome: BiomeType = 'forge_city'): OperationWorld {
    const mapSize = 450; // 450 meters playable diameter
    const obstacles: THREE.Box3[] = [];
    const obstacleMeshes: THREE.Object3D[] = [];

    // 1. Terrain Color & Lighting based on Biome
    let fogColor = 0x0f172a;
    let groundColor = 0x18181b;
    let ambientColor = 0x334155;
    let sunColor = 0xf59e0b;

    if (biome === 'ashen_frontier') {
      fogColor = 0x1c1917;
      groundColor = 0x0c0a09; // Volcanic dark soil
      ambientColor = 0x78350f;
      sunColor = 0xf97316; // Crimson horizon
    } else if (biome === 'verdant_colony') {
      fogColor = 0x064e3b;
      groundColor = 0x022c22; // Muddy forest green
      ambientColor = 0x047857;
      sunColor = 0x38bdf8;
    } else if (biome === 'forge_city') {
      fogColor = 0x090d16;
      groundColor = 0x0f172a; // Concrete slate industrial
      ambientColor = 0x1e293b;
      sunColor = 0x38bdf8;
    }

    scene.fog = new THREE.FogExp2(fogColor, 0.012);

    const ambientLight = new THREE.AmbientLight(ambientColor, 0.7);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(sunColor, 1.2);
    sunLight.position.set(100, 150, 80);
    sunLight.castShadow = true;
    scene.add(sunLight);

    // 2. Large Ground Surface Plane (450m x 450m)
    const floorGeo = new THREE.PlaneGeometry(mapSize, mapSize);
    const floorMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.8,
      metalness: 0.2,
    });
    const floorMesh = new THREE.Mesh(floorGeo, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.receiveShadow = true;
    scene.add(floorMesh);
    obstacleMeshes.push(floorMesh);

    // 3. Boundary Walls
    const wallHeight = 25;
    const half = mapSize / 2;
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x020617 });

    const addWall = (x: number, z: number, w: number, d: number) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, wallHeight, d), wallMat);
      mesh.position.set(x, wallHeight / 2, z);
      scene.add(mesh);
      obstacles.push(new THREE.Box3().setFromObject(mesh));
    };

    addWall(0, -half, mapSize, 6);
    addWall(0, half, mapSize, 6);
    addWall(-half, 0, 6, mapSize);
    addWall(half, 0, 6, mapSize);

    // 4. Place 3D GLTF Props (Lamps, Crates, Vehicles)
    const loader = AssetLoader.getInstance();

    // 3D Lamps
    for (let i = 0; i < 8; i++) {
      const lamp = loader.getModel('lamp');
      if (lamp) {
        lamp.scale.set(0.015, 0.015, 0.015);
        lamp.position.set((Math.random() - 0.5) * 300, 0, (Math.random() - 0.5) * 300);
        scene.add(lamp);
        obstacles.push(new THREE.Box3().setFromObject(lamp));
      }
    }

    // 3D Supply Crates
    for (let i = 0; i < 12; i++) {
      const crate = loader.getModel('crate');
      if (crate) {
        crate.scale.set(0.9, 0.9, 0.9);
        crate.position.set((Math.random() - 0.5) * 320, 0, (Math.random() - 0.5) * 320);
        scene.add(crate);
        obstacles.push(new THREE.Box3().setFromObject(crate));
      }
    }

    // 3D Vehicles
    for (let i = 0; i < 4; i++) {
      const veh = loader.getModel('vehicle');
      if (veh) {
        veh.scale.set(1.6, 1.6, 1.6);
        veh.position.set((Math.random() - 0.5) * 280, 0, (Math.random() - 0.5) * 280);
        scene.add(veh);
        obstacles.push(new THREE.Box3().setFromObject(veh));
      }
    }

    // 5. POIs & Outposts
    const poiManager = new POIManager();
    poiManager.generatePOIs(scene, obstacles);

    const outpostBuilder = new OutpostBuilder();
    outpostBuilder.buildOutposts(scene, obstacles);

    return {
      scene,
      obstacles,
      obstacleMeshes,
      poiManager,
      outpostBuilder,
      biome,
      mapSize,
    };
  }
}
