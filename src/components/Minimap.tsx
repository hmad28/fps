import React, { useEffect, useRef } from 'react';
import { FPSGameEngine } from '../game/FPSGameEngine';

interface MinimapProps {
  engineRef: React.RefObject<FPSGameEngine | null>;
}

export const Minimap: React.FC<MinimapProps> = ({ engineRef }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animId: number;
    let sweepAngle = 0;

    const render = () => {
      const canvas = canvasRef.current;
      const engine = engineRef.current;

      if (canvas && engine) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const radarData = engine.getRadarData();
          const width = canvas.width;
          const height = canvas.height;
          const cx = width / 2;
          const cy = height / 2;
          const radius = cx - 8; // radar radius on canvas
          const worldRadarRange = 40.0; // max meters visible on radar

          // 1. Clear canvas
          ctx.clearRect(0, 0, width, height);

          // Radar outer background circle & clipping mask
          ctx.save();
          ctx.beginPath();
          ctx.arc(cx, cy, radius, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fill();
          ctx.clip(); // Clip all drawings to the circular radar viewport

          // 2. Draw Concentric Grid Rings
          ctx.lineWidth = 1;
          const rings = [0.33, 0.66, 1.0];
          rings.forEach((rRatio) => {
            ctx.beginPath();
            ctx.arc(cx, cy, radius * rRatio, 0, Math.PI * 2);
            ctx.strokeStyle = rRatio === 1.0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(56, 189, 248, 0.15)';
            ctx.stroke();
          });

          // Crosshair Grid Lines
          ctx.beginPath();
          ctx.moveTo(cx - radius, cy);
          ctx.lineTo(cx + radius, cy);
          ctx.moveTo(cx, cy - radius);
          ctx.lineTo(cx, cy + radius);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.15)';
          ctx.stroke();

          // 3. Draw Map Obstacles / Structures (faint tactical layout walls)
          if (radarData.obstacles && radarData.obstacles.length > 0) {
            ctx.fillStyle = 'rgba(51, 65, 85, 0.45)';
            ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
            ctx.lineWidth = 1;

            radarData.obstacles.forEach((b) => {
              const minDx = b.minX - radarData.playerPos.x;
              const maxDx = b.maxX - radarData.playerPos.x;
              const minDz = b.minZ - radarData.playerPos.z;
              const maxDz = b.maxZ - radarData.playerPos.z;

              const cMinX = cx + (minDx / worldRadarRange) * radius;
              const cMaxX = cx + (maxDx / worldRadarRange) * radius;
              const cMinY = cy + (minDz / worldRadarRange) * radius;
              const cMaxY = cy + (maxDz / worldRadarRange) * radius;

              const w = cMaxX - cMinX;
              const h = cMaxY - cMinY;

              ctx.fillRect(cMinX, cMinY, w, h);
              ctx.strokeRect(cMinX, cMinY, w, h);
            });
          }

          // 4. Rotating Sci-Fi Radar Sweep Line
          sweepAngle = (sweepAngle + 0.035) % (Math.PI * 2);
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, sweepAngle - 0.4, sweepAngle);
          ctx.lineTo(cx, cy);
          const sweepGrad = ctx.createConicGradient(sweepAngle, cx, cy);
          sweepGrad.addColorStop(0, 'rgba(56, 189, 248, 0.28)');
          sweepGrad.addColorStop(0.1, 'rgba(56, 189, 248, 0.05)');
          sweepGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
          ctx.fillStyle = sweepGrad;
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(sweepAngle) * radius, cy + Math.sin(sweepAngle) * radius);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          // 5. Draw Active Objective Marker
          if (radarData.objective) {
            const dx = radarData.objective.x - radarData.playerPos.x;
            const dz = radarData.objective.z - radarData.playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist <= worldRadarRange) {
              const ox = cx + (dx / worldRadarRange) * radius;
              const oy = cy + (dz / worldRadarRange) * radius;

              ctx.save();
              ctx.translate(ox, oy);

              const glow = (Math.sin(performance.now() / 150) + 1) * 4;

              ctx.beginPath();
              ctx.arc(0, 0, 6 + glow, 0, Math.PI * 2);
              ctx.fillStyle = 'rgba(236, 72, 153, 0.25)';
              ctx.fill();

              ctx.beginPath();
              ctx.moveTo(0, -6);
              ctx.lineTo(6, 0);
              ctx.lineTo(0, 6);
              ctx.lineTo(-6, 0);
              ctx.closePath();
              ctx.fillStyle = '#ec4899'; // Vibrant pink/magenta for objective
              ctx.strokeStyle = '#ffffff';
              ctx.lineWidth = 1.5;
              ctx.shadowColor = '#ec4899';
              ctx.shadowBlur = 12;
              ctx.fill();
              ctx.stroke();

              ctx.restore();
            }
          }

          // 6. Draw Powerups / Pickups
          radarData.pickups.forEach((p) => {
            const dx = p.x - radarData.playerPos.x;
            const dz = p.z - radarData.playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist <= worldRadarRange) {
              const px = cx + (dx / worldRadarRange) * radius;
              const py = cy + (dz / worldRadarRange) * radius;

              ctx.save();
              ctx.translate(px, py);

              if (p.type === 'health') {
                ctx.fillStyle = '#22c55e'; // Emerald
                ctx.shadowColor = '#22c55e';
                ctx.shadowBlur = 6;
                // Draw cross
                ctx.fillRect(-1.5, -4, 3, 8);
                ctx.fillRect(-4, -1.5, 8, 3);
              } else if (p.type === 'shield') {
                ctx.fillStyle = '#38bdf8'; // Sky
                ctx.shadowColor = '#38bdf8';
                ctx.shadowBlur = 6;
                // Draw diamond
                ctx.beginPath();
                ctx.moveTo(0, -4);
                ctx.lineTo(4, 0);
                ctx.lineTo(0, 4);
                ctx.lineTo(-4, 0);
                ctx.closePath();
                ctx.fill();
              } else {
                // Ammo
                ctx.fillStyle = '#f59e0b'; // Amber
                ctx.shadowColor = '#f59e0b';
                ctx.shadowBlur = 6;
                ctx.fillRect(-3, -3, 6, 6);
              }

              ctx.restore();
            }
          });

          // 6. Draw Enemies
          const now = performance.now();
          radarData.enemies.forEach((e) => {
            const dx = e.x - radarData.playerPos.x;
            const dz = e.z - radarData.playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist <= worldRadarRange) {
              const ex = cx + (dx / worldRadarRange) * radius;
              const ey = cy + (dz / worldRadarRange) * radius;

              ctx.save();
              ctx.translate(ex, ey);

              // Color based on enemy tier
              let color = '#ef4444'; // Red default patrol
              let size = 4;

              if (e.type === 'grunt') color = '#22d3ee';
              else if (e.type === 'heavy') {
                color = '#f97316';
                size = 5.5;
              } else if (e.type === 'sniper') color = '#e879f9';

              // Alert Pulse if attacking / pursuing
              if (e.state === 'ATTACKING' || e.state === 'PURSUING') {
                const pulse = (Math.sin(now / 120) + 1) * 3;
                ctx.beginPath();
                ctx.arc(0, 0, size + pulse + 2, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
              }

              // Draw enemy blip
              ctx.beginPath();
              ctx.arc(0, 0, size, 0, Math.PI * 2);
              ctx.fillStyle = color;
              ctx.shadowColor = color;
              ctx.shadowBlur = 8;
              ctx.fill();

              // Dark outline
              ctx.strokeStyle = '#0f172a';
              ctx.lineWidth = 1;
              ctx.stroke();

              ctx.restore();
            }
          });

          // 7. Draw Player in Center
          ctx.save();
          ctx.translate(cx, cy);

          // Calculate player camera forward direction angle on 2D map canvas
          const forwardX = -Math.sin(radarData.playerYaw);
          const forwardZ = -Math.cos(radarData.playerYaw);
          const yawAngle = Math.atan2(forwardZ, forwardX);

          ctx.rotate(yawAngle);

          // View FOV Cone (wedge showing player looking direction)
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, 18, -Math.PI / 6, Math.PI / 6);
          ctx.closePath();
          ctx.fillStyle = 'rgba(56, 189, 248, 0.22)';
          ctx.fill();

          // Player Direction Pointer Arrow
          ctx.beginPath();
          ctx.moveTo(8, 0);
          ctx.lineTo(-5, -5);
          ctx.lineTo(-2, 0);
          ctx.lineTo(-5, 5);
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.shadowColor = '#38bdf8';
          ctx.shadowBlur = 10;
          ctx.fill();

          ctx.restore();

          // Restore clipping mask
          ctx.restore();

          // 8. Cardinal Direction Markers (N, S, E, W on perimeter)
          ctx.font = 'bold 10px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';

          // N (North - Top)
          ctx.fillStyle = '#38bdf8';
          ctx.fillText('N', cx, cy - radius + 9);
          // S (South - Bottom)
          ctx.fillStyle = '#64748b';
          ctx.fillText('S', cx, cy + radius - 9);
          // E (East - Right)
          ctx.fillText('E', cx + radius - 9, cy);
          // W (West - Left)
          ctx.fillText('W', cx - radius + 9, cy);
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [engineRef]);

  return (
    <div className="flex flex-col items-center">
      <div className="relative p-1 bg-slate-900/85 backdrop-blur-md rounded-full border border-sky-500/40 shadow-xl shadow-sky-500/10 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={140}
          height={140}
          className="rounded-full bg-slate-950/80 cursor-default"
        />

        {/* Outer Ring Detail */}
        <div className="absolute inset-0 rounded-full border border-sky-400/20 pointer-events-none" />
      </div>

      {/* Legend / Radar Header */}
      <div className="mt-1.5 flex items-center gap-2 text-[9px] font-extrabold text-slate-300 bg-slate-900/80 px-2.5 py-0.5 rounded-lg border border-slate-800">
        <span className="flex items-center gap-1 text-red-400">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> ENEMY
        </span>
        <span className="text-slate-600">•</span>
        <span className="flex items-center gap-1 text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> PICKUP
        </span>
      </div>
    </div>
  );
};
