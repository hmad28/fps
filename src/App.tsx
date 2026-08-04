import React, { useCallback, useEffect, useRef, useState } from 'react';
import { GameEngine, OperationReport } from './game/core/GameEngine';
import { PlayerStats, HitMarker } from './types';
import { DesktopControls } from './components/DesktopControls';
import { HUD } from './components/HUD';
import { Minimap } from './components/Minimap';

type Phase = 'carrier' | 'mission' | 'report' | 'dead';
const initialStats: PlayerStats = {
  health: 100, maxHealth: 100, shield: 0, maxShield: 0, stamina: 100, medInjectors: 3, currentClip: 30, reserveMags: 5,
  weaponName: 'AR-21 Vanguard Rifle', weaponCategory: 'assault_rifle', grenadesCount: 4, supportSequence: [], isSupportOpen: false,
  supportCooldowns: {}, objectiveText: 'DESCENT IN PROGRESS', extractionAvailable: false, extractionCalled: false, extractionTimer: 72,
  extractionInput: [], extractionTerminal: false, samples: 0, interactionPrompt: null, alertLevel: 'LOW', armorType: 'medium',
  injuries: { head: false, torso: false, leftArm: false, rightArm: false, leftLeg: false, rightLeg: false }, stance: 'STANDING',
};

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const timersRef = useRef<number[]>([]);
  const [phase, setPhase] = useState<Phase>('carrier');
  const [stats, setStats] = useState<PlayerStats>(initialStats);
  const [hitMarker, setHitMarker] = useState<HitMarker | null>(null);
  const [damageAngle, setDamageAngle] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [report, setReport] = useState<OperationReport | null>(null);
  const [ready, setReady] = useState(false);
  const [deploying, setDeploying] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [isPointerLocked, setIsPointerLocked] = useState(false);
  const [armor, setArmor] = useState<'light' | 'medium' | 'heavy'>('medium');
  const [insertion, setInsertion] = useState<'south' | 'east'>('south');

  const flashMessage = useCallback((text: string) => {
    setMessage(text);
    const id = window.setTimeout(() => setMessage(null), 3600);
    timersRef.current.push(id);
  }, []);

  useEffect(() => {
    if (phase !== 'mission' || !containerRef.current) return;
    const engine = new GameEngine(containerRef.current, {
      onStatsUpdate: setStats,
      onHitMarker: setHitMarker,
      onKill: (name, headshot) => flashMessage(`${headshot ? 'CRITICAL STRIKE' : 'TARGET DOWN'} // ${name}`),
      onDamage: (angle) => { setDamageAngle(angle); const id = window.setTimeout(() => setDamageAngle(null), 420); timersRef.current.push(id); },
      onMessage: flashMessage,
      onReady: () => {
        setReady(true);
        engine.player.position.set(insertion === 'south' ? 0 : 78, 1.8, insertion === 'south' ? 112 : 76);
      },
      onGameOver: () => { document.exitPointerLock?.(); setPhase('dead'); },
      onOperationSuccess: (operationReport) => { document.exitPointerLock?.(); setReport(operationReport); setPhase('report'); },
    });
    engine.inventory.armorType = armor;
    engineRef.current = engine;
    engine.start();
    const overlayId = window.setTimeout(() => setDeploying(false), 6200);
    timersRef.current.push(overlayId);
    return () => { engine.stop(); engineRef.current = null; setReady(false); };
  }, [phase, armor, insertion, flashMessage]);

  useEffect(() => {
    const pointer = () => setIsPointerLocked(document.pointerLockElement === containerRef.current);
    const toggleMap = () => setShowMap((value) => !value);
    document.addEventListener('pointerlockchange', pointer);
    window.addEventListener('blacksite:toggle-map', toggleMap);
    return () => { document.removeEventListener('pointerlockchange', pointer); window.removeEventListener('blacksite:toggle-map', toggleMap); timersRef.current.forEach(clearTimeout); };
  }, []);

  const deploy = () => { setStats({ ...initialStats, armorType: armor }); setDeploying(true); setPhase('mission'); };
  const lockPointer = () => { if (ready && !deploying && containerRef.current) containerRef.current.requestPointerLock(); };
  const returnToCarrier = () => { setReport(null); setStats(initialStats); setPhase('carrier'); };

  return (
    <main className="game-shell">
      {phase === 'carrier' && (
        <section className="carrier-deck">
          <div className="carrier-depth" aria-hidden="true"><i /><i /><i /><b>ASC—VALIANT</b></div>
          <header className="carrier-header"><span>A.E.G.I.S. ATMOSPHERIC COMMAND</span><strong>BLACKSITE <em>FRONTLINE DESCENT</em></strong><small>ASC VALIANT // ORBITAL DECK 04</small></header>
          <div className="deployment-terminal">
            <aside><span>TACTICAL TABLE 07</span><b>FORGE CITY</b><p>Industrial occupation zone K-17. Iron Choir command traffic is coordinating foundry defenses across the basin.</p><dl><dt>OPERATION</dt><dd>Disable machine command uplink</dd><dt>CONDITIONS</dt><dd>Dry ash · low visibility · active patrol grid</dd><dt>RISK</dt><dd>CONTESTED // 03</dd></dl></aside>
            <div className="loadout-grid">
              <fieldset><legend>01 // ARMOR RIG</legend>{(['light', 'medium', 'heavy'] as const).map((option) => <button key={option} className={armor === option ? 'selected' : ''} onClick={() => setArmor(option)}><b>{option.toUpperCase()}</b><span>{option === 'light' ? 'Fast / vulnerable' : option === 'heavy' ? 'Slow / 33% mitigation' : 'Balanced / 14% mitigation'}</span></button>)}</fieldset>
              <fieldset><legend>02 // INSERTION VECTOR</legend><button className={insertion === 'south' ? 'selected' : ''} onClick={() => setInsertion('south')}><b>SOUTH FREIGHT LINE</b><span>Long approach · patrol intercept likely</span></button><button className={insertion === 'east' ? 'selected' : ''} onClick={() => setInsertion('east')}><b>EASTERN WORKS</b><span>Closer insertion · fortified route</span></button></fieldset>
              <fieldset className="support-field"><legend>03 // COMMAND SUPPORT</legend>{['Kinetic Lance', 'Supply Capsule', 'Rook VTOL', 'Autocannon Sentry'].map((item, index) => <div key={item}><b>0{index + 1}</b><span>{item}</span></div>)}</fieldset>
              <button className="deploy-control" onClick={deploy}><span>AUTHORIZE SINGLE-OPERATOR DESCENT</span><b>DEPLOY</b></button>
            </div>
          </div>
          <footer className="carrier-footer"><span>MAX SQUAD ARCHITECTURE // 4</span><span>NETWORK STATUS // SOLO LOCAL OPERATION</span><span>FRONTLINE LIBERATION // 41.7%</span></footer>
        </section>
      )}

      {phase === 'mission' && (
        <>
          <div ref={containerRef} className="render-surface" />
          <HUD stats={stats} hitMarker={hitMarker} damageAngle={damageAngle} message={message} engineRef={engineRef} />
          <DesktopControls engineRef={engineRef} isPointerLocked={isPointerLocked} onLockPointer={lockPointer} ready={ready && !deploying} />
          {showMap && <section className="tactical-map"><header><span>AEGIS TERRAIN LATTICE</span><b>FORGE CITY // K-17</b><small>[M] CLOSE</small></header><Minimap engineRef={engineRef} /><aside><span>◆ PRIMARY UPLINK</span><span>△ EXTRACTION</span><span>? FIELD INTELLIGENCE</span><span>CONTACTS REQUIRE LOCAL SCAN</span></aside></section>}
          {deploying && <section className="descent-sequence"><div className="descent-fire" /><span>ASC VALIANT // DESCENT CAPSULE 17</span><strong>ATMOSPHERIC ENTRY</strong><b>FORGE CITY<br />ALT 08,420M ↓</b><small>Terrain generation and local assets loading behind capsule telemetry</small></section>}
        </>
      )}

      {phase === 'dead' && <section className="outcome-screen outcome-screen--dead"><small>AEGIS BIOMETRIC LINK LOST</small><strong>OPERATOR DOWN</strong><p>Mission completion remains recorded. Carried field resources were lost before extraction.</p><button onClick={returnToCarrier}>RETURN TO ASC VALIANT</button></section>}

      {phase === 'report' && report && <section className="outcome-screen"><small>ASC VALIANT // OPERATION ARCHIVE</small><strong>UPLINK SILENCED</strong><div className="report-grid"><span><b>{report.kills}</b>MACHINE UNITS NEUTRALIZED</span><span><b>{report.resourcesExtracted}</b>RESOURCES EXTRACTED</span><span><b>{Math.floor(report.timeSeconds / 60)}:{Math.floor(report.timeSeconds % 60).toString().padStart(2, '0')}</b>FIELD DURATION</span><span><b>{report.optionalComplete ? 'SECURED' : 'MISSED'}</b>FLIGHT RECORDER</span></div><p>Forge City command traffic fell silent. Local campaign liberation advanced by 0.8%.</p><button onClick={returnToCarrier}>RETURN TO COMMAND DECK</button></section>}
    </main>
  );
}
