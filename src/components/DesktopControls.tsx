import React, { useEffect } from 'react';
import { WeaponId } from '../types';
import { Shield, Target, Zap, Flame, User, Play } from 'lucide-react';

interface DesktopControlsProps {
  containerRef: React.RefObject<HTMLDivElement | null>;
  onMove: (forward: number, right: number) => void;
  onLookDelta: (deltaX: number, deltaY: number) => void;
  onShootStart: () => void;
  onShootEnd: () => void;
  onReload: () => void;
  onJump: () => void;
  onDash: () => void;
  onPauseToggle: () => void;
  onSelectWeapon: (id: WeaponId) => void;
  onSprint: (active: boolean) => void;
  onCrouch: (active: boolean) => void;
  onADS: (active: boolean) => void;
  onEMP: () => void;
  onGrenade: () => void;
  onInteract: () => void;
  isPointerLocked: boolean;
  setIsPointerLocked: (locked: boolean) => void;
  selectedWeaponId: WeaponId;
}

export const DesktopControls: React.FC<DesktopControlsProps> = ({
  containerRef,
  onMove,
  onLookDelta,
  onShootStart,
  onShootEnd,
  onReload,
  onJump,
  onDash,
  onPauseToggle,
  onSelectWeapon,
  onSprint,
  onCrouch,
  onADS,
  onEMP,
  onGrenade,
  onInteract,
  isPointerLocked,
  setIsPointerLocked,
  selectedWeaponId,
}) => {
  // Request Pointer Lock on deploy button or direct click
  const requestPointerLock = () => {
    if (containerRef.current) {
      containerRef.current.requestPointerLock().catch(() => {});
    }
  };

  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === containerRef.current;
      setIsPointerLocked(isLocked);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, [containerRef, setIsPointerLocked]);

  // Keyboard Event Handling
  useEffect(() => {
    const keyMap: { [key: string]: boolean } = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent browser default keys if playing
      if (document.pointerLockElement === containerRef.current) {
        if (['Space', 'KeyI', 'KeyC', 'Tab'].includes(e.code)) {
          e.preventDefault();
        }
      }

      // Avoid double trigger if key is held
      if (keyMap[e.code]) return;
      keyMap[e.code] = true;

      if (e.code === 'KeyQ') onDash();
      if (e.code === 'Escape') {
        e.preventDefault();
        onPauseToggle();
      }
      if (e.code === 'KeyR') onReload();
      if (e.code === 'Space') onJump();
      if (e.code === 'KeyF') onEMP();
      if (e.code === 'KeyG') onGrenade();
      if (e.code === 'KeyE') onInteract();

      // Weapon selection
      if (e.code === 'Digit1') onSelectWeapon('pistol');
      if (e.code === 'Digit2') onSelectWeapon('rifle');
      if (e.code === 'Digit3') onSelectWeapon('shotgun');
      if (e.code === 'Digit4') onSelectWeapon('launcher');
      if (e.code === 'Digit5') onSelectWeapon('sniper');

      // Sprint & Crouch triggers
      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        onSprint(true);
      }
      if (e.code === 'ControlLeft' || e.code === 'KeyC') {
        onCrouch(true);
      }

      updateMovement(keyMap);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keyMap[e.code] = false;

      if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        onSprint(false);
      }
      if (e.code === 'ControlLeft' || e.code === 'KeyC') {
        onCrouch(false);
      }

      updateMovement(keyMap);
    };

    const updateMovement = (map: { [key: string]: boolean }) => {
      let forward = 0;
      let right = 0;

      if (map['KeyW'] || map['ArrowUp']) forward += 1;
      if (map['KeyS'] || map['ArrowDown']) forward -= 1;
      if (map['KeyD'] || map['ArrowRight']) right += 1;
      if (map['KeyA'] || map['ArrowLeft']) right -= 1;

      onMove(forward, right);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [onMove, onReload, onJump, onDash, onPauseToggle, onSelectWeapon, onSprint, onCrouch, onEMP, onGrenade, onInteract, containerRef]);

  // Mouse Look, Right-click ADS, Shoot & Scroll switching
  useEffect(() => {
    let isMouseDown = false;
    let lastX = 0;
    let lastY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === containerRef.current) {
        onLookDelta(e.movementX, e.movementY);
      } else if (isMouseDown) {
        const deltaX = e.clientX - lastX;
        const deltaY = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;
        onLookDelta(deltaX, deltaY);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      // Left click
      if (e.button === 0) {
        isMouseDown = true;
        lastX = e.clientX;
        lastY = e.clientY;
        if (document.pointerLockElement === containerRef.current) {
          onShootStart();
        }
      }
      // Right click (ADS)
      if (e.button === 2) {
        e.preventDefault();
        if (document.pointerLockElement === containerRef.current) {
          onADS(true);
        }
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      // Left click
      if (e.button === 0) {
        isMouseDown = false;
        if (document.pointerLockElement === containerRef.current) {
          onShootEnd();
        }
      }
      // Right click (ADS Release)
      if (e.button === 2) {
        e.preventDefault();
        if (document.pointerLockElement === containerRef.current) {
          onADS(false);
        }
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Scroll wheel for weapon switching
    const handleWheel = (e: WheelEvent) => {
      if (document.pointerLockElement !== containerRef.current) return;
      const weapons: WeaponId[] = ['pistol', 'rifle', 'shotgun', 'launcher', 'sniper'];
      const currentIndex = weapons.indexOf(selectedWeaponId);
      if (e.deltaY > 0) {
        // next weapon
        const nextIdx = (currentIndex + 1) % weapons.length;
        onSelectWeapon(weapons[nextIdx]);
      } else {
        // previous weapon
        const prevIdx = (currentIndex - 1 + weapons.length) % weapons.length;
        onSelectWeapon(weapons[prevIdx]);
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('contextmenu', handleContextMenu);
    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('contextmenu', handleContextMenu);
      window.removeEventListener('wheel', handleWheel);
    };
  }, [containerRef, onLookDelta, onShootStart, onShootEnd, onADS, onSelectWeapon, selectedWeaponId]);

  if (isPointerLocked) return null;

  return (
    <div
      onClick={requestPointerLock}
      className="absolute inset-0 bg-slate-950/80 backdrop-blur-lg z-30 flex flex-col items-center justify-center cursor-pointer select-none transition-all p-6"
    >
      <div className="bg-slate-900/90 border border-cyan-500/30 p-8 rounded-2xl max-w-2xl text-center shadow-[0_0_50px_rgba(6,182,212,0.15)] hover:border-cyan-400/50 transition-all duration-300">
        
        {/* Logo Terminal */}
        <div className="mb-6">
          <span className="text-xs bg-cyan-950 text-cyan-400 border border-cyan-500/30 px-3 py-1 rounded-full font-black tracking-widest uppercase">
            SYSTEM DISPATCH SYSTEM
          </span>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tighter mt-3 uppercase">
            ECLIPSE PROTOCOL
          </h1>
          <p className="text-cyan-400 font-bold uppercase tracking-widest text-sm mt-1">
            FACILITY BLACKSITE E-17
          </p>
        </div>

        {/* Warning Briefing */}
        <div className="bg-slate-950/60 border-l-2 border-cyan-500 p-4 rounded-r-xl text-left text-slate-300 mb-6 text-sm leading-relaxed max-w-lg mx-auto">
          <p className="font-extrabold text-cyan-400 uppercase tracking-wider mb-1">
            ALERT: AI COMPROMISED
          </p>
          Auxiliary systems have taken control of the blacksite biomechanical soldiers and defense drones. Enter the facility, restore security power, purge the central core, and extract before orbital bombardment.
        </div>

        {/* Tactical Key Map */}
        <h3 className="text-xs font-black tracking-widest text-slate-400 uppercase mb-3 text-center">
          OPERATOR TACTICAL SYSTEM CONTROLS
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs text-left bg-slate-950/60 border border-slate-800 p-5 rounded-xl mb-6 font-mono text-slate-300">
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">W,A,S,D</span>
            <span>Movement</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">Mouse</span>
            <span>Aim View</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">L-Click</span>
            <span>Fire Weapon</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">R-Click</span>
            <span>Aim Down Sight</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">Shift</span>
            <span>Sprint</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">Ctrl / C</span>
            <span>Crouch / Slide</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">Space</span>
            <span>Jump</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">Q</span>
            <span>Combat Dash</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">R</span>
            <span>Reload</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">F</span>
            <span>EMP Blast</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">G</span>
            <span>Throw Grenade</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">E</span>
            <span>Interact / Collect</span>
          </div>
          <div className="flex items-center gap-2 col-span-2 md:col-span-3 border-t border-slate-800/80 pt-2.5 justify-center">
            <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-cyan-400 font-bold">1 - 5 / Wheel Scroll</span>
            <span>Select/Switch Weapons</span>
          </div>
        </div>

        {/* Deploy Button */}
        <button
          onClick={requestPointerLock}
          className="relative inline-flex items-center gap-3 px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black tracking-widest uppercase text-sm rounded-lg shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer transform active:scale-95"
        >
          <Play className="w-4 h-4 fill-current" /> DEPLOY TO BLACKSITE
        </button>
        
        <p className="text-[10px] text-slate-500 font-mono mt-4">
          POINTER LOCK API ENGAGES AUTOMATICALLY ON LAUNCH. PRESS ESC TO EXIT LOCK.
        </p>
      </div>
    </div>
  );
};
