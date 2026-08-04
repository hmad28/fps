import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { MaterialNormalizer, FactionIdentity } from './MaterialNormalizer';

export class AssetLoader {
  private static instance: AssetLoader;
  private loader: GLTFLoader = new GLTFLoader();
  private loadedGLTFs: Map<string, any> = new Map();
  private normalizer = MaterialNormalizer.getInstance();

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  public preloadAssets(onComplete?: () => void) {
    const assetsToLoad = [
      { id: 'soldier', path: '/models/soldier.glb', faction: 'iron' as FactionIdentity },
      { id: 'robot', path: '/models/robot.glb', faction: 'iron' as FactionIdentity },
      { id: 'lamp', path: '/models/lamp.glb', faction: 'environment' as FactionIdentity },
      { id: 'crate', path: '/models/crate.glb', faction: 'environment' as FactionIdentity },
      { id: 'vehicle', path: '/models/vehicle.glb', faction: 'environment' as FactionIdentity },
    ];

    let loadedCount = 0;
    assetsToLoad.forEach((asset) => {
      this.loader.load(
        asset.path,
        (gltf) => {
          this.normalizer.normalizeModel(gltf.scene, asset.faction);
          this.loadedGLTFs.set(asset.id, gltf);
          loadedCount++;
          if (loadedCount === assetsToLoad.length && onComplete) {
            onComplete();
          }
        },
        undefined,
        (err) => {
          console.warn(`Failed loading asset ${asset.id}:`, err);
          loadedCount++;
          if (loadedCount === assetsToLoad.length && onComplete) {
            onComplete();
          }
        }
      );
    });
  }

  public getModel(id: string): THREE.Group | null {
    const gltf = this.loadedGLTFs.get(id);
    if (!gltf) return null;
    const cloned = SkeletonUtils.clone(gltf.scene) as THREE.Group;
    cloned.traverse((c: any) => {
      if (c.isMesh) {
        c.frustumCulled = false;
      }
    });
    return cloned;
  }

  public getGLTF(id: string): any {
    return this.loadedGLTFs.get(id) || null;
  }
}
