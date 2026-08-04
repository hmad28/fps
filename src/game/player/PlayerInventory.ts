import { WEAPON_DEFINITIONS, WeaponDef } from '../weapons/WeaponDefinition';

export interface MagazineState { currentClip: number; reserveMags: number; }
export type GrenadeType = 'fragmentation' | 'incendiary' | 'emp' | 'smoke' | 'thermite';
export type ArmorType = 'light' | 'medium' | 'heavy';
export type WeaponSlot = 'primary' | 'secondary' | 'support';

export class PlayerInventory {
  public primaryWeaponId = 'ar_vanguard';
  public secondaryWeaponId = 'pistol_defender';
  public supportWeaponId: string | null = null;
  public selectedWeaponSlot: WeaponSlot = 'primary';
  public magazineStates: Record<string, MagazineState> = {};
  public grenadeType: GrenadeType = 'fragmentation';
  public grenadesCount = 4;
  public maxGrenades = 4;
  public armorType: ArmorType = 'medium';
  public samplesCollected = 0;

  constructor() { this.initInventory(); }

  public initInventory() {
    Object.values(WEAPON_DEFINITIONS).forEach((weapon) => {
      this.magazineStates[weapon.id] = { currentClip: weapon.magazineSize, reserveMags: weapon.maxReserveMags };
    });
  }

  public getActiveWeapon(): WeaponDef {
    const id = this.selectedWeaponSlot === 'primary' ? this.primaryWeaponId : this.selectedWeaponSlot === 'secondary' ? this.secondaryWeaponId : this.supportWeaponId;
    return WEAPON_DEFINITIONS[id ?? 'ar_vanguard'] ?? WEAPON_DEFINITIONS.ar_vanguard;
  }

  public getActiveMagState() { return this.magazineStates[this.getActiveWeapon().id]; }

  public reloadActiveWeapon(): boolean {
    const weapon = this.getActiveWeapon();
    const state = this.magazineStates[weapon.id];
    const capacity = weapon.magazineSize + (state.currentClip > 0 ? 1 : 0);
    if (!state || state.reserveMags <= 0 || state.currentClip >= capacity) return false;
    // The removed magazine and every round still inside it are discarded.
    state.currentClip = capacity;
    state.reserveMags -= 1;
    return true;
  }

  public consumeActiveBullet() {
    const state = this.getActiveMagState();
    if (state.currentClip <= 0) return false;
    state.currentClip--;
    return true;
  }

  public switchWeaponSlot(slot: WeaponSlot) {
    if (slot === 'support' && !this.supportWeaponId) return false;
    this.selectedWeaponSlot = slot;
    return true;
  }

  public collectAntiArmor() {
    this.supportWeaponId = 'aa_manticore';
    this.magazineStates.aa_manticore = { currentClip: 1, reserveMags: 2 };
    this.selectedWeaponSlot = 'support';
  }

  public resupply() {
    Object.values(WEAPON_DEFINITIONS).forEach((weapon) => {
      const state = this.magazineStates[weapon.id];
      state.reserveMags = Math.min(weapon.maxReserveMags, state.reserveMags + Math.ceil(weapon.maxReserveMags / 2));
    });
    this.grenadesCount = this.maxGrenades;
  }
}
