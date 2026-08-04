import React, { useEffect, useState } from 'react';
import { HitMarker, PlayerStats } from '../types';
import { SUPPORT_CATALOG } from '../game/support/CommandSupportSystem';

interface Props { stats: PlayerStats; hitMarker: HitMarker | null; damageAngle: number | null; message: string | null; engineRef: React.RefObject<any>; }
const arrow = (value: string) => value === 'UP' ? '↑' : value === 'DOWN' ? '↓' : value === 'LEFT' ? '←' : '→';

export const HUD: React.FC<Props> = ({ stats, hitMarker, damageAngle, message, engineRef }) => {
  const [heading, setHeading] = useState(0);
  const [hitVisible, setHitVisible] = useState(false);
  useEffect(() => { const id = window.setInterval(() => setHeading((((engineRef.current?.player.yaw ?? 0) * 180 / Math.PI) % 360 + 360) % 360), 120); return () => clearInterval(id); }, [engineRef]);
  useEffect(() => { if (!hitMarker) return; setHitVisible(true); const id = setTimeout(() => setHitVisible(false), 130); return () => clearTimeout(id); }, [hitMarker]);
  const injuries = Object.entries(stats.injuries).filter(([, injured]) => injured).map(([zone]) => zone.replace(/([A-Z])/g, ' $1').toUpperCase());
  return (
    <div className="field-hud" aria-live="polite">
      <div className="compass"><span>{Math.round(heading).toString().padStart(3, '0')}°</span><i /><b>{heading < 45 || heading > 315 ? 'N' : heading < 135 ? 'E' : heading < 225 ? 'S' : 'W'}</b></div>
      <section className="mission-slate">
        <small>OP 07–K // FORGE CITY</small>
        <strong>{stats.objectiveText}</strong>
        <span className={`threat threat--${stats.alertLevel.toLowerCase()}`}>THREAT // {stats.alertLevel}</span>
      </section>
      <section className="vitals-slate">
        <div className="hud-label"><span>VANGUARD // {stats.armorType.toUpperCase()} RIG</span><b>{Math.ceil(stats.health)}</b></div>
        <div className="bar bar--health"><i style={{ width: `${stats.health}%` }} /></div>
        <div className="hud-label"><span>ENDURANCE</span><b>{Math.ceil(stats.stamina)}</b></div>
        <div className="bar bar--stamina"><i style={{ width: `${stats.stamina}%` }} /></div>
        <div className="injury-line">{injuries.length ? `INJURY // ${injuries.join(' · ')}` : 'BODY STATUS // NOMINAL'}</div>
      </section>
      <section className="support-rack">
        <small>COMMAND SUPPORT // HOLD Q + WASD</small>
        {['kinetic_lance', 'supply_capsule', 'vtol_strafe', 'autocannon_sentry'].map((id, index) => (
          <div key={id} className={(stats.supportCooldowns[id] ?? 0) > 0 ? 'cooling' : ''}>
            <b>0{index + 1}</b><span>{SUPPORT_CATALOG[id].name}</span>
            <code>{(stats.supportCooldowns[id] ?? 0) > 0 ? `${Math.ceil(stats.supportCooldowns[id])}s` : SUPPORT_CATALOG[id].codeSequence.map(arrow).join(' ')}</code>
          </div>
        ))}
      </section>
      <section className="ammo-slate">
        <small>{stats.weaponName}</small>
        <div><strong>{stats.currentClip.toString().padStart(2, '0')}</strong><span>// {stats.reserveMags} MAGS</span></div>
        <footer><span>GREN {stats.grenadesCount}</span><span>INJ {stats.medInjectors}</span><span>DATA {stats.samples}</span></footer>
      </section>
      {stats.interactionPrompt && <div className="interaction-prompt">{stats.interactionPrompt}</div>}
      {stats.extractionCalled && !stats.extractionTerminal && <div className="extraction-clock">SHUTTLE INBOUND <b>{Math.ceil(stats.extractionTimer).toString().padStart(2, '0')}</b></div>}
      {stats.extractionTerminal && <div className="terminal-code"><small>EXTRACTION AUTHORIZATION</small><strong>↓ → ↑</strong><span>{stats.extractionInput.map(arrow).join(' ') || 'ENTER SEQUENCE'}</span></div>}
      {stats.isSupportOpen && <div className="wrist-interface"><small>WRIST UPLINK // INPUT ACTIVE</small><strong>{stats.supportSequence.map(arrow).join(' ') || '—'}</strong></div>}
      <div className="reticle"><i /><i />{hitVisible && <b className={hitMarker?.isHeadshot ? 'headshot' : ''}>×</b>}</div>
      {damageAngle !== null && <div className="damage-indicator" style={{ transform: `rotate(${damageAngle}rad) translateY(-33vh)` }}>▲</div>}
      {message && <div className="field-message">{message}</div>}
    </div>
  );
};
