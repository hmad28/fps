import React from 'react';
import { PlayerStats } from '../types';
import { Skull, RotateCcw, Trophy, Target, Award } from 'lucide-react';

interface GameOverModalProps {
  stats: PlayerStats;
  onRestart: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ stats, onRestart }) => {
  return (
    <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md z-40 flex items-center justify-center p-4 animate-fade-in select-none">
      <div className="bg-slate-900 border border-red-500/40 rounded-3xl p-8 max-w-md w-full shadow-2xl shadow-red-500/10 text-center relative overflow-hidden">
        {/* Glow Header */}
        <div className="w-20 h-20 rounded-3xl bg-red-500/20 border border-red-500/50 text-red-500 flex items-center justify-center mx-auto mb-4 animate-bounce">
          <Skull className="w-10 h-10" />
        </div>

        <h2 className="text-3xl font-black text-white uppercase tracking-wider mb-1">
          KILLED IN ACTION
        </h2>
        <p className="text-xs text-slate-400 font-medium mb-6 uppercase tracking-widest">
          Mission Failed • Enemy Patrol Overwhelmed Base
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6 text-left">
          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl flex items-center gap-3">
            <Trophy className="w-6 h-6 text-sky-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Wave Reached</div>
              <div className="text-xl font-black text-white">WAVE {stats.wave}</div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl flex items-center gap-3">
            <Award className="w-6 h-6 text-amber-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Final Score</div>
              <div className="text-xl font-black text-amber-400">{stats.score}</div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl flex items-center gap-3">
            <Skull className="w-6 h-6 text-red-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Enemies Eliminated</div>
              <div className="text-xl font-black text-white">{stats.kills}</div>
            </div>
          </div>

          <div className="bg-slate-800/60 border border-slate-700/60 p-3.5 rounded-2xl flex items-center gap-3">
            <Target className="w-6 h-6 text-purple-400" />
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase">Headshots</div>
              <div className="text-xl font-black text-purple-400">{stats.headshots}</div>
            </div>
          </div>
        </div>

        {/* Restart Button */}
        <button
          onClick={onRestart}
          className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black uppercase tracking-wider text-sm shadow-xl shadow-red-600/40 flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <RotateCcw className="w-5 h-5" /> REDEPLOY NOW
        </button>
      </div>
    </div>
  );
};
