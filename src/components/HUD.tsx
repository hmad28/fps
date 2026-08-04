import React, { useEffect, useState } from 'react';
import { HitMarker, PlayerStats } from '../types';
import { Heart, Shield, Crosshair, Navigation, Zap, AlertTriangle, Radio } from 'lucide-react';
import { Minimap } from './Minimap';

interface HUDProps {
  stats: PlayerStats;
  hitMarker: HitMarker | null;
  damageAngle: number | null;
  killFeedMessage: string | null;
  engineRef: React.RefObject<any>;
  onSelectWeapon: (id: any) => void;
  onReload: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  hitMarker,
  damageAngle,
  killFeedMessage,
  engineRef,
}) => {
  const [showHitMarker, setShowHitMarker] = useState(false);
  const [isHeadshotHit, setIsHeadshotHit] = useState(false);

  useEffect(() => {
    if (hitMarker) {
      setShowHitMarker(true);
      setIsHeadshotHit(hitMarker.isHeadshot);
      const timer = setTimeout(() => setShowHitMarker(false), 180);
      return () => clearTimeout(timer);
    }
  }, [hitMarker]);

  const healthPercent = Math.max(0, Math.min(100, (stats.health / (stats.maxHealth || 100)) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (stats.shield / (stats.maxShield || 50)) * 100));
  const staminaPercent = Math.max(0, Math.min(100, (stats.stamina / 100) * 100));

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* 1. TOP BAR: A.E.G.I.S. Command & Objective */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Operator Vitals Terminal */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 p-4 rounded-xl shadow-lg w-72">
          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
            <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">
              A.E.G.I.S. VANGUARD VITALS
            </span>
            <span className="text-[9px] font-mono text-slate-400">ASC VALIANT</span>
          </div>

          {/* Health Bar */}
          <div className="mb-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
              <span className="flex items-center gap-1 text-cyan-400 font-black">
                <Heart className="w-3.5 h-3.5 fill-cyan-400/20 text-cyan-400" /> HP
              </span>
              <span className="font-mono text-white text-sm">{Math.round(stats.health)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div className="h-full bg-cyan-400 rounded-full transition-all duration-300" style={{ width: `${healthPercent}%` }} />
            </div>
          </div>

          {/* Shield Bar */}
          <div className="mb-2.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
              <span className="flex items-center gap-1 text-blue-400 font-black">
                <Shield className="w-3.5 h-3.5 fill-blue-400/20 text-blue-400" /> ARMOR
              </span>
              <span className="font-mono text-white text-sm">{Math.round(stats.shield)}</span>
            </div>
            <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-300" style={{ width: `${shieldPercent}%` }} />
            </div>
          </div>

          {/* Stamina Bar */}
          <div>
            <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
              <span className="flex items-center gap-1 text-amber-400 font-black">
                <Zap className="w-3.5 h-3.5 text-amber-400" /> STAMINA
              </span>
              <span className="font-mono text-white text-sm">{Math.round(stats.stamina)}%</span>
            </div>
            <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
              <div className="h-full bg-amber-400 rounded-full transition-all duration-300" style={{ width: `${staminaPercent}%` }} />
            </div>
          </div>

          {/* Physical Body Injuries indicator if present */}
          {stats.injuries && (stats.injuries.leftArm || stats.injuries.leftLeg || stats.injuries.torso) && (
            <div className="mt-3 pt-2 border-t border-red-500/30 flex items-center gap-1.5 text-red-400 text-xs font-bold animate-pulse">
              <AlertTriangle className="w-4 h-4" />
              <span>PHYSICAL INJURY DETECTED</span>
            </div>
          )}
        </div>

        {/* Center: Objective Tracker */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 px-6 py-3 rounded-xl flex items-center gap-3">
          <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
          <div>
            <div className="text-[9px] font-black text-cyan-400 tracking-widest uppercase">CURRENT OBJECTIVE</div>
            <div className="text-sm font-bold text-white tracking-wide">{stats.objectiveText || 'SURVEY BATTLEFIELD'}</div>
          </div>
        </div>

        {/* Right: Minimap Radar */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 p-2 rounded-xl">
          <Minimap engineRef={engineRef} />
        </div>
      </div>

      {/* 2. CENTER CROSSHAIR & HITMARKER */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <Crosshair className="w-6 h-6 text-cyan-400/80" />

        {showHitMarker && (
          <div className={`absolute w-8 h-8 border-2 ${isHeadshotHit ? 'border-red-500 scale-125' : 'border-amber-400'} rotate-45 animate-ping`} />
        )}

        {killFeedMessage && (
          <div className="absolute bottom-28 bg-slate-950/90 border border-cyan-500/50 text-cyan-300 font-bold px-4 py-1.5 rounded-lg text-sm tracking-wider shadow-lg">
            {killFeedMessage}
          </div>
        )}
      </div>

      {/* 3. BOTTOM ROW: Command Support Wrist Terminal & Ammo */}
      <div className="flex items-end justify-between w-full">
        {/* Left: Command Support Sequence Input */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/40 p-4 rounded-xl w-80">
          <div className="text-[10px] font-black text-amber-400 tracking-widest uppercase mb-2">
            COMMAND SUPPORT WRIST TERMINAL (HOLD Q)
          </div>
          <div className="flex items-center gap-2 bg-slate-900/90 p-2.5 rounded-lg border border-slate-800 min-h-[44px]">
            {stats.supportSequence && stats.supportSequence.length > 0 ? (
              stats.supportSequence.map((dir, i) => (
                <span key={i} className="px-2 py-1 bg-amber-500/20 border border-amber-400 text-amber-300 font-black text-sm rounded">
                  {dir === 'UP' ? '↑' : dir === 'DOWN' ? '↓' : dir === 'LEFT' ? '←' : '→'}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-500 font-mono">Hold Q & Enter Code Sequence...</span>
            )}
          </div>
        </div>

        {/* Right: Active Ammo & Med-Injectors */}
        <div className="bg-slate-950/85 backdrop-blur-md border border-cyan-500/40 p-4 rounded-xl w-64 text-right">
          <div className="text-[10px] font-black text-cyan-400 tracking-widest uppercase mb-1">
            {stats.weaponName || 'AR-21 VANGUARD'}
          </div>
          <div className="flex items-baseline justify-end gap-1 font-mono mb-2">
            <span className="text-3xl font-black text-white">{stats.currentClip ?? 30}</span>
            <span className="text-sm text-slate-400">/ {stats.reserveMags ?? 5} MAGS</span>
          </div>

          <div className="flex items-center justify-end gap-2 text-xs font-bold text-cyan-300 pt-2 border-t border-slate-800">
            <span>MED-INJECTORS:</span>
            <span className="font-mono text-sm text-white px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/40 rounded">
              {stats.medInjectors ?? 3}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
