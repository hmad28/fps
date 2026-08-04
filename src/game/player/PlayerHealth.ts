export type BodyZone = 'HEAD' | 'TORSO' | 'LEFT_ARM' | 'RIGHT_ARM' | 'LEFT_LEG' | 'RIGHT_LEG';

export interface InjuryState {
  head: boolean;
  torso: boolean;
  leftArm: boolean;
  rightArm: boolean;
  leftLeg: boolean;
  rightLeg: boolean;
}

export class PlayerHealth {
  public maxHealth: number = 100;
  public health: number = 100;
  public maxShield: number = 0;
  public shield: number = 0;

  public injuries: InjuryState = {
    head: false,
    torso: false,
    leftArm: false,
    rightArm: false,
    leftLeg: false,
    rightLeg: false,
  };

  public medInjectors: number = 3;
  public maxInjectors: number = 4;
  public staminaBoostTimer: number = 0;

  public takeDamage(amount: number, zone: BodyZone = 'TORSO'): boolean {
    let actualDamage = amount;

    this.health = Math.max(0, this.health - actualDamage);

    // Dynamic body injury chance
    if (actualDamage > 15) {
      if (zone === 'LEFT_ARM' || zone === 'RIGHT_ARM') {
        this.injuries[zone === 'LEFT_ARM' ? 'leftArm' : 'rightArm'] = true;
      } else if (zone === 'LEFT_LEG' || zone === 'RIGHT_LEG') {
        this.injuries[zone === 'LEFT_LEG' ? 'leftLeg' : 'rightLeg'] = true;
      } else if (zone === 'TORSO' && actualDamage > 25) {
        this.injuries.torso = true;
      }
    }

    return this.health <= 0;
  }

  public useMedInjector(): boolean {
    if (this.medInjectors <= 0 || (this.health >= this.maxHealth && !this.hasInjuries())) {
      return false;
    }

    this.medInjectors--;
    this.health = Math.min(this.maxHealth, this.health + 75);

    // Repair all physical injuries
    this.injuries = {
      head: false,
      torso: false,
      leftArm: false,
      rightArm: false,
      leftLeg: false,
      rightLeg: false,
    };

    // Temporarily boost stamina regen for 10s
    this.staminaBoostTimer = 10.0;
    return true;
  }

  public hasInjuries(): boolean {
    return Object.values(this.injuries).some((val) => val);
  }

  public hasLegInjury(): boolean {
    return this.injuries.leftLeg || this.injuries.rightLeg;
  }

  public hasArmInjury(): boolean {
    return this.injuries.leftArm || this.injuries.rightArm;
  }

  public update(dt: number) {
    if (this.staminaBoostTimer > 0) {
      this.staminaBoostTimer = Math.max(0, this.staminaBoostTimer - dt);
    }
    if (this.injuries.torso) this.health = Math.max(1, this.health - 0.45 * dt);
  }
}
