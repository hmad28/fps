import React, { useEffect, useRef, useState, useCallback } from 'react';
import { FPSGameEngine } from './game/FPSGameEngine';
import { GameSettings, HitMarker, PlayerStats, WeaponId } from './types';
import { VirtualJoystick } from './components/VirtualJoystick';
import { DesktopControls } from './components/DesktopControls';
import { HUD } from './components/HUD';
import { GameOverModal } from './components/GameOverModal';
import { PauseMenu } from './components/PauseMenu';
import { WeaponFusionLab } from './components/WeaponFusionLab';
import { Pause, Play } from 'lucide-react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<FPSGameEngine | null>(null);

  // States
  const [stats, setStats] = useState<PlayerStats>({
    health: 100,
    maxHealth: 100,
    shield: 50,
    maxShield: 50,
    score: 0,
    kills: 0,
    headshots: 0,
    wave: 1,
    selectedWeaponId: 'pistol',
    ammo: {
      pistol: { clip: 12, reserve: 72 },
      rifle: { clip: 30, reserve: 180 },
      shotgun: { clip: 8, reserve: 32 },
      launcher: { clip: 3, reserve: 9 },
      sniper: { clip: 5, reserve: 20 },
    },
    isReloading: false,
    reloadProgress: 0,
    grenades: 3,
    empCooldown: 0,
    empCooldownSeconds: 0,
    stage: 1,
    objectiveProgress: 0,
    objectiveText: 'RESTORE POWER AT CENTRAL GENERATOR (PRESS E AT CONSOLE)',
    isSprinting: false,
    isCrouching: false,
    isSliding: false,
    isADS: false,
    slideTimer: 0,
    activeUpgrades: [],
    
    // Eclipse Protocol Initial State
    biome: 'neon',
    weaponElements: {
      pistol: 'none',
      rifle: 'none',
      shotgun: 'none',
      launcher: 'none',
      sniper: 'none',
    },
    weaponBehaviors: {
      pistol: 'none',
      rifle: 'none',
      shotgun: 'none',
      launcher: 'none',
      sniper: 'none',
    },
    activePortals: [],
    hunterActive: false,
    hunterAdaptation: '',
    worldShiftName: '',
    worldShiftTimeRemaining: 0,
    anomalyCores: 0,
    runStage: 1,
    extractionActive: false,
    workbenchActive: false,
    activeDistrict: 'collapsed_gate',
    powerGrid: 'online',
    metroStatus: 'active',
    securityLevel: 1,
    civilianSafety: 100,
    heliosControl: 100,
    rebelInfluence: 0,
    militaryInfluence: 0,
    weatherState: 'clear',
    timeOfNight: 'Dusk',
    flashlightActive: false,
    nightVisionActive: false,
    activeMissions: [
      { id: 'gate_reconnect', name: 'Establish Link', desc: 'Find the transmitter in Collapsed Gate and reboot it.', status: 'active', district: 'collapsed_gate' },
      { id: 'neon_hacks', name: 'Breach Market Grid', desc: 'Infiltrate Neon Market and override HELIOS sensors.', status: 'active', district: 'neon_market' },
      { id: 'metro_restart', name: 'Reboot Transit Rail', desc: 'Secure the central station and start the automated express train.', status: 'active', district: 'transit_hub' },
    ],
  });

  const [hitMarker, setHitMarker] = useState<HitMarker | null>(null);
  const [damageAngle, setDamageAngle] = useState<number | null>(null);
  const [killFeedMessage, setKillFeedMessage] = useState<string | null>(null);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [controlType, setControlType] = useState<'touch' | 'keyboard_mouse'>('touch');
  const [isPointerLocked, setIsPointerLocked] = useState(false);

  const [settings, setSettings] = useState<GameSettings>({
    soundVolume: 0.8,
    mouseSensitivity: 1.0,
    touchSensitivity: 1.5,
    invertY: false,
    crosshairColor: '#38bdf8',
    difficulty: 'normal',
  });

  // Auto-detect mobile touch device on mount
  useEffect(() => {
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    setControlType(isTouch ? 'touch' : 'keyboard_mouse');
  }, []);

  // Initialize FPS Engine
  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new FPSGameEngine(containerRef.current, {
      onStatsUpdate: (updatedStats) => {
        setStats(updatedStats);
      },
      onHitMarker: (marker) => {
        setHitMarker(marker);
      },
      onDamageTaken: (angle) => {
        setDamageAngle(angle);
      },
      onKill: (enemyName, isHeadshot) => {
        const isNotification = 
          enemyName.includes('+') || 
          enemyName.includes('RECOVERED') || 
          enemyName.includes('CHARGED') || 
          enemyName.includes('RELOADED') || 
          enemyName.includes('WORLD SHIFT') || 
          enemyName.includes('ACQUIRED') || 
          enemyName.includes('SECURED') ||
          enemyName.includes('TACTICAL');

        if (isNotification) {
          setKillFeedMessage(enemyName);
        } else {
          setKillFeedMessage(isHeadshot ? `HEADSHOT! ${enemyName} Eliminated` : `${enemyName} Defeated`);
        }
        setTimeout(() => setKillFeedMessage(null), 2500);
      },
      onGameOver: () => {
        setIsGameOver(true);
      },
      onWaveComplete: (waveNum) => {
        setKillFeedMessage(`WAVE ${waveNum} CLEARED! Next wave incoming...`);
        setTimeout(() => setKillFeedMessage(null), 3000);
      },
    });

    engineRef.current = engine;
    engine.start();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Handlers
  const handleMove = useCallback((forward: number, right: number) => {
    if (engineRef.current) {
      engineRef.current.moveForward = forward;
      engineRef.current.moveRight = right;
    }
  }, []);

  const handleLookDelta = useCallback((deltaX: number, deltaY: number) => {
    if (engineRef.current) {
      engineRef.current.applyLookDelta(deltaX, deltaY);
    }
  }, []);

  const handleShootStart = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.isShooting = true;
      engineRef.current.fireWeapon();
    }
  }, []);

  const handleShootEnd = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.isShooting = false;
    }
  }, []);

  const handleReload = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.reloadWeapon();
    }
  }, []);

  const handleJump = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.jump();
    }
  }, []);

  const handleDash = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.dash();
    }
  }, []);

  const handleSelectWeapon = useCallback((id: WeaponId) => {
    if (engineRef.current) {
      engineRef.current.selectWeapon(id);
    }
  }, []);

  const handleSprint = useCallback((active: boolean) => {
    if (engineRef.current) {
      engineRef.current.setSprint(active);
    }
  }, []);

  const handleCrouch = useCallback((active: boolean) => {
    if (engineRef.current) {
      engineRef.current.setCrouch(active);
    }
  }, []);

  const handleADS = useCallback((active: boolean) => {
    if (engineRef.current) {
      engineRef.current.setADS(active);
    }
  }, []);

  const handleEMP = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.triggerEMP();
    }
  }, []);

  const handleGrenade = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.throwGrenade();
    }
  }, []);

  const handleInteract = useCallback(() => {
    if (engineRef.current) {
      engineRef.current.interact();
    }
  }, []);

  const handleRestart = useCallback(() => {
    setIsGameOver(false);
    setIsPaused(false);
    if (engineRef.current) {
      engineRef.current.restart();
      if (containerRef.current && controlType === 'keyboard_mouse') {
        containerRef.current.requestPointerLock().catch(() => {});
      }
    }
  }, [controlType]);

  const handlePauseToggle = useCallback(() => {
    setIsPaused((prev) => {
      const next = !prev;
      if (engineRef.current) {
        if (next) {
          engineRef.current.pause();
          if (document.pointerLockElement) {
            document.exitPointerLock();
          }
        } else {
          engineRef.current.start();
          if (containerRef.current && controlType === 'keyboard_mouse') {
            containerRef.current.requestPointerLock().catch(() => {});
          }
        }
      }
      return next;
    });
  }, [controlType]);

  // Global listener for Escape/KeyP key to toggle pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        e.preventDefault();
        handlePauseToggle();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePauseToggle]);

  const handleUpdateSettings = useCallback((newSettings: Partial<GameSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      if (engineRef.current) {
        engineRef.current.updateSettings(updated);
      }
      return updated;
    });
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full z-0 cursor-crosshair" />

      {/* Main Game HUD */}
      {!isGameOver && !isPaused && (
        <HUD
          stats={stats}
          hitMarker={hitMarker}
          damageAngle={damageAngle}
          killFeedMessage={killFeedMessage}
          engineRef={engineRef}
          onSelectWeapon={handleSelectWeapon}
          onReload={handleReload}
        />
      )}

      {/* Touch Joystick Controls (for mobile/touch) */}
      {!isGameOver && !isPaused && controlType === 'touch' && (
        <VirtualJoystick
          onMove={handleMove}
          onLookDelta={handleLookDelta}
          onShootStart={handleShootStart}
          onShootEnd={handleShootEnd}
          onReload={handleReload}
          onJump={handleJump}
          onDash={handleDash}
          onSelectWeapon={handleSelectWeapon}
          selectedWeaponId={stats.selectedWeaponId}
          isReloading={stats.isReloading}
        />
      )}

      {/* Desktop Pointer Lock Controls Overlay (for PC/Keyboard) */}
      {!isGameOver && !isPaused && controlType === 'keyboard_mouse' && (
        <DesktopControls
          containerRef={containerRef}
          onMove={handleMove}
          onLookDelta={handleLookDelta}
          onShootStart={handleShootStart}
          onShootEnd={handleShootEnd}
          onReload={handleReload}
          onJump={handleJump}
          onDash={handleDash}
          onPauseToggle={handlePauseToggle}
          onSelectWeapon={handleSelectWeapon}
          onSprint={handleSprint}
          onCrouch={handleCrouch}
          onADS={handleADS}
          onEMP={handleEMP}
          onGrenade={handleGrenade}
          onInteract={handleInteract}
          isPointerLocked={isPointerLocked}
          setIsPointerLocked={setIsPointerLocked}
          selectedWeaponId={stats.selectedWeaponId}
        />
      )}

      {/* Pause Button (Top Center-Right) */}
      {!isGameOver && !isPaused && (
        <button
          onClick={handlePauseToggle}
          className="absolute top-4 right-4 z-30 w-11 h-11 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700/80 text-slate-300 hover:text-white flex items-center justify-center shadow-lg active:scale-95 transition-all"
        >
          <Pause className="w-5 h-5" />
        </button>
      )}

      {/* Pause Menu Modal */}
      {isPaused && (
        <PauseMenu
          onResume={handlePauseToggle}
          onRestart={handleRestart}
          controlType={controlType}
          setControlType={setControlType}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
        />
      )}

      {/* Game Over Modal */}
      {isGameOver && <GameOverModal stats={stats} onRestart={handleRestart} />}

      {/* Weapon Fusion Lab Workbench */}
      {stats.workbenchActive && (
        <WeaponFusionLab stats={stats} engineRef={engineRef} />
      )}
    </div>
  );
}
