import React, { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RotateCcw,
  Repeat,
  Crosshair,
  Gauge,
  FastForward,
} from 'lucide-react';
import { hudAudio } from '../utils/audioHUD';
import { DetectedHemorrhageStats } from '../types/nifti';

interface CineControlsProps {
  currentSlice: number;
  totalSlices: number;
  onSliceChange: (slice: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  fps: number;
  onFpsChange: (fps: number) => void;
  loopMode: 'loop' | 'bounce';
  onToggleLoopMode: () => void;
  hemorrhageStats?: DetectedHemorrhageStats;
}

export const CineControls: React.FC<CineControlsProps> = ({
  currentSlice,
  totalSlices,
  onSliceChange,
  isPlaying,
  onTogglePlay,
  fps,
  onFpsChange,
  loopMode,
  onToggleLoopMode,
  hemorrhageStats,
}) => {
  const directionRef = useRef<number>(1);

  // Cine loop animation timer
  useEffect(() => {
    if (!isPlaying) return;

    const intervalMs = Math.max(16, Math.round(1000 / fps));
    const timer = setInterval(() => {
      onSliceChange(
        (() => {
          let next = currentSlice + directionRef.current;
          if (loopMode === 'loop') {
            if (next >= totalSlices) next = 0;
            if (next < 0) next = totalSlices - 1;
          } else {
            // Bounce
            if (next >= totalSlices) {
              directionRef.current = -1;
              next = totalSlices - 2;
            } else if (next < 0) {
              directionRef.current = 1;
              next = 1;
            }
          }
          hudAudio.playSliceTick(directionRef.current);
          return Math.max(0, Math.min(totalSlices - 1, next));
        })()
      );
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, currentSlice, totalSlices, fps, loopMode, onSliceChange]);

  const handleStep = (delta: number) => {
    hudAudio.playSliceTick(delta);
    const next = Math.max(0, Math.min(totalSlices - 1, currentSlice + delta));
    onSliceChange(next);
  };

  const handleJumpToPeak = () => {
    if (hemorrhageStats && hemorrhageStats.peakSliceIndex !== undefined) {
      hudAudio.playAlertChirp();
      onSliceChange(hemorrhageStats.peakSliceIndex);
    }
  };

  const peakSlice = hemorrhageStats?.peakSliceIndex ?? -1;

  return (
    <div className="flex flex-col gap-2 p-2.5 bg-black/85 backdrop-blur-md border border-cyan-800/80 rounded select-none text-[#f4f4f0] font-mono">
      {/* Top Header & Telemetry */}
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-cyan-400 tracking-widest uppercase">
            CINE SLICE ANIMATION ENGINE
          </span>
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300">
            {isPlaying ? 'RUNNING' : 'STANDBY'}
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="text-cyan-300 font-bold">
            SLICE {String(currentSlice + 1).padStart(2, '0')} / {String(totalSlices).padStart(2, '0')}
          </span>
          {peakSlice >= 0 && (
            <button
              onClick={handleJumpToPeak}
              className="flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-red-950/80 border border-red-500/80 text-red-400 hover:text-red-200 transition-all hover:bg-red-900/60"
              title="Jump to slice with maximum acute hemorrhage volume"
            >
              <Crosshair className="w-2.5 h-2.5" />
              <span>PEAK BLEED (SL {peakSlice + 1})</span>
            </button>
          )}
        </div>
      </div>

      {/* Slice scrubber timeline with hematoma density ticks */}
      <div className="relative pt-2 pb-1">
        {/* Anomaly heat tick marks */}
        {hemorrhageStats?.sliceVoxelCounts && (
          <div className="absolute top-0 left-0 right-0 h-1.5 flex pointer-events-none">
            {hemorrhageStats.sliceVoxelCounts.map((count, sIdx) => {
              const hasBleed = count > 15;
              const isCurrent = sIdx === currentSlice;
              return (
                <div
                  key={sIdx}
                  className="flex-1 h-full mx-[0.5px] rounded-[1px] transition-all"
                  style={{
                    backgroundColor: isCurrent
                      ? '#22d3ee'
                      : hasBleed
                      ? count > 80
                        ? '#ef4444'
                        : '#f97316'
                      : 'rgba(34, 211, 238, 0.1)',
                    boxShadow: hasBleed && isCurrent ? '0 0 6px #ef4444' : undefined,
                  }}
                  title={`Slice ${sIdx + 1}: ${count} hyperdense voxels`}
                />
              );
            })}
          </div>
        )}

        <input
          type="range"
          min={0}
          max={totalSlices - 1}
          value={currentSlice}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            hudAudio.playSliceTick(val > currentSlice ? 1 : -1);
            onSliceChange(val);
          }}
          className="w-full accent-cyan-400 h-1.5 bg-cyan-950/80 rounded cursor-pointer appearance-none focus:outline-none"
        />
      </div>

      {/* Playback Controls and Speed */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-cyan-900/50">
        {/* Playback Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleStep(-1)}
            className="p-1.5 rounded bg-black/60 border border-cyan-800 hover:border-cyan-500 text-cyan-400 hover:text-cyan-200 text-xs transition-all"
            title="Previous Slice (Step -1)"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              hudAudio.playActionBeep('toggle');
              onTogglePlay();
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded border text-xs font-bold transition-all ${
              isPlaying
                ? 'bg-red-950/80 border-red-500 text-red-300 shadow-[0_0_12px_rgba(239,68,68,0.3)]'
                : 'bg-cyan-950/80 border-cyan-400 text-cyan-300 hover:bg-cyan-900/60 shadow-[0_0_12px_rgba(34,211,238,0.25)]'
            }`}
            title={isPlaying ? 'Pause Cine Animation' : 'Start Continuous Cine Loop'}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-cyan-400" />}
            <span>{isPlaying ? 'PAUSE' : 'CINE PLAY'}</span>
          </button>

          <button
            onClick={() => handleStep(1)}
            className="p-1.5 rounded bg-black/60 border border-cyan-800 hover:border-cyan-500 text-cyan-400 hover:text-cyan-200 text-xs transition-all"
            title="Next Slice (Step +1)"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Loop Mode Toggle */}
          <button
            onClick={() => {
              hudAudio.playActionBeep('toggle');
              onToggleLoopMode();
            }}
            className={`flex items-center gap-1 px-2 py-1.5 rounded border text-[10px] transition-all ${
              loopMode === 'bounce'
                ? 'bg-orange-950/60 border-orange-500 text-orange-300'
                : 'bg-black/60 border-cyan-800 text-cyan-400'
            }`}
            title={`Playback Mode: ${loopMode === 'loop' ? 'Continuous Loop' : 'Ping-Pong / Bounce'}`}
          >
            <Repeat className="w-3 h-3" />
            <span className="uppercase">{loopMode}</span>
          </button>
        </div>

        {/* Speed / FPS Slider */}
        <div className="flex items-center gap-2">
          <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-[10px] text-cyan-400/80">SPEED:</span>
          <input
            type="range"
            min={5}
            max={60}
            step={5}
            value={fps}
            onChange={(e) => onFpsChange(parseInt(e.target.value, 10))}
            className="w-20 accent-cyan-400 h-1 bg-cyan-950 rounded cursor-pointer"
          />
          <span className="text-[10px] text-cyan-300 w-11 text-right">{fps} FPS</span>
        </div>
      </div>
    </div>
  );
};
