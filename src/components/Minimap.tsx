import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/core/GameEngine';

interface Props { engineRef: React.RefObject<GameEngine | null>; }

export const Minimap: React.FC<Props> = ({ engineRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let frame = 0;
    const render = () => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;
      if (canvas && engine) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const data = engine.getRadarData();
          const scale = canvas.width / 420;
          const toMap = (x: number, z: number) => ({ x: canvas.width / 2 + x * scale, y: canvas.height / 2 + z * scale });
          ctx.fillStyle = '#0b100e'; ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.strokeStyle = '#6f796d33'; ctx.lineWidth = 1;
          for (let i = 0; i <= 8; i++) { const p = i * canvas.width / 8; ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, canvas.height); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(canvas.width, p); ctx.stroke(); }
          ctx.strokeStyle = '#9c784c55'; ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
          data.pois.forEach((poi) => { if (poi.looted) return; const p = toMap(poi.x, poi.z); ctx.fillStyle = '#c4995c'; ctx.font = '16px Consolas'; ctx.fillText('?', p.x - 4, p.y + 5); });
          if (data.objective) { const p = toMap(data.objective.x, data.objective.z); ctx.fillStyle = '#d56749'; ctx.beginPath(); ctx.moveTo(p.x, p.y - 8); ctx.lineTo(p.x + 8, p.y); ctx.lineTo(p.x, p.y + 8); ctx.lineTo(p.x - 8, p.y); ctx.fill(); }
          if (data.extraction) { const p = toMap(data.extraction.x, data.extraction.z); ctx.strokeStyle = '#8cab8f'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, 8, 0, Math.PI * 2); ctx.stroke(); }
          data.enemies.forEach((enemy) => { const p = toMap(enemy.x, enemy.z); ctx.fillStyle = enemy.state === 'PATROL' ? '#7d796a' : '#c8513b'; ctx.fillRect(p.x - 2, p.y - 2, 4, 4); });
          const player = toMap(data.playerPos.x, data.playerPos.z); ctx.save(); ctx.translate(player.x, player.y); ctx.rotate(-data.playerYaw); ctx.fillStyle = '#e9e2d2'; ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 4); ctx.lineTo(-6, 7); ctx.fill(); ctx.restore();
        }
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frame);
  }, [engineRef]);
  return <canvas ref={canvasRef} width={720} height={720} aria-label="Tactical operation map" />;
};
