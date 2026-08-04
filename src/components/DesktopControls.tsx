import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/core/GameEngine';

interface Props { engineRef: React.RefObject<GameEngine | null>; isPointerLocked: boolean; onLockPointer: () => void; ready: boolean; }

const directionFor = (code: string) => code === 'KeyW' || code === 'ArrowUp' ? 'UP' : code === 'KeyS' || code === 'ArrowDown' ? 'DOWN' : code === 'KeyA' || code === 'ArrowLeft' ? 'LEFT' : code === 'KeyD' || code === 'ArrowRight' ? 'RIGHT' : null;

export const DesktopControls: React.FC<Props> = ({ engineRef, isPointerLocked, onLockPointer, ready }) => {
  const supportHeld = useRef(false);

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (event.code === 'KeyM' && !event.repeat) { window.dispatchEvent(new CustomEvent('blacksite:toggle-map')); return; }
      if (event.code === 'KeyQ') { supportHeld.current = true; engine.supportSystem.isInterfaceOpen = true; return; }
      const direction = directionFor(event.code);
      if ((supportHeld.current || engine.extractionManager.isTerminalActive) && direction) {
        event.preventDefault();
        if (!event.repeat) engine.inputDirection(direction);
        return;
      }
      if (event.code === 'KeyW') engine.player.moveForward = 1;
      if (event.code === 'KeyS') engine.player.moveForward = -1;
      if (event.code === 'KeyA') engine.player.moveRight = -1;
      if (event.code === 'KeyD') engine.player.moveRight = 1;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') engine.player.setSprint(true);
      if (event.code === 'ControlLeft') engine.player.stance = 'CROUCHING';
      if (event.code === 'KeyZ' && !event.repeat) engine.player.stance = engine.player.stance === 'PRONE' ? 'STANDING' : 'PRONE';
      if (event.code === 'Space' && engine.player.isGrounded && !event.repeat) { engine.player.velocity.y = 4.2; engine.player.isGrounded = false; }
      if ((event.code === 'AltLeft' || event.code === 'AltRight') && !event.repeat) engine.player.triggerCombatDive();
      if (event.code === 'KeyR' && !event.repeat) engine.reloadWeapon();
      if (event.code === 'KeyE' && !event.repeat) engine.interact();
      if (event.code === 'KeyX' && !event.repeat) engine.health.useMedInjector();
      if (event.code === 'Digit1') engine.switchWeapon('primary');
      if (event.code === 'Digit2') engine.switchWeapon('secondary');
      if (event.code === 'Digit3') engine.switchWeapon('support');
    };
    const up = (event: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;
      if (event.code === 'KeyW' || event.code === 'KeyS') engine.player.moveForward = 0;
      if (event.code === 'KeyA' || event.code === 'KeyD') engine.player.moveRight = 0;
      if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') engine.player.setSprint(false);
      if (event.code === 'ControlLeft' && engine.player.stance === 'CROUCHING') engine.player.stance = 'STANDING';
      if (event.code === 'KeyQ') { supportHeld.current = false; engine.supportSystem.isInterfaceOpen = false; }
    };
    const mouseDown = (event: MouseEvent) => { if (!engineRef.current || !isPointerLocked) return; if (event.button === 0) engineRef.current.player.isShooting = true; if (event.button === 2) engineRef.current.player.isADS = true; };
    const mouseUp = (event: MouseEvent) => { if (!engineRef.current) return; if (event.button === 0) engineRef.current.player.isShooting = false; if (event.button === 2) engineRef.current.player.isADS = false; };
    const mouseMove = (event: MouseEvent) => { if (engineRef.current && isPointerLocked) engineRef.current.player.applyLook(event.movementX, event.movementY); };
    const wheel = (event: WheelEvent) => { if (!engineRef.current) return; engineRef.current.switchWeapon(event.deltaY > 0 ? 'secondary' : 'primary'); };
    const context = (event: MouseEvent) => event.preventDefault();
    window.addEventListener('keydown', down); window.addEventListener('keyup', up); window.addEventListener('mousedown', mouseDown); window.addEventListener('mouseup', mouseUp); window.addEventListener('mousemove', mouseMove); window.addEventListener('wheel', wheel); window.addEventListener('contextmenu', context);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('mousedown', mouseDown); window.removeEventListener('mouseup', mouseUp); window.removeEventListener('mousemove', mouseMove); window.removeEventListener('wheel', wheel); window.removeEventListener('contextmenu', context); };
  }, [engineRef, isPointerLocked]);

  if (isPointerLocked) return null;
  return (
    <button className="pointer-gate" onClick={onLockPointer} disabled={!ready}>
      <span className="pointer-gate__eyebrow">A.E.G.I.S. // FIELD LINK</span>
      <strong>{ready ? 'Click to assume control' : 'Descent telemetry synchronizing'}</strong>
      <span>{ready ? 'Pointer lock required · Esc releases control' : 'Loading local operation assets'}</span>
    </button>
  );
};
