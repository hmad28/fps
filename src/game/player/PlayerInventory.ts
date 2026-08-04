import { WEAPON_DEFINITIONS, WeaponDef } from '../weapons/WeaponDefinition';

export interface MagazineState {
  currentClip: number;
  reserveMags: number;
}

export type GrenadeType = 'fragmentation' | 'incendiary' | 'emp' | 'smoke' | 'thermite';
export type ArmorType = 'light' | 'medium' | 'heavy';

export class PlayerInventory {
  public primaryWeaponId: string = 'ar_vanguard';
  public secondaryWeaponId: string = 'pistol_defender';
  public selectedWeaponSlot: 'primary' | 'secondary' = 'primary';

  public magazineStates: Record<string, MagazineState> = {};
  public grenadeType: GrenadeType = 'fragmentation';
  public grenadesCount: number = 4;
  public maxGrenades: number = 4;

  public armorType: ArmorType = 'medium';
  public samplesCollected: number = 0; // Operation resources carried

  constructor() {
    this.initInventory();
  }

  public initInventory() {
    Object.keys(WEAPON_DEFINITIONS).forEach((id) => {
      const def = WEAPON_DEFINITIONS[id];
      this.magazineStates[id] = {
        currentClip: def.magazineSize,
        reserveMags: def.maxReserveMags,
      };
    });
  }

  public getActiveWeapon(): WeaponDef {
    const id = this.selectedWeaponSlot === 'primary' ? this.primaryWeaponId : this.secondaryWeaponId;
    return WEAPON_DEFINITIONS[id] || WEAPON_DEFINITIONS['ar_vanguard'];
  }

  public getActiveMagState(): MagazineState {
    const weapon = this.getActiveWeapon();
    return this.magazineStates[weapon.id];
  }

  // TACTICAL MAGAZINE RELOAD: Discards remaining rounds in discarded magazine!
  public reloadActiveWeapon(): boolean {
    const weapon = this.getActiveWeapon();
    const state = this.magazineStates[weapon.id];

    if (!state || state.reserveMags <= 0 || state.currentClip >= weapon.magazineSize) {
      return false;
    }

    // DISCARD remaining rounds in removed magazine (creating tactical magazine discipline)
    state.currentClip = weapon.magazineSize;
    state.reserveMags -= 1;
    return true;
  }

  public consumeActiveBullet(): boolean {
    const state = this.getActiveMagState();
    if (state.currentClip > 0) {
      state.currentClip--;
      return true;
    }
    return false;
  }

  public switchWeaponSlot(slot: 'primary' | 'secondary') {
    this.selectedWeaponSlot = slot;
  }
}
