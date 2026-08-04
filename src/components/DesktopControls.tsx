import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/core/GameEngine';

interface DesktopControlsProps {
  engineRef: React.RefObject<GameEngine | null>;
  isPointerLocked: boolean;
  onLockPointer: () => void;
}

export const DesktopControls: React.FC<DesktopControlsProps> = ({
  engineRef,
  isPointerLocked,
  onLockPointer,
}) => {
  const isQPressed = useRef(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const engine = engineRef.current;

      const code = e.code;

      if (code === 'KeyW') engine.player.moveForward = 1;
      if (code === 'KeyS') engine.player.moveForward = -1;
      if (code === 'KeyA') engine.player.moveRight = -1;
      if (code === 'KeyD') engine.player.moveRight = 1;

      if (code === 'ShiftLeft' || code === 'ShiftRight') engine.player.setSprint(true);
      if (code === 'ControlLeft') engine.player.stance = 'CROUCHING';
      if (code === 'KeyZ') engine.player.stance = 'PRONE';

      if (code === 'Space') {
        if (engine.player.isGrounded) {
          engine.player.velocity.y = 5.5;
          engine.player.isGrounded = false;
        }
      }

      if (code === 'AltLeft' || code === 'AltRight') {
        engine.player.triggerCombatDive();
      }

      if (code === 'KeyR') engine.reloadWeapon();
      if (code === 'KeyE') engine.interact();
      if (code === 'KeyX') engine.health.useMedInjector();

      // Q: Command Support Terminal Sequence Direction Inputs
      if (code === 'KeyQ') {
        isQPressed.current = true;
        engine.supportSystem.isInterfaceOpen = true;
      }

      if (isQPressed.current) {
        if (code === 'ArrowUp' || code === 'KeyW') engine.triggerCommandSupportInput('UP');
        if (code === 'ArrowDown' || code === 'KeyS') engine.triggerCommandSupportInput('DOWN');
        if (code === 'ArrowLeft' || code === 'KeyA') engine.triggerCommandSupportInput('LEFT');
        if (code === 'ArrowRight' || code === 'KeyD') engine.triggerCommandSupportInput('RIGHT');
      }

      // Slot weapons
      if (code === 'Digit1') engine.inventory.switchWeaponSlot('primary');
      if (code === 'Digit2') engine.inventory.switchWeaponSlot('secondary');
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!engineRef.current) return;
      const engine = engineRef.current;

      const code = e.code;

      if (code === 'KeyW' || code === 'KeyS') engine.player.moveForward = 0;
      if (code === 'KeyA' || code === 'KeyD') engine.player.moveRight = 0;

      if (code === 'ShiftLeft' || code === 'ShiftRight') engine.player.setSprint(false);
      if (code === 'ControlLeft' || code === 'KeyZ') engine.player.stance = 'STANDING';

      if (code === 'KeyQ') {
        isQPressed.current = false;
        engine.supportSystem.isInterfaceOpen = false;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (!engineRef.current || !isPointerLocked) return;
      if (e.button === 0) engineRef.current.player.isShooting = true;
      if (e.button === 2) engineRef.current.player.isADS = true;
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (!engineRef.current) return;
      if (e.button === 0) engineRef.current.player.isShooting = false;
      if (e.button === 2) engineRef.current.player.isADS = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!engineRef.current || !isPointerLocked) return;
      engineRef.current.player.applyLook(e.movementX, e.movementY);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [engineRef, isPointerLocked]);

  return (
    <div className="absolute inset-0 z-20 pointer-events-auto cursor-crosshair">
      {!isPointerLocked && (
        <div
          onClick={onLockPointer}
          className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm flex flex-col items-center justify-center text-white p-6 cursor-pointer"
        >
          <div className="text-3xl font-black text-cyan-400 tracking-widest uppercase mb-2">
            BLACKSITE: FRONTLINE DESCENT
          </div>
          <div className="text-sm font-mono text-slate-300 mb-6">
            CLICK TO DEPLOY ON BATTLEFIELD & ENGAGE POINTER LOCK
          </div>

          <div className="bg-slate-900 border border-slate-700 p-4 rounded-xl max-w-md text-xs font-mono space-y-1 text-slate-300">
            <div>• <b className="text-white">WASD</b>: Ground Movement</div>
            <div>• <b className="text-white">SHIFT</b>: Sprint (Stamina)</div>
            <div>• <b className="text-white">ALT</b>: Tactical Combat Dive</div>
            <div>• <b className="text-white">HOLD Q</b>: Command Support Sequence Wrist Unit</div>
            <div>• <b className="text-white">E</b>: Interact / Objective Terminal / Extraction</div>
            <div>• <b className="text-white">R</b>: Reload (Discards Remaining Mag Clip)</div>
            <div>• <b className="text-white">X</b>: Med-Injector (Heals & Repairs Injured Limbs)</div>
          </div>
        </div>
      )}
    </div>
  );
};
