import * as THREE from 'three';

export type FactionIdentity = 'aegis' | 'brood' | 'iron' | 'astral' | 'environment';

export class MaterialNormalizer {
  private static instance: MaterialNormalizer;
  private factionPalette: Record<FactionIdentity, { primary: number; secondary: number; emissive: number; roughness: number; metalness: number }> = {
    aegis: {
      primary: 0x334155, // Slate military graphite
      secondary: 0x475569,
      emissive: 0xf59e0b, // Amber operational accent
      roughness: 0.4,
      metalness: 0.7,
    },
    brood: {
      primary: 0x27272a, // Dark biological chitin
      secondary: 0x71717a, // Bone grey
      emissive: 0x22c55e, // Toxic green bio-luminescence
      roughness: 0.7,
      metalness: 0.1,
    },
    iron: {
      primary: 0x18181b, // Charcoal industrial steel
      secondary: 0x3f3f46,
      emissive: 0xef4444, // Red sensor optic
      roughness: 0.3,
      metalness: 0.85,
    },
    astral: {
      primary: 0x0f172a, // Deep void ceramic
      secondary: 0x38bdf8,
      emissive: 0xa855f7, // Violet plasma warp energy
      roughness: 0.2,
      metalness: 0.6,
    },
    environment: {
      primary: 0x1e293b,
      secondary: 0x475569,
      emissive: 0x000000,
      roughness: 0.8,
      metalness: 0.2,
    },
  };

  public static getInstance(): MaterialNormalizer {
    if (!MaterialNormalizer.instance) {
      MaterialNormalizer.instance = new MaterialNormalizer();
    }
    return MaterialNormalizer.instance;
  }

  public normalizeModel(scene: THREE.Object3D, faction: FactionIdentity) {
    const palette = this.factionPalette[faction];

    scene.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.frustumCulled = false; // Prevent unwanted model culling

        if (child.material) {
          const mat = child.material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            mat.roughness = palette.roughness;
            mat.metalness = palette.metalness;
            mat.depthWrite = true;
          }
        }
      }
    });
  }

  public getFactionColor(faction: FactionIdentity): number {
    return this.factionPalette[faction].emissive;
  }
}
