import * as THREE from 'three';
import { POIManager } from './POIManager';
import { OutpostBuilder } from './OutpostBuilder';
import { AssetLoader } from '../assets/AssetLoader';

export type BiomeType = 'ashen_frontier' | 'verdant_colony' | 'forge_city';

export interface OperationWorld {
  scene: THREE.Scene;
  obstacles: THREE.Box3[];
  obstacleMeshes: THREE.Object3D[];
  coverNodes: THREE.Vector3[];
  poiManager: POIManager;
  outpostBuilder: OutpostBuilder;
  biome: BiomeType;
  mapSize: number;
}

const authoredSites = [
  { x: -120, z: -74, rot: 0.15, scale: 2.4 },
  { x: 112, z: -118, rot: -0.4, scale: 2.1 },
  { x: -104, z: 104, rot: 0.6, scale: 1.8 },
  { x: 78, z: 76, rot: -0.2, scale: 2.7 },
  { x: 4, z: -126, rot: 0, scale: 3.1 },
];

export class WorldGenerator {
  public generateWorld(scene: THREE.Scene, biome: BiomeType = 'forge_city'): OperationWorld {
    const mapSize = 420;
    const obstacles: THREE.Box3[] = [];
    const obstacleMeshes: THREE.Object3D[] = [];
    const coverNodes: THREE.Vector3[] = [];
    const loader = AssetLoader.getInstance();

    scene.background = new THREE.Color(0x1a211f);
    scene.fog = new THREE.Fog(0x252e2b, 105, 325);
    scene.add(new THREE.HemisphereLight(0xb7cbc4, 0x291a12, 2.05));
    const sun = new THREE.DirectionalLight(0xffb36b, 3.1);
    sun.position.set(-90, 140, 70);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -130;
    sun.shadow.camera.right = 130;
    sun.shadow.camera.top = 130;
    sun.shadow.camera.bottom = -130;
    scene.add(sun);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(mapSize, mapSize, 24, 24),
      new THREE.MeshStandardMaterial({ color: 0x343836, roughness: 0.98, metalness: 0.04 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = 'terrain';
    scene.add(ground);
    obstacleMeshes.push(ground);

    // Broken arterial roads establish readable long-range routes while leaving large quiet gaps.
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x161b1c, roughness: 0.9 });
    for (const road of [
      { x: 0, z: 0, w: 18, d: 390, r: 0 },
      { x: 0, z: -38, w: 340, d: 15, r: 0 },
      { x: 34, z: 52, w: 250, d: 13, r: 0.46 },
    ]) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(road.w, road.d), roadMaterial);
      mesh.rotation.x = -Math.PI / 2;
      mesh.rotation.z = road.r;
      mesh.position.set(road.x, 0.025, road.z);
      scene.add(mesh);
    }

    const placeModel = (id: string, position: THREE.Vector3, scale: number, rotation = 0, collide = true) => {
      const model = loader.getModel(id);
      if (!model) return null;
      model.position.copy(position);
      model.rotation.y = rotation;
      model.scale.setScalar(scale);
      scene.add(model);
      if (collide) {
        const box = new THREE.Box3().setFromObject(model);
        obstacles.push(box);
        obstacleMeshes.push(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        coverNodes.push(center.clone().add(new THREE.Vector3(size.x * 0.58 + 1, 0, 0)));
        coverNodes.push(center.clone().add(new THREE.Vector3(-size.x * 0.58 - 1, 0, 0)));
      }
      return model;
    };

    // Authored industrial blocks assembled from CC0 modular meshes, not primitive buildings.
    authoredSites.forEach((site, siteIndex) => {
      const base = new THREE.Vector3(site.x, 0, site.z);
      const ring = siteIndex === 4 ? 10 : 6;
      for (let i = 0; i < ring; i++) {
        const angle = (i / ring) * Math.PI * 2 + site.rot;
        const distance = 6.5 * site.scale;
        placeModel(
          i % 3 === 0 ? 'pillar' : 'wall',
          base.clone().add(new THREE.Vector3(Math.cos(angle) * distance, 0, Math.sin(angle) * distance)),
          site.scale,
          -angle + Math.PI / 2,
        );
      }
      placeModel('door', base, site.scale * 1.2, site.rot, false);
      if (siteIndex % 2 === 0) placeModel('pipe_bend', base.clone().add(new THREE.Vector3(5, 0, -4)), site.scale * 1.3, site.rot, true);
    });

    // Freight lanes and wrecks create cover without uniformly filling the region.
    const freight = [
      [-42, -12, 0.2], [49, -53, 1.5], [-68, 63, 0.9], [95, 20, 0.1],
      [18, 107, 1.4], [-142, 12, 0.4], [136, 92, 1.1], [37, -151, 0.3],
    ];
    freight.forEach(([x, z, r], index) => {
      placeModel(index % 2 ? 'container_tall' : 'container_wide', new THREE.Vector3(x, 0, z), 2.8, r, true);
      if (index % 3 === 0) placeModel('crate', new THREE.Vector3(x + 4, 0, z + 3), 1.6, r + 0.3, true);
    });

    // The central descent route reads as an industrial district rather than an empty arena.
    for (let z = -158, index = 0; z <= 136; z += 34, index++) {
      for (const side of [-1, 1]) {
        const x = side * (27 + (index % 3) * 6);
        placeModel(index % 2 ? 'wall' : 'pillar', new THREE.Vector3(x, 0, z + side * 5), 4.8 + (index % 2), side < 0 ? Math.PI / 2 : -Math.PI / 2, true);
        if (index % 2 === 0) placeModel('container_wide', new THREE.Vector3(x - side * 6, 0, z + 9), 2.6, index * 0.4, true);
      }
    }

    // Smoke columns and warm industrial glows make distant activity legible across the region.
    [[-118, -70], [108, -116], [-102, 102], [78, 76]].forEach(([x, z], index) => {
      const smoke = new THREE.Mesh(
        new THREE.CylinderGeometry(2.5, 8 + index, 58, 12, 1, true),
        new THREE.MeshBasicMaterial({ color: 0x212725, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
      );
      smoke.position.set(x, 31, z);
      scene.add(smoke);
      const glow = new THREE.PointLight(0xd66d37, 6, 46);
      glow.position.set(x, 5, z);
      scene.add(glow);
    });

    // Distant skyline: actual modular model silhouettes; collision is unnecessary outside traversal lanes.
    for (let i = 0; i < 44; i++) {
      const angle = (i / 44) * Math.PI * 2;
      const radius = 175 + (i % 4) * 7;
      const model = loader.getModel(i % 2 ? 'pillar' : 'wall');
      if (!model) continue;
      const heightScale = 8 + (i % 7) * 2.2;
      model.scale.set(5.5, heightScale, 5.5);
      model.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      model.rotation.y = -angle;
      scene.add(model);
    }

    // Soft map edge is a hazard perimeter, not an arena wall.
    const perimeter = new THREE.Mesh(
      new THREE.RingGeometry(194, 210, 96),
      new THREE.MeshBasicMaterial({ color: 0xd56b31, transparent: true, opacity: 0.12, side: THREE.DoubleSide }),
    );
    perimeter.rotation.x = -Math.PI / 2;
    perimeter.position.y = 0.04;
    scene.add(perimeter);

    const poiManager = new POIManager();
    poiManager.generatePOIs(scene, obstacles);
    const outpostBuilder = new OutpostBuilder();
    outpostBuilder.buildOutposts(scene, obstacles);

    return { scene, obstacles, obstacleMeshes, coverNodes, poiManager, outpostBuilder, biome, mapSize };
  }
}
