import React, { useState } from 'react';
import { PlayerStats, WeaponId } from '../types';
import { FPSGameEngine } from '../game/FPSGameEngine';
import { Zap, Flame, ShieldAlert, Cpu, Sparkles, Orbit, Undo2, X } from 'lucide-react';

interface WeaponFusionLabProps {
  stats: PlayerStats;
  engineRef: React.MutableRefObject<FPSGameEngine | null>;
}

const ELEMENT_INFO = [
  { id: 'plasma', name: 'Plasma Injector', desc: 'Adds plasma burn damage over time to targets with spark explosions.', icon: Flame, color: 'text-orange-400 border-orange-500/30 bg-orange-950/20 hover:bg-orange-950/40', activeBg: 'bg-orange-500/20 border-orange-400', cost: 10 },
  { id: 'cryo', name: 'Cryogenic Infusion', desc: 'Slowing effect on hit, reducing enemy movement speed by 45%.', icon: ShieldAlert, color: 'text-blue-400 border-blue-500/30 bg-blue-950/20 hover:bg-blue-950/40', activeBg: 'bg-blue-500/20 border-blue-400', cost: 10 },
  { id: 'arc', name: 'Arc Discharge', desc: 'Fires high-voltage rounds that chain electrical energy to up to 3 nearby foes.', icon: Zap, color: 'text-cyan-400 border-cyan-500/30 bg-cyan-950/20 hover:bg-cyan-950/40', activeBg: 'bg-cyan-500/20 border-cyan-400', cost: 10 },
  { id: 'void', name: 'Void Singularity', desc: 'Bullets generate micro-vortices pulling enemies together.', icon: Orbit, color: 'text-purple-400 border-purple-500/30 bg-purple-950/20 hover:bg-purple-950/40', activeBg: 'bg-purple-500/20 border-purple-400', cost: 15 },
  { id: 'chrono', name: 'Chrono Matrix', desc: 'Shots warp local space, slowing down enemy AI updates for 3.5 seconds.', icon: Cpu, color: 'text-yellow-400 border-yellow-500/30 bg-yellow-950/20 hover:bg-yellow-950/40', activeBg: 'bg-yellow-500/20 border-yellow-400', cost: 12 },
  { id: 'corruption', name: 'Nanite Decay', desc: 'Injects corrupting nanites that amplify subsequent damage up to 3x.', icon: Sparkles, color: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40', activeBg: 'bg-emerald-500/20 border-emerald-400', cost: 12 },
];

const BEHAVIOR_INFO = [
  { id: 'ricochet', name: 'Ricochet Matrix', desc: 'Bullets bounce off walls and search for secondary enemy targets.', icon: Orbit, color: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/20 hover:bg-indigo-950/40', activeBg: 'bg-indigo-500/20 border-indigo-400', cost: 15 },
  { id: 'echo', name: 'Echo Chamber', desc: 'Each bullet fired produces a duplicate temporal echo shot 0.1s later.', icon: Undo2, color: 'text-rose-400 border-rose-500/30 bg-rose-950/20 hover:bg-rose-950/40', activeBg: 'bg-rose-500/20 border-rose-400', cost: 15 },
];

export function WeaponFusionLab({ stats, engineRef }: WeaponFusionLabProps) {
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponId>(stats.selectedWeaponId);
  const [message, setMessage] = useState<string | null>(null);

  const weaponsList: { id: WeaponId; label: string }[] = [
    { id: 'pistol', label: 'Tactical Pistol' },
    { id: 'rifle', label: 'Assault Rifle' },
    { id: 'shotgun', label: 'Breaker Shotgun' },
    { id: 'launcher', label: 'Rocket Launcher' },
    { id: 'sniper', label: 'Cyber Sniper' },
  ];

  const handleFuseElement = (elementId: any, cost: number) => {
    if (stats.anomalyCores < cost) {
      setMessage('INSUFFICIENT ANOMALY CORES');
      setTimeout(() => setMessage(null), 2500);
      return;
    }

    if (engineRef.current) {
      // Deduct cores & apply element to selected weapon
      const currentElement = engineRef.current.stats.weaponElements[selectedWeapon];
      const nextElement = currentElement === elementId ? 'none' : elementId;
      
      engineRef.current.stats.anomalyCores -= cost;
      engineRef.current.stats.weaponElements[selectedWeapon] = nextElement as any;
      
      // Sync engine back to state
      engineRef.current.callbacks.onStatsUpdate({ ...engineRef.current.stats });
      setMessage(`FUSION PROTOCOL SUCCESSFUL`);
      setTimeout(() => setMessage(null), 2500);
    }
  };

  const handleFuseBehavior = (behaviorId: any, cost: number) => {
    if (stats.anomalyCores < cost) {
      setMessage('INSUFFICIENT ANOMALY CORES');
      setTimeout(() => setMessage(null), 2500);
      return;
    }

    if (engineRef.current) {
      const currentBehavior = engineRef.current.stats.weaponBehaviors[selectedWeapon];
      const nextBehavior = currentBehavior === behaviorId ? 'none' : behaviorId;
      
      engineRef.current.stats.anomalyCores -= cost;
      engineRef.current.stats.weaponBehaviors[selectedWeapon] = nextBehavior as any;
      
      engineRef.current.callbacks.onStatsUpdate({ ...engineRef.current.stats });
      setMessage(`FUSION PROTOCOL SUCCESSFUL`);
      setTimeout(() => setMessage(null), 2500);
    }
  };

  const handleClose = () => {
    if (engineRef.current) {
      engineRef.current.stats.workbenchActive = false;
      engineRef.current.callbacks.onStatsUpdate({ ...engineRef.current.stats });
    }
  };

  const activeElem = stats.weaponElements[selectedWeapon];
  const activeBehav = stats.weaponBehaviors[selectedWeapon];

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-lg">
      <div className="relative w-full max-w-5xl rounded-3xl border border-slate-800/80 bg-slate-900/95 shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[85vh]">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-2 rounded-xl bg-slate-800/60 border border-slate-700 hover:bg-slate-700/80 hover:text-white text-slate-400 transition-all active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Sidebar Weapon Select */}
        <div className="w-full md:w-1/4 border-r border-slate-800/80 p-6 flex flex-col gap-4 bg-slate-900/40">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h2 className="text-sm font-bold tracking-widest text-slate-400 uppercase">WEAPONS GRID</h2>
          </div>
          
          <div className="flex flex-col gap-2.5">
            {weaponsList.map((w) => {
              const active = selectedWeapon === w.id;
              const hasElement = stats.weaponElements[w.id] !== 'none';
              const hasBehavior = stats.weaponBehaviors[w.id] !== 'none';
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedWeapon(w.id)}
                  className={`w-full text-left p-4 rounded-2xl border transition-all flex flex-col gap-1.5 ${
                    active
                      ? 'bg-slate-800 border-purple-500/80 text-white shadow-md'
                      : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="font-semibold text-sm">{w.label}</span>
                  <div className="flex gap-1.5 flex-wrap">
                    {hasElement && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 uppercase font-bold tracking-wider">
                        {stats.weaponElements[w.id]}
                      </span>
                    )}
                    {hasBehavior && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase font-bold tracking-wider">
                        {stats.weaponBehaviors[w.id]}
                      </span>
                    )}
                    {!hasElement && !hasBehavior && (
                      <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Standard</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-auto pt-6 border-t border-slate-800 flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 tracking-wider uppercase">AVAILABLE RESOURCES</span>
            <div className="flex items-center gap-2.5 bg-slate-950/60 border border-slate-800/80 px-4 py-3 rounded-2xl">
              <div className="w-3.5 h-3.5 rounded-full bg-cyan-500 animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
              <div className="flex flex-col">
                <span className="text-xl font-black text-cyan-400">{stats.anomalyCores}</span>
                <span className="text-[9px] font-bold text-slate-400 tracking-wider">ANOMALY CORES</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fusion Core Grids */}
        <div className="flex-1 p-6 flex flex-col gap-6 overflow-y-auto">
          <div>
            <span className="text-[10px] font-bold text-purple-400 tracking-widest uppercase">ECLIPSE RESEARCH INTERFACES</span>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight mt-0.5">Weapon Fusion Matrix</h1>
            <p className="text-xs text-slate-400 mt-1">
              Select elements and firing core behaviors to fuse into the <strong className="text-purple-300">{weaponsList.find(w => w.id === selectedWeapon)?.label}</strong> using procedural anomaly components.
            </p>
          </div>

          {message && (
            <div className="p-3 text-center text-xs rounded-xl font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 uppercase tracking-widest animate-pulse">
              {message}
            </div>
          )}

          {/* Elemental Injectors Grid */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800/80">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold tracking-wider uppercase text-slate-300">Phase 1: Elemental Infusions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {ELEMENT_INFO.map((elem) => {
                const isActive = activeElem === elem.id;
                const Icon = elem.icon;
                return (
                  <button
                    key={elem.id}
                    onClick={() => handleFuseElement(elem.id, elem.cost)}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all relative overflow-hidden ${
                      isActive ? elem.activeBg : elem.color
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-slate-950/40">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1 pr-14">
                      <span className="font-bold text-sm text-slate-200">{elem.name}</span>
                      <p className="text-[11px] text-slate-400 leading-normal">{elem.desc}</p>
                    </div>
                    
                    <div className="absolute top-4 right-4 flex flex-col items-end">
                      {isActive ? (
                        <span className="text-[10px] font-black text-purple-400 tracking-wider uppercase">ACTIVE</span>
                      ) : (
                        <>
                          <span className="text-sm font-extrabold text-cyan-400">{elem.cost}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">CORES</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Firing Behaviors Grid */}
          <div className="flex flex-col gap-3 mt-2">
            <div className="flex items-center gap-2 pb-1.5 border-b border-slate-800/80">
              <Orbit className="w-4 h-4 text-indigo-400" />
              <span className="text-xs font-bold tracking-wider uppercase text-slate-300">Phase 2: Projectile Behavior Fusions</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BEHAVIOR_INFO.map((behav) => {
                const isActive = activeBehav === behav.id;
                const Icon = behav.icon;
                return (
                  <button
                    key={behav.id}
                    onClick={() => handleFuseBehavior(behav.id, behav.cost)}
                    className={`p-4 rounded-2xl border text-left flex items-start gap-4 transition-all relative overflow-hidden ${
                      isActive ? behav.activeBg : behav.color
                    }`}
                  >
                    <div className="p-2.5 rounded-xl bg-slate-950/40">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex flex-col gap-1 pr-14">
                      <span className="font-bold text-sm text-slate-200">{behav.name}</span>
                      <p className="text-[11px] text-slate-400 leading-normal">{behav.desc}</p>
                    </div>
                    
                    <div className="absolute top-4 right-4 flex flex-col items-end">
                      {isActive ? (
                        <span className="text-[10px] font-black text-purple-400 tracking-wider uppercase">ACTIVE</span>
                      ) : (
                        <>
                          <span className="text-sm font-extrabold text-cyan-400">{behav.cost}</span>
                          <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">CORES</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
