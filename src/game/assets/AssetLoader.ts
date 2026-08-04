import * as THREE from 'three';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MaterialNormalizer, FactionIdentity } from './MaterialNormalizer';

interface AssetDefinition {
  id: string;
  path: string;
  faction: FactionIdentity;
}

const ASSETS: AssetDefinition[] = [
  { id: 'robot', path: '/models/robot.glb', faction: 'iron' },
  { id: 'rifle', path: '/models/kenney/blaster/blaster-r.glb', faction: 'aegis' },
  { id: 'rifle_mag', path: '/models/kenney/blaster/clip-large.glb', faction: 'aegis' },
  { id: 'grenade', path: '/models/kenney/blaster/grenade-a.glb', faction: 'aegis' },
  { id: 'terminal', path: '/models/kenney/station/computer-system.glb', faction: 'environment' },
  { id: 'container_tall', path: '/models/kenney/station/container-tall.glb', faction: 'environment' },
  { id: 'container_wide', path: '/models/kenney/station/container-wide.glb', faction: 'environment' },
  { id: 'crate', path: '/models/kenney/blaster/crate-medium.glb', faction: 'environment' },
  { id: 'door', path: '/models/kenney/station/door-double-closed.glb', faction: 'environment' },
  { id: 'pipe', path: '/models/kenney/station/pipe.glb', faction: 'environment' },
  { id: 'pipe_bend', path: '/models/kenney/station/pipe-bend.glb', faction: 'environment' },
  { id: 'rail', path: '/models/kenney/station/rail.glb', faction: 'environment' },
  { id: 'stairs', path: '/models/kenney/station/stairs.glb', faction: 'environment' },
  { id: 'wall', path: '/models/kenney/station/wall-detail.glb', faction: 'environment' },
  { id: 'pillar', path: '/models/kenney/station/wall-pillar.glb', faction: 'environment' },
];

export class AssetLoader {
  private static instance: AssetLoader;
  private loader = new GLTFLoader();
  private loadedGLTFs = new Map<string, GLTF>();
  private loadingPromise: Promise<void> | null = null;
  private normalizer = MaterialNormalizer.getInstance();

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) AssetLoader.instance = new AssetLoader();
    return AssetLoader.instance;
  }

  public preloadAssets(): Promise<void> {
    if (this.loadingPromise) return this.loadingPromise;
    this.loadingPromise = Promise.all(
      ASSETS.map(async (asset) => {
        try {
          const gltf = await this.loader.loadAsync(asset.path);
          this.normalizer.normalizeModel(gltf.scene, asset.faction);
          this.loadedGLTFs.set(asset.id, gltf);
        } catch (error) {
          console.warn(`[assets] ${asset.id} unavailable`, error);
        }
      }),
    ).then(() => undefined);
    return this.loadingPromise;
  }

  public getModel(id: string): THREE.Group | null {
    const gltf = this.loadedGLTFs.get(id);
    if (!gltf) return null;
    const clone = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }

  public getGLTF(id: string): GLTF | null {
    return this.loadedGLTFs.get(id) ?? null;
  }
}
