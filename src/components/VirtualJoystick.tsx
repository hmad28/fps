import React, { useRef, useState, useEffect } from 'react';
import { WeaponId } from '../types';
import { Shield, Zap, RotateCcw, Crosshair, Wind } from 'lucide-react';

interface VirtualJoystickProps {
  onMove: (forward: number, right: number) => void;
  onLookDelta: (deltaX: number, deltaY: number) => void;
  onShootStart: () => void;
  onShootEnd: () => void;
  onReload: () => void;
  onJump: () => void;
  onDash: () => void;
  onSelectWeapon: (id: WeaponId) => void;
  selectedWeaponId: WeaponId;
  isReloading: boolean;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  onLookDelta,
  onShootStart,
  onShootEnd,
  onReload,
  onJump,
  onDash,
  onSelectWeapon,
  selectedWeaponId,
  isReloading,
}) => {
  // Joystick Touch State
  const joystickRef = useRef<HTMLDivElement>(null);
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const touchIdRef = useRef<number | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });

  // Aim Touch Area State
  const lastLookTouchRef = useRef<{ id: number; x: number; y: number } | null>(null);

  // Touch Move / Drag Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const screenWidth = window.innerWidth;

      // Left 45% of screen = Movement Joystick
      if (touch.clientX < screenWidth * 0.45 && touchIdRef.current === null) {
        touchIdRef.current = touch.identifier;
        startPosRef.current = { x: touch.clientX, y: touch.clientY };
        setJoystickActive(true);
        setKnobPos({ x: 0, y: 0 });
      } else if (touch.clientX >= screenWidth * 0.45 && !lastLookTouchRef.current) {
        // Right half of screen = Camera Aim Look
        lastLookTouchRef.current = { id: touch.identifier, x: touch.clientX, y: touch.clientY };
      }
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      // Process Movement Joystick
      if (touch.identifier === touchIdRef.current) {
        const deltaX = touch.clientX - startPosRef.current.x;
        const deltaY = touch.clientY - startPosRef.current.y;
        const maxRadius = 50;

        const dist = Math.hypot(deltaX, deltaY);
        const clampedDist = Math.min(dist, maxRadius);
        const angle = Math.atan2(deltaY, deltaX);

        const knobX = Math.cos(angle) * clampedDist;
        const knobY = Math.sin(angle) * clampedDist;

        setKnobPos({ x: knobX, y: knobY });

        // Forward is -Y on screen, Right is +X
        const normalizedForward = -(knobY / maxRadius);
        const normalizedRight = knobX / maxRadius;

        onMove(normalizedForward, normalizedRight);
      }

      // Process Aim Drag Look
      if (lastLookTouchRef.current && touch.identifier === lastLookTouchRef.current.id) {
        const deltaX = touch.clientX - lastLookTouchRef.current.x;
        const deltaY = touch.clientY - lastLookTouchRef.current.y;

        onLookDelta(deltaX, deltaY);

        lastLookTouchRef.current.x = touch.clientX;
        lastLookTouchRef.current.y = touch.clientY;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];

      if (touch.identifier === touchIdRef.current) {
        touchIdRef.current = null;
        setJoystickActive(false);
        setKnobPos({ x: 0, y: 0 });
        onMove(0, 0);
      }

      if (lastLookTouchRef.current && touch.identifier === lastLookTouchRef.current.id) {
        lastLookTouchRef.current = null;
      }
    }
  };

  return (
    <div
      className="absolute inset-0 select-none touch-none pointer-events-auto z-20 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
    >
      {/* Movement Joystick Zone (Bottom Left) */}
      <div className="absolute bottom-10 left-10 w-32 h-32 rounded-full border-2 border-sky-500/40 bg-slate-900/40 backdrop-blur-md flex items-center justify-center">
        <div
          ref={joystickRef}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          }}
          className={`w-14 h-14 rounded-full transition-transform duration-75 flex items-center justify-center shadow-lg ${
            joystickActive
              ? 'bg-sky-500/80 ring-4 ring-sky-400/50 shadow-sky-500/50'
              : 'bg-slate-700/80 border border-slate-500/50'
          }`}
        >
          <div className="w-4 h-4 rounded-full bg-white/70" />
        </div>
      </div>

      {/* Action Buttons (Bottom Right) */}
      <div className="absolute bottom-8 right-8 flex flex-col items-end gap-4 pointer-events-auto">
        <div className="flex items-center gap-3">
          {/* Dash Button */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onDash();
            }}
            className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/50 text-cyan-400 flex flex-col items-center justify-center active:scale-95 transition-all shadow-md active:bg-cyan-500/40"
          >
            <Wind className="w-6 h-6" />
            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider">Dash (Q)</span>
          </button>

          {/* Reload Button */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onReload();
            }}
            disabled={isReloading}
            className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-400 flex flex-col items-center justify-center active:scale-95 transition-all shadow-md active:bg-amber-500/40"
          >
            <RotateCcw className={`w-6 h-6 ${isReloading ? 'animate-spin' : ''}`} />
            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider">Reload</span>
          </button>

          {/* Jump Button */}
          <button
            onTouchStart={(e) => {
              e.stopPropagation();
              onJump();
            }}
            className="w-14 h-14 rounded-2xl bg-sky-500/20 border border-sky-500/50 text-sky-400 flex flex-col items-center justify-center active:scale-95 transition-all shadow-md active:bg-sky-500/40"
          >
            <Zap className="w-6 h-6" />
            <span className="text-[9px] font-bold mt-0.5 uppercase tracking-wider">Jump</span>
          </button>
        </div>

        {/* Tap-to-Shoot Primary Fire Button */}
        <button
          onTouchStart={(e) => {
            e.stopPropagation();
            onShootStart();
          }}
          onTouchEnd={(e) => {
            e.stopPropagation();
            onShootEnd();
          }}
          className="w-24 h-24 rounded-full bg-red-600/80 border-4 border-red-400/60 text-white flex flex-col items-center justify-center shadow-xl shadow-red-600/40 active:scale-90 active:bg-red-500 transition-transform"
        >
          <Crosshair className="w-10 h-10 animate-pulse" />
          <span className="text-[11px] font-extrabold uppercase tracking-widest mt-1">FIRE</span>
        </button>
      </div>

      {/* Quick Weapon Selector (Top Right) */}
      <div className="absolute top-4 right-4 flex items-center gap-2 bg-slate-900/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/60 pointer-events-auto">
        {(['pistol', 'rifle', 'shotgun', 'sniper'] as WeaponId[]).map((id) => (
          <button
            key={id}
            onTouchStart={(e) => {
              e.stopPropagation();
              onSelectWeapon(id);
            }}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold uppercase transition-all ${
              selectedWeaponId === id
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30 ring-2 ring-sky-300/50'
                : 'text-slate-400 hover:text-white bg-slate-800/50'
            }`}
          >
            {id}
          </button>
        ))}
      </div>
    </div>
  );
};
