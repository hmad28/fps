import * as THREE from 'three';
import assert from 'node:assert/strict';
import { PlayerInventory } from '../src/game/player/PlayerInventory';
import { EnemyAgent } from '../src/game/ai/EnemyAgent';
import { ObjectiveManager } from '../src/game/missions/ObjectiveManager';
import { ExtractionManager } from '../src/game/missions/ExtractionManager';
import { SUPPORT_CATALOG } from '../src/game/support/CommandSupportSystem';

const inventory = new PlayerInventory();
for (let i = 0; i < 11; i++) assert.equal(inventory.consumeActiveBullet(), true);
assert.equal(inventory.getActiveMagState().currentClip, 19);
assert.equal(inventory.reloadActiveWeapon(), true);
assert.equal(inventory.getActiveMagState().currentClip, 31, 'partial reload keeps chambered round but discards the removed magazine');
assert.equal(inventory.getActiveMagState().reserveMags, 4);

const caller = new EnemyAgent('caller', 'Legion Rifleman', 'iron', 'legion_rifleman', 54, new THREE.Vector3());
caller.state = 'CALL_REINFORCEMENT';
caller.takeDamage(10, 'rightArm', 2);
assert.equal(caller.state, 'ENGAGE', 'damaging a caller interrupts its reinforcement action');

const objectives = new ObjectiveManager();
objectives.onOutpostDestroyed('outpost_1');
assert.equal(objectives.step, 'REROUTE_POWER');

const extraction = new ExtractionManager();
extraction.isExtractionAvailable = true;
assert.equal(extraction.beginTerminal(extraction.extractionZonePos.clone()), true);
for (const direction of extraction.code) extraction.inputDirection(direction);
assert.equal(extraction.isExtractionCalled, true);

assert.equal(Object.keys(SUPPORT_CATALOG).length, 16);
assert.equal(new Set(Object.values(SUPPORT_CATALOG).map((item) => item.codeSequence.join('-'))).size, 16, 'support sequences must be unique');

console.log('gameplay_checks: ok');
