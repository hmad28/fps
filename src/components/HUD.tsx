import React, { useEffect, useState } from 'react';
import { HitMarker, PlayerStats, WeaponId } from '../types';
import { WEAPON_CONFIGS } from '../game/WeaponConfigs';
import { Heart, Shield, Skull, Award, RotateCcw, Zap, Target, Circle, Eye, EyeOff } from 'lucide-react';
import { Minimap } from './Minimap';
import { FPSGameEngine } from '../game/FPSGameEngine';

interface HUDProps {
  stats: PlayerStats;
  hitMarker: HitMarker | null;
  damageAngle: number | null;
  killFeedMessage: string | null;
  engineRef: React.RefObject<FPSGameEngine | null>;
  onSelectWeapon: (id: WeaponId) => void;
  onReload: () => void;
}

export const HUD: React.FC<HUDProps> = ({
  stats,
  hitMarker,
  damageAngle,
  killFeedMessage,
  engineRef,
  onSelectWeapon,
  onReload,
}) => {
  const currentWeapon = WEAPON_CONFIGS[stats.selectedWeaponId];
  const ammoState = stats.ammo[stats.selectedWeaponId] || { clip: 0, reserve: 0 };

  // Hitmarker state
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

  // Damage Screen Flash
  const [showDamageFlash, setShowDamageFlash] = useState(false);
  useEffect(() => {
    if (damageAngle !== null) {
      setShowDamageFlash(true);
      const timer = setTimeout(() => setShowDamageFlash(false), 300);
      return () => clearTimeout(timer);
    }
  }, [damageAngle]);

  const healthPercent = Math.max(0, Math.min(100, (stats.health / stats.maxHealth) * 100));
  const shieldPercent = Math.max(0, Math.min(100, (stats.shield / stats.maxShield) * 100));

  let healthColor = 'bg-cyan-500 shadow-cyan-500/50';
  if (healthPercent < 50) healthColor = 'bg-amber-500 shadow-amber-500/50';
  if (healthPercent < 25) healthColor = 'bg-red-500 shadow-red-500/50 animate-pulse';

  return (
    <div className="absolute inset-0 pointer-events-none select-none z-10 flex flex-col justify-between p-4 md:p-6 overflow-hidden">
      {/* Red screen overlay on damage */}
      {showDamageFlash && (
        <div className="absolute inset-0 bg-red-600/15 border-4 border-red-500/70 pointer-events-none animate-pulse transition-all duration-100" />
      )}

      {/* 1. TOP TACTICAL ROW */}
      <div className="flex items-start justify-between w-full">
        {/* Left: Vitals Terminal & RADAR */}
        <div className="flex flex-col gap-4">
          <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)] w-72">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-3">
              <span className="text-[10px] font-black text-cyan-400 tracking-widest uppercase">
                VITAL SIGN MONITOR
              </span>
              <span className="text-[9px] font-mono text-slate-500">OPERATOR-01</span>
            </div>

            {/* Health */}
            <div className="mb-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-cyan-400 font-black">
                  <Heart className="w-3.5 h-3.5 fill-cyan-400/20 text-cyan-400" /> HEALTH
                </span>
                <span className="font-mono text-white text-sm">{Math.round(stats.health)}%</span>
              </div>
              <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${healthColor}`}
                  style={{ width: `${healthPercent}%` }}
                />
              </div>
            </div>

            {/* Armor Shield */}
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-1">
                <span className="flex items-center gap-1 text-blue-400 font-black">
                  <Shield className="w-3.5 h-3.5 fill-blue-400/20 text-blue-400" /> SHIELD ARMOR
                </span>
                <span className="font-mono text-white text-sm">{Math.round(stats.shield)} AP</span>
              </div>
              <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden p-0.5 border border-slate-800">
                <div
                  className="h-full rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)] transition-all duration-300"
                  style={{ width: `${shieldPercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* Minimap Radar Container */}
          <div className="self-start relative border border-cyan-500/20 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.05)]">
            <Minimap engineRef={engineRef} />
          </div>

          {/* Tactical Monitor: District & Campaign Stats */}
          <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)] w-72 flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-cyan-500/10 pb-2">
              <span className="text-[10px] font-black text-slate-400 tracking-wider uppercase">ACTIVE SECTOR</span>
              <span className="text-xs font-black text-cyan-400 uppercase tracking-widest">
                {stats.activeDistrict ? stats.activeDistrict.replace('_', ' ') : 'COLLAPSED GATE'}
              </span>
            </div>

            {/* Campaign Environment Conditions */}
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-400">
              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                <span className="block text-[8px] text-slate-500 font-mono">TIME</span>
                <span className="font-bold text-white uppercase">{stats.timeOfNight || 'DUSK'}</span>
              </div>
              <div className="bg-slate-900/60 p-1.5 rounded border border-slate-800">
                <span className="block text-[8px] text-slate-500 font-mono">WEATHER</span>
                <span className="font-bold text-cyan-300 uppercase">{stats.weatherState || 'RAIN'}</span>
              </div>
            </div>

            {/* Faction Power Dynamics */}
            <div className="flex flex-col gap-1.5 border-t border-slate-800/80 pt-2.5">
              <div className="flex justify-between text-[10px] font-bold">
                <span className="text-red-400 uppercase">HELIOS CONTROLLERS</span>
                <span className="font-mono text-red-400">{stats.heliosControl}%</span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-red-500" style={{ width: `${stats.heliosControl}%` }} />
              </div>

              <div className="flex justify-between text-[10px] font-bold mt-1">
                <span className="text-emerald-400 uppercase">REBEL MOVEMENT</span>
                <span className="font-mono text-emerald-400">{stats.rebelInfluence}%</span>
              </div>
              <div className="w-full h-1 bg-slate-900 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500" style={{ width: `${stats.rebelInfluence}%` }} />
              </div>
            </div>

            {/* Grid status indicators */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-800/80 pt-2.5 text-[9px] font-mono">
              <div className="flex justify-between items-center bg-slate-900/40 p-1 rounded">
                <span className="text-slate-500">POWER GRID</span>
                <span className={`font-bold ${stats.powerGrid === 'offline' ? 'text-red-400' : stats.powerGrid === 'unstable' ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {stats.powerGrid?.toUpperCase() || 'ONLINE'}
                </span>
              </div>
              <div className="flex justify-between items-center bg-slate-900/40 p-1 rounded">
                <span className="text-slate-500">METRO LINK</span>
                <span className={`font-bold ${stats.metroStatus === 'active' ? 'text-emerald-400' : 'text-slate-500'}`}>
                  {stats.metroStatus?.toUpperCase() || 'OFFLINE'}
                </span>
              </div>
            </div>

            {/* Anomaly Cores */}
            <div className="flex items-center justify-between border-t border-slate-800/80 pt-2 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">ANOMALY CORES</span>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-purple-400 animate-pulse" />
                <span className="text-sm font-black text-purple-400">{stats.anomalyCores || 0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Center: Objective Display & Mission Stages */}
        <div className="flex flex-col items-center max-w-md md:max-w-xl text-center">
          <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/40 p-4 rounded-xl shadow-[0_0_30px_rgba(6,182,212,0.15)] flex flex-col items-center">
            
            {/* Stage Title */}
            <div className="flex items-center gap-2 mb-1">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase">
                STAGE 0{stats.stage} — {
                  stats.stage === 1 ? 'POWER FAILURE' :
                  stats.stage === 2 ? 'LOCKDOWN CODE' :
                  stats.stage === 3 ? 'NIGHTFALL INCIDENT' :
                  stats.stage === 4 ? 'CONTAINMENT BREACH' : 'ECLIPSE RECKONING'
                }
              </span>
            </div>

            {/* Objective text description */}
            <h2 className="text-sm font-black text-white uppercase tracking-tight max-w-sm mt-1 leading-tight">
              {stats.objectiveText}
            </h2>

            {/* Objective Progress Bar */}
            {stats.objectiveProgress > 0 && (
              <div className="w-64 mt-3">
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                  <span>PROGRESS</span>
                  <span className="text-cyan-400 font-black">{Math.round(stats.objectiveProgress)}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800 p-[1px]">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(34,211,238,0.8)]"
                    style={{ width: `${stats.objectiveProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Kill feed popup */}
          {killFeedMessage && (
            <div className="mt-4 px-5 py-2.5 rounded-xl bg-cyan-950 border border-cyan-400/50 text-cyan-300 font-black text-xs uppercase tracking-widest shadow-[0_0_25px_rgba(6,182,212,0.2)] animate-bounce flex items-center gap-2">
              <Skull className="w-4 h-4 text-cyan-400" /> {killFeedMessage}
            </div>
          )}
        </div>

        {/* Right: Score, Combat stats & Tactical utilities */}
        <div className="flex flex-col gap-4 items-end">
          <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col gap-3 w-48">
            <div className="flex items-center justify-between text-xs font-bold border-b border-cyan-500/10 pb-2 mb-1">
              <span className="text-slate-400">DATA SYNC</span>
              <span className="text-cyan-400 text-[10px]">WAVE {stats.wave}</span>
            </div>

            {/* Score */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Award className="w-3.5 h-3.5 text-yellow-400" /> SCORE
              </span>
              <span className="font-mono text-yellow-400 font-black">{stats.score}</span>
            </div>

            {/* Kills */}
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-slate-400 text-xs">
                <Skull className="w-3.5 h-3.5 text-red-400" /> KILLS
              </span>
              <span className="font-mono text-white font-extrabold">{stats.kills}</span>
            </div>
          </div>

          {/* Utility Box: Grenade count and EMP Status */}
          <div className="bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.1)] flex flex-col gap-3.5 w-48 font-mono text-xs">
            {/* EMP Cooldown */}
            <div>
              <div className="flex justify-between text-[10px] font-bold text-slate-400 mb-1">
                <span>[F] EMP PULSE</span>
                <span className={stats.empCooldownSeconds > 0 ? 'text-amber-500' : 'text-cyan-400'}>
                  {stats.empCooldownSeconds > 0 ? `${Math.ceil(stats.empCooldownSeconds)}s` : 'READY'}
                </span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className={`h-full ${stats.empCooldownSeconds > 0 ? 'bg-amber-500' : 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.8)]'} transition-all duration-100`}
                  style={{ width: `${(1 - stats.empCooldown) * 100}%` }}
                />
              </div>
            </div>

            {/* Grenades */}
            <div className="flex items-center justify-between border-t border-cyan-500/10 pt-2.5">
              <span className="text-slate-400">[G] GRENADES</span>
              <div className="flex gap-1.5">
                {[1, 2, 3].map((g) => (
                  <span
                    key={g}
                    className={`w-3.5 h-3.5 rounded border ${
                      g <= stats.grenades
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_5px_rgba(34,211,238,0.5)]'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. DYNAMIC CAMERA FEEDBACK & CROSSHAIR */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        
        {/* Responsive Crosshair Indicator */}
        {!stats.isADS ? (
          <div className="relative w-10 h-10 flex items-center justify-center">
            {/* Top Line */}
            <div className="absolute top-0 w-[2px] h-2.5 bg-cyan-400/90 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            {/* Bottom Line */}
            <div className="absolute bottom-0 w-[2px] h-2.5 bg-cyan-400/90 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            {/* Left Line */}
            <div className="absolute left-0 h-[2px] w-2.5 bg-cyan-400/90 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            {/* Right Line */}
            <div className="absolute right-0 h-[2px] w-2.5 bg-cyan-400/90 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
            {/* Center Tiny Dot */}
            <div className="w-[3px] h-[3px] rounded-full bg-white shadow-[0_0_4px_white]" />

            {/* Dynamic hitmarker splash */}
            {showHitMarker && (
              <div className="absolute w-8 h-8 flex items-center justify-center transform rotate-45 scale-110 animate-pulse">
                <div className={`absolute w-full h-[3px] ${isHeadshotHit ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-white'}`} />
                <div className={`absolute h-full w-[3px] ${isHeadshotHit ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-white'}`} />
              </div>
            )}
          </div>
        ) : (
          /* ADS precise tactical point */
          <div className="relative w-6 h-6 flex items-center justify-center">
            {stats.selectedWeaponId === 'sniper' ? (
              /* Sniper Full Tactical Scope overlay takes over */
              <div className="absolute w-64 h-64 border-2 border-purple-500/40 rounded-full flex items-center justify-center shadow-[0_0_40px_rgba(168,85,247,0.15)] bg-purple-950/5">
                <div className="w-full h-[1px] bg-purple-500/40 absolute" />
                <div className="h-full w-[1px] bg-purple-500/40 absolute" />
                <div className="w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_5px_red] absolute" />
              </div>
            ) : (
              /* Holographic dot for standard ADS */
              <div className="w-2 h-2 rounded-full bg-red-500 border border-white/60 shadow-[0_0_8px_rgba(239,68,68,1)] animate-ping" />
            )}

            {/* Dynamic hitmarker splash */}
            {showHitMarker && (
              <div className="absolute w-8 h-8 flex items-center justify-center transform rotate-45 scale-110 animate-pulse">
                <div className={`absolute w-full h-[3px] ${isHeadshotHit ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-white'}`} />
                <div className={`absolute h-full w-[3px] ${isHeadshotHit ? 'bg-red-500 shadow-[0_0_10px_red]' : 'bg-white'}`} />
              </div>
            )}
          </div>
        )}

        {/* Action / State Indicators (Crouching, Sliding, Sprinting) */}
        <div className="absolute bottom-36 flex gap-3 text-[10px] font-mono tracking-widest uppercase text-cyan-400 font-bold bg-slate-950/80 border border-cyan-500/20 px-3 py-1 rounded-full backdrop-blur">
          {stats.isSprinting && <span className="text-cyan-400 animate-pulse">SPRINTING</span>}
          {stats.isSliding && <span className="text-yellow-400 animate-pulse">SLIDING</span>}
          {stats.isCrouching && !stats.isSliding && <span className="text-blue-400">CROUCHING</span>}
          {stats.isADS && <span className="text-purple-400">ADS MODE</span>}
          {!stats.isSprinting && !stats.isSliding && !stats.isCrouching && !stats.isADS && <span className="text-slate-500">TACTICAL POSITION</span>}
        </div>
      </div>

      {/* 3. BOTTOM WEAPON DECK & STATS SUMMARY */}
      <div className="flex flex-col md:flex-row items-end justify-between w-full gap-4">
        
        {/* Left: 5 Weapon Selection Slots (Press keys 1 - 5) */}
        <div className="flex flex-col gap-2.5">
          {/* Quick HUD Guide */}
          <div className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-slate-950/80 backdrop-blur-md rounded-xl border border-cyan-500/20 text-[10px] font-mono tracking-wide text-slate-400">
            <span className="flex items-center gap-1 text-cyan-400"><span className="px-1 py-0.5 rounded bg-slate-800 text-white font-bold border border-slate-700">W,A,S,D</span> MOVE</span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1 text-cyan-400"><span className="px-1 py-0.5 rounded bg-slate-800 text-white font-bold border border-slate-700">SHIFT</span> SPRINT</span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1 text-cyan-400"><span className="px-1 py-0.5 rounded bg-slate-800 text-white font-bold border border-slate-700">C</span> SLIDE</span>
            <span className="text-slate-700">|</span>
            <span className="flex items-center gap-1 text-cyan-400"><span className="px-1 py-0.5 rounded bg-slate-800 text-white font-bold border border-slate-700">ESC</span> FREE MOUSE</span>
          </div>

          {/* Weapon Dock */}
          <div className="hidden md:flex items-center gap-2 bg-slate-950/90 backdrop-blur-md p-2 rounded-2xl border border-cyan-500/20 pointer-events-auto shadow-2xl">
            {(['pistol', 'rifle', 'shotgun', 'launcher', 'sniper'] as WeaponId[]).map((id, index) => {
              const w = WEAPON_CONFIGS[id];
              const isSelected = stats.selectedWeaponId === id;
              const weaponAmmo = stats.ammo[id] || { clip: 0, reserve: 0 };
              const hasAmmo = weaponAmmo.clip > 0 || weaponAmmo.reserve > 0;
              return (
                <button
                  key={id}
                  onClick={() => onSelectWeapon(id)}
                  className={`px-3 py-2 rounded-xl text-left transition-all duration-200 flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? 'bg-cyan-500/25 text-white shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/50'
                      : 'bg-slate-900/60 text-slate-500 hover:text-slate-300 hover:bg-slate-800/80 border border-transparent'
                  } ${!hasAmmo ? 'opacity-40' : ''}`}
                >
                  <span className={`w-5 h-5 rounded bg-slate-950 text-[10px] font-black flex items-center justify-center font-mono ${isSelected ? 'text-cyan-400' : 'text-slate-600'}`}>
                    {index + 1}
                  </span>
                  <div>
                    <div className="text-[10px] font-black uppercase leading-none tracking-tight">{w.name.split(' ').slice(1).join(' ') || w.name}</div>
                    <div className="text-[9px] font-mono opacity-80 mt-0.5">{weaponAmmo.clip}/{weaponAmmo.reserve}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Selected weapon Ammo clip and specs */}
        <div className="bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl shadow-[0_0_35px_rgba(6,182,212,0.15)] flex items-center gap-6 min-w-xs justify-between">
          <div>
            <div className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono">
              {currentWeapon.name}
            </div>
            <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider font-mono">
              SLOT: {currentWeapon.category}
            </div>
          </div>

          <div className="flex items-center gap-4 border-l border-cyan-500/10 pl-5">
            {/* Ammo digits */}
            <div className="flex items-baseline gap-1">
              <span
                className={`text-4xl font-black font-mono tracking-tighter ${
                  ammoState.clip === 0 ? 'text-red-500 animate-pulse' : 'text-white'
                }`}
              >
                {ammoState.clip}
              </span>
              <span className="text-sm font-mono text-slate-500">/{ammoState.reserve}</span>
            </div>

            {/* Reloading spin bar */}
            {stats.isReloading && (
              <div className="flex items-center gap-2 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                <RotateCcw className="w-4 h-4 text-cyan-400 animate-spin" />
                <div className="w-16 h-2 bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-[1px]">
                  <div
                    className="h-full bg-cyan-400 rounded-full transition-all duration-75 shadow-[0_0_5px_rgba(34,211,238,0.8)]"
                    style={{ width: `${stats.reloadProgress * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* 4. HOLOGRAPHIC TACTICAL WAR-TABLE OVERLAY */}
      {stats.workbenchActive && (
        <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-lg z-50 pointer-events-auto flex flex-col p-6 overflow-y-auto">
          {/* Header */}
          <div className="flex justify-between items-center border-b border-cyan-500/30 pb-4 mb-6">
            <div>
              <h1 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-cyan-400 animate-pulse" />
                VEYRA CITY TACTICAL HUB & INTEL MATRIX
              </h1>
              <p className="text-xs font-mono text-slate-400 mt-1 uppercase">
                Offline Decentralized Nodes. Resistance Network Status: ACTIVE.
              </p>
            </div>
            <button
              onClick={() => {
                if (engineRef.current) {
                  engineRef.current.stats.workbenchActive = false;
                  engineRef.current.callbacks.onStatsUpdate({ ...engineRef.current.stats });
                }
              }}
              className="px-5 py-2 rounded-xl bg-cyan-500/20 border border-cyan-400/50 hover:bg-cyan-500/40 text-cyan-300 text-xs font-black tracking-widest cursor-pointer transition-all uppercase"
            >
              Close Intel Screen
            </button>
          </div>

          {/* Grid Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
            
            {/* Left Side: Campaign Intel & Legend */}
            <div className="lg:col-span-1 bg-slate-900/40 border border-slate-800 p-5 rounded-2xl flex flex-col gap-4">
              <h2 className="text-sm font-black text-cyan-400 tracking-wider uppercase border-b border-slate-800 pb-2">
                CAMPAIGN OPERATIONS LOG
              </h2>

              {/* Status indicators */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center text-xs text-slate-300">
                  <span className="text-slate-500 font-mono">REBEL FORCE PROGRESS:</span>
                  <span className="font-mono font-black text-emerald-400">{stats.rebelInfluence}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500" style={{ width: `${stats.rebelInfluence}%` }} />
                </div>

                <div className="flex justify-between items-center text-xs text-slate-300 mt-1">
                  <span className="text-slate-500 font-mono">HELIOS FORCE SUPPRESSION:</span>
                  <span className="font-mono font-black text-red-400">{stats.heliosControl}%</span>
                </div>
                <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden">
                  <div className="h-full bg-red-500" style={{ width: `${stats.heliosControl}%` }} />
                </div>
              </div>

              {/* Mission Progress Checklist */}
              <div className="flex flex-col gap-3.5 mt-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest font-mono">
                  ACTIVE MISSION OBJECTIVES
                </h3>
                
                <div className="flex flex-col gap-2 font-mono text-xs">
                  {stats.activeMissions && stats.activeMissions.map((m: any) => (
                    <div
                      key={m.id}
                      className={`p-3 rounded-xl border flex flex-col gap-1 transition-all ${
                        m.status === 'completed'
                          ? 'bg-emerald-950/15 border-emerald-500/20 text-emerald-300 opacity-60'
                          : m.status === 'locked'
                          ? 'bg-slate-950/50 border-slate-900 text-slate-600'
                          : 'bg-cyan-950/10 border-cyan-500/30 text-cyan-200 shadow-[0_0_15px_rgba(6,182,212,0.05)]'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-[11px] uppercase tracking-wider">{m.name}</span>
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          m.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                          m.status === 'locked' ? 'bg-slate-900 text-slate-600' : 'bg-cyan-500/10 text-cyan-400 animate-pulse'
                        }`}>
                          {m.status.toUpperCase()}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1 leading-normal uppercase">{m.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Side: Interconnected Districts Map Grid */}
            <div className="lg:col-span-2 flex flex-col gap-4">
              <h2 className="text-sm font-black text-cyan-400 tracking-wider uppercase border-b border-slate-800 pb-2 font-mono">
                SELECT SECTOR DEPLOYMENT
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                {[
                  {
                    id: 'safehouse',
                    name: 'REBEL APARTMENT SAFEHOUSE',
                    status: 'COZY BASE',
                    desc: 'Cozy resistance shelter equipped with computer war desks, ammunition crates, and weapon racks.',
                    color: 'border-amber-500/30 text-amber-400 bg-amber-950/5',
                  },
                  {
                    id: 'collapsed_gate',
                    name: 'COLLAPSED HIGHWAY GATE',
                    status: 'SECTOR-1',
                    desc: 'Post-apocalyptic war-torn highway toll tollway with blockages, abandoned trucks, and rain fog.',
                    color: 'border-red-500/30 text-red-400 bg-red-950/5',
                  },
                  {
                    id: 'neon_market',
                    name: 'NEON STREET MARKET',
                    status: 'SECTOR-2',
                    desc: 'High-density commercial neon alley. Billboards and sky platforms under Helios drone sweep.',
                    color: 'border-fuchsia-500/30 text-fuchsia-400 bg-fuchsia-950/5',
                  },
                  {
                    id: 'transit_hub',
                    name: 'METRO TRANSIT STATION',
                    status: 'SECTOR-3',
                    desc: 'Underground transit platforms, automated ticket booths, rails, and active high-speed express train.',
                    color: 'border-yellow-500/30 text-yellow-400 bg-yellow-950/5',
                  },
                  {
                    id: 'flooded_city',
                    name: 'FLOODED OLD CITY PLAZA',
                    status: 'SECTOR-4',
                    desc: 'Submerged historic town square featuring stone buildings, electrical valve hazards, and deep water.',
                    color: 'border-cyan-500/30 text-cyan-400 bg-cyan-950/5',
                  },
                  {
                    id: 'industrial_spine',
                    name: 'INDUSTRIAL COAL EXCAVATION',
                    status: 'SECTOR-5',
                    desc: 'Steel furnaces, high-tech gantry gantry crane systems, conveyor lines, and heavy metal cargo.',
                    color: 'border-orange-500/30 text-orange-400 bg-orange-950/5',
                  },
                  {
                    id: 'corporate_skyline',
                    name: 'CORPORATE SKYLINE PENTHOUSE',
                    status: 'SECTOR-6',
                    desc: 'A high-rise executive skybridge of elite towers. Overlooked by the glowing mega HELIOS SPIRE.',
                    color: 'border-blue-500/30 text-blue-400 bg-blue-950/5',
                  },
                  {
                    id: 'undercity',
                    name: 'BURIED REACTOR GEOTHERMAL CORE',
                    status: 'SECTOR-7',
                    desc: 'A dark subterranean containment vault with high-tech steam pipelines and green radioactive pools.',
                    color: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/5',
                  },
                ].map((d) => {
                  const isActive = stats.activeDistrict === d.id;
                  return (
                    <div
                      key={d.id}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${d.color} ${
                        isActive
                          ? 'bg-slate-900/90 ring-2 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.15)]'
                          : 'bg-slate-900/30 hover:bg-slate-900/60'
                      }`}
                    >
                      <div>
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{d.status}</span>
                          {isActive && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-cyan-500/25 text-cyan-300 px-2 py-0.5 rounded border border-cyan-400/30 animate-pulse">
                              YOU ARE HERE
                            </span>
                          )}
                        </div>
                        <h3 className="text-xs font-black tracking-tight uppercase mt-1">{d.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-2 leading-relaxed uppercase">{d.desc}</p>
                      </div>

                      <button
                        onClick={() => {
                          if (engineRef.current) {
                            engineRef.current.travelToDistrict(d.id);
                            engineRef.current.stats.workbenchActive = false;
                            engineRef.current.callbacks.onStatsUpdate({ ...engineRef.current.stats });
                          }
                        }}
                        className={`w-full py-2.5 rounded-xl font-black text-xs tracking-widest mt-4 cursor-pointer transition-all uppercase ${
                          isActive
                            ? 'bg-cyan-500/10 border border-cyan-400/30 text-cyan-300'
                            : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-md shadow-cyan-500/20'
                        }`}
                      >
                        {isActive ? 'ALREADY DEPLOYED HERE' : 'CHRONO-WARP TO SECTOR'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
