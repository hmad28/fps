import React from 'react';
import { GameSettings, GameDifficulty } from '../types';
import { Settings, Volume2, VolumeX, Smartphone, Monitor, RotateCcw, Play, Gauge } from 'lucide-react';
import { soundEffects } from '../audio/SoundEffects';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
  controlType: 'touch' | 'keyboard_mouse';
  setControlType: (type: 'touch' | 'keyboard_mouse') => void;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  onResume,
  onRestart,
  controlType,
  setControlType,
  settings,
  onUpdateSettings,
}) => {
  const [muted, setMuted] = React.useState(false);

  const toggleMute = () => {
    const isMuted = soundEffects.toggleMute();
    setMuted(isMuted);
  };

  return (
    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-40 flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl shadow-sky-500/10 text-center">
        <div className="flex items-center justify-center gap-2 text-sky-400 mb-2">
          <Settings className="w-6 h-6 animate-spin" />
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">GAME PAUSED</h2>
        </div>

        <p className="text-xs text-slate-400 mb-6 uppercase tracking-widest font-semibold">
          TACTICAL SETTINGS & CONTROLS
        </p>

        {/* Control Mode Toggle */}
        <div className="bg-slate-800/60 p-1.5 rounded-2xl border border-slate-700/60 flex items-center gap-2 mb-4">
          <button
            onClick={() => setControlType('touch')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              controlType === 'touch'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-4 h-4" /> Touch Joystick
          </button>

          <button
            onClick={() => setControlType('keyboard_mouse')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              controlType === 'keyboard_mouse'
                ? 'bg-sky-500 text-white shadow-md shadow-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-4 h-4" /> Mouse / Keyboard
          </button>
        </div>

        {/* Difficulty Dropdown Selector */}
        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 mb-4 text-left">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
            <span className="flex items-center gap-2 text-amber-400">
              <Gauge className="w-4 h-4" />
              GAME DIFFICULTY / KESULITAN
            </span>
          </div>
          <div className="relative">
            <select
              value={settings.difficulty || 'normal'}
              onChange={(e) => onUpdateSettings({ difficulty: e.target.value as GameDifficulty })}
              className="w-full bg-slate-900 border border-slate-700 text-slate-100 font-bold text-xs rounded-xl px-3 py-2.5 outline-none focus:border-sky-500 cursor-pointer appearance-none pr-8 transition-colors"
            >
              <option value="easy">🟢 Easy (Spawn 0.7x • Pelatihan / Santai)</option>
              <option value="normal">🔵 Normal (Spawn 1.0x • Standar Taktis)</option>
              <option value="hard">🟠 Hard (Spawn 1.3x • Kecepatan & Akurasi Tinggi)</option>
              <option value="nightmare">🔴 Nightmare (Spawn 1.7x • Musuh Mematikan)</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
              </svg>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 mt-2 font-medium leading-relaxed">
            Menyesuaikan rasio spawn musuh, kecepatan gerak, reaktivitas deteksi, dan akurasi tembakan.
          </p>
        </div>

        {/* Audio Volume Slider & Mute */}
        <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700/50 mb-6 text-left">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 mb-2">
            <span className="flex items-center gap-2">
              {muted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-sky-400" />}
              WEAPON & GAME AUDIO
            </span>
            <button
              onClick={toggleMute}
              className="text-[10px] font-bold uppercase text-sky-400 hover:underline"
            >
              {muted ? 'UNMUTE' : 'MUTE'}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={settings.soundVolume}
            onChange={(e) => onUpdateSettings({ soundVolume: parseFloat(e.target.value) })}
            className="w-full accent-sky-400 bg-slate-700 h-2 rounded-lg cursor-pointer"
          />
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={onResume}
            className="w-full py-3.5 rounded-2xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black uppercase tracking-wider text-sm shadow-lg shadow-sky-500/30 flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Play className="w-5 h-5 fill-slate-950" /> RESUME MISSION
          </button>

          <button
            onClick={onRestart}
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold uppercase tracking-wider text-xs border border-slate-700 flex items-center justify-center gap-2 transition-all"
          >
            <RotateCcw className="w-4 h-4" /> RESTART BATTLE
          </button>
        </div>
      </div>
    </div>
  );
};
