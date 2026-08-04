import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/core/GameEngine';
import { PlayerStats, HitMarker } from './types';
import { DesktopControls } from './components/DesktopControls';
import { HUD } from './components/HUD';
import { GameOverModal } from './components/GameOverModal';
import { PauseMenu } from './components/PauseMenu';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    stamina: 100,
    medInjectors: 3,
    currentClip: 30,
    reserveMags: 5,
    weaponName: 'AR-21 VANGUARD',
    weaponCategory: 'assault_rifle',
    grenadesCount: 4,
    supportSequence: [],
    isSupportOpen: false,
    objectiveText: 'SABOTAGE ENEMY COMMAND UPLINK',
    extractionAvailable: false,
    extractionTimer: 60,
    injuries: {
      head: false,
      torso: false,
      leftArm: false,
      rightArm: false,
      leftLeg: false,
      rightLeg: false,
    },
    stance: 'STANDING',
  });

  const [hitMarker, setHitMarker] = useState<HitMarker | null>(null);
  const [killFeedMessage, setKillFeedMessage] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isOperationSuccess, setIsOperationSuccess] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  // Initialize GameEngine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(
      containerRef.current,
      {
        onStatsUpdate: (updatedStats) => setStats(updatedStats),
        onHitMarker: (marker) => setHitMarker(marker),
        onKill: (name, isHeadshot) => {
          setKillFeedMessage(isHeadshot ? `HEADSHOT! ${name} Defeated` : `${name} Eliminated`);
          setTimeout(() => setKillFeedMessage(null), 2500);
        },
        onGameOver: () => setIsGameOver(true),
        onOperationSuccess: () => setIsOperationSuccess(true),
      },
      'forge_city'
    );

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  const handleLockPointer = useCallback(() => {
    if (!containerRef.current) return;
    containerRef.current.requestPointerLock();
  }, []);

  useEffect(() => {
    const handlePointerLockChange = () => {
      const isLocked = document.pointerLockElement === containerRef.current;
      setIsPointerLocked(isLocked);
    };

    document.addEventListener('pointerlockchange', handlePointerLockChange);
    return () => document.removeEventListener('pointerlockchange', handlePointerLockChange);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950">
      {/* 3D Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Tactical HUD */}
      <HUD
        stats={stats}
        hitMarker={hitMarker}
        damageAngle={null}
        killFeedMessage={killFeedMessage}
        engineRef={engineRef}
        onSelectWeapon={() => {}}
        onReload={() => engineRef.current?.reloadWeapon()}
      />

      {/* Desktop Controls overlay */}
      <DesktopControls
        engineRef={engineRef}
        isPointerLocked={isPointerLocked}
        onLockPointer={handleLockPointer}
      />

      {/* Operation Victory / Success Modal */}
      {isOperationSuccess && (
        <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 text-white text-center">
          <div className="text-4xl font-black text-emerald-400 tracking-widest uppercase mb-2">
            OPERATION SUCCESSFUL
          </div>
          <div className="text-lg font-mono text-slate-300 mb-6">
            ASC VALIANT SHUTTLE RETRIEVED OPERATOR & CARRIED SAMPLES
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black tracking-wider uppercase rounded-xl shadow-lg transition-all"
          >
            RETURN TO ASC VALIANT COMMAND CARRIER
          </button>
        </div>
      )}

      {/* Game Over Modal */}
      {isGameOver && (
        <GameOverModal
          stats={{ kills: 0, score: 0, headshots: 0, wave: 1 }}
          onRestart={() => window.location.reload()}
        />
      )}

      {/* Pause Menu */}
      {isPaused && (
        <PauseMenu
          settings={{
            soundVolume: 0.8,
            mouseSensitivity: 1.0,
            touchSensitivity: 1.5,
            invertY: false,
            crosshairColor: '#38bdf8',
            difficulty: 'hostile',
            fov: 75,
          }}
          onUpdateSettings={() => {}}
          onResume={() => setIsPaused(false)}
          onRestart={() => window.location.reload()}
        />
      )}
    </div>
  );
}
