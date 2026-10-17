import React from 'react';
import {
  SunMedium,
  Contrast,
  Flame,
  Crosshair,
  SlidersHorizontal,
  EyeOff,
  Eye,
} from 'lucide-react';
import { WindowPreset } from '../types/nifti';
import { WINDOW_PRESETS } from '../utils/presetScans';
import { hudAudio } from '../utils/audioHUD';

interface WindowLevelControlsProps {
  currentPreset: WindowPreset;
  onSelectPreset: (preset: WindowPreset) => void;
  onCustomChange: (width: number, level: number) => void;
  showHemorrhageOverlay: boolean;
  onToggleHemorrhageOverlay: () => void;
  crosshairEnabled: boolean;
  onToggleCrosshair: () => void;
  invertColors: boolean;
  onToggleInvertColors: () => void;
}

export const WindowLevelControls: React.FC<WindowLevelControlsProps> = ({
  currentPreset,
  onSelectPreset,
  onCustomChange,
  showHemorrhageOverlay,
  onToggleHemorrhageOverlay,
  crosshairEnabled,
  onToggleCrosshair,
  invertColors,
  onToggleInvertColors,
}) => {
  return (
    <div className="flex flex-col gap-2 p-2.5 bg-black/85 backdrop-blur-md border border-cyan-800/80 rounded select-none text-[#f4f4f0] font-mono">
      {/* Header */}
      <div className="flex items-center justify-between text-xs pb-1 border-b border-cyan-900/60">
        <div className="flex items-center gap-1.5 text-cyan-400">
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="text-[10px] tracking-widest uppercase">WINDOW / LEVEL & OVERLAYS</span>
        </div>
        <span className="text-[10px] text-cyan-300">
          W: {currentPreset.width} HU | L: {currentPreset.level} HU
        </span>
      </div>

      {/* Preset Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
        {WINDOW_PRESETS.filter((p) => p.id !== 'custom').map((p) => {
          const isSelected = currentPreset.id === p.id;
          return (
            <button
              key={p.id}
              onClick={() => {
                hudAudio.playActionBeep('select');
                onSelectPreset(p);
              }}
              className={`flex flex-col items-start px-2 py-1.5 rounded border text-left transition-all ${
                isSelected
                  ? 'bg-cyan-950/90 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.25)]'
                  : 'bg-black/60 border-cyan-900 text-[#f4f4f0]/70 hover:border-cyan-700 hover:text-cyan-200'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-[10px] font-bold tracking-tight">{p.name.split(' ')[0]}</span>
                <span className="text-[8px] text-cyan-400/80">{p.badge}</span>
              </div>
              <span className="text-[9px] text-cyan-500/90 font-mono">
                {p.width}/{p.level}
              </span>
            </button>
          );
        })}
      </div>

      {/* Manual W/L Sliders */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {/* Window Width */}
        <div className="flex items-center gap-2">
          <Contrast className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-cyan-400/80 w-12">WIDTH:</span>
          <input
            type="range"
            min={20}
            max={2500}
            value={currentPreset.width}
            onChange={(e) => onCustomChange(parseInt(e.target.value, 10), currentPreset.level)}
            className="flex-1 h-1 accent-cyan-400 bg-cyan-950 rounded cursor-pointer"
          />
          <span className="text-[10px] text-cyan-300 w-10 text-right">{currentPreset.width}</span>
        </div>

        {/* Window Level (Center) */}
        <div className="flex items-center gap-2">
          <SunMedium className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-cyan-400/80 w-12">LEVEL:</span>
          <input
            type="range"
            min={-100}
            max={1000}
            value={currentPreset.level}
            onChange={(e) => onCustomChange(currentPreset.width, parseInt(e.target.value, 10))}
            className="flex-1 h-1 accent-cyan-400 bg-cyan-950 rounded cursor-pointer"
          />
          <span className="text-[10px] text-cyan-300 w-10 text-right">{currentPreset.level}</span>
        </div>
      </div>

      {/* Feature Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-cyan-900/50">
        {/* Hemorrhage Heatmap Overlay Toggle */}
        <button
          onClick={() => {
            hudAudio.playActionBeep('toggle');
            onToggleHemorrhageOverlay();
          }}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs transition-all ${
            showHemorrhageOverlay
              ? 'bg-red-950/80 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.3)]'
              : 'bg-black/60 border-cyan-900 text-[#f4f4f0]/60 hover:text-cyan-300'
          }`}
          title="Highlight acute hyperdense hematoma voxels (HU 54-88) in Alert Coral/Red"
        >
          <Flame className={`w-3.5 h-3.5 ${showHemorrhageOverlay ? 'text-red-400 animate-pulse' : ''}`} />
          <span className="text-[10px] font-bold">
            {showHemorrhageOverlay ? 'ICH OVERLAY: ACTIVE' : 'ICH OVERLAY: OFF'}
          </span>
        </button>

        {/* Crosshair Toggle */}
        <button
          onClick={() => {
            hudAudio.playActionBeep('toggle');
            onToggleCrosshair();
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] transition-all ${
            crosshairEnabled
              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
              : 'bg-black/60 border-cyan-900 text-[#f4f4f0]/60'
          }`}
        >
          <Crosshair className="w-3 h-3 text-cyan-400" />
          <span>CROSSHAIR: {crosshairEnabled ? 'ON' : 'OFF'}</span>
        </button>

        {/* Invert Grayscale Toggle */}
        <button
          onClick={() => {
            hudAudio.playActionBeep('toggle');
            onToggleInvertColors();
          }}
          className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[10px] transition-all ${
            invertColors
              ? 'bg-cyan-950/80 border-cyan-400 text-cyan-300'
              : 'bg-black/60 border-cyan-900 text-[#f4f4f0]/60'
          }`}
        >
          {invertColors ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          <span>INVERT HU: {invertColors ? 'ON' : 'OFF'}</span>
        </button>
      </div>
    </div>
  );
};
