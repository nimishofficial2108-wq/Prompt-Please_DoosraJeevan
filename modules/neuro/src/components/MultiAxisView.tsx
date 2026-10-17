import React, { useRef, useEffect, useState } from 'react';
import { SliceViewport } from './SliceViewport';
import { VolumeData, SliceOrientation, WindowPreset } from '../types/nifti';
import { Box, Eye, Move3D, Sliders } from 'lucide-react';
import { hudAudio } from '../utils/audioHUD';

interface MultiAxisViewProps {
  volume: VolumeData;
  axialSlice: number;
  onAxialSliceChange: (s: number) => void;
  coronalSlice: number;
  onCoronalSliceChange: (s: number) => void;
  sagittalSlice: number;
  onSagittalSliceChange: (s: number) => void;
  windowPreset: WindowPreset;
  showHemorrhageOverlay: boolean;
  invertColors: boolean;
  crosshairEnabled: boolean;
  activeViewMode: 'QUAD' | 'AXIAL' | 'CORONAL' | 'SAGITTAL' | '3D';
  onViewModeChange: (mode: 'QUAD' | 'AXIAL' | 'CORONAL' | 'SAGITTAL' | '3D') => void;
}

export const MultiAxisView: React.FC<MultiAxisViewProps> = ({
  volume,
  axialSlice,
  onAxialSliceChange,
  coronalSlice,
  onCoronalSliceChange,
  sagittalSlice,
  onSagittalSliceChange,
  windowPreset,
  showHemorrhageOverlay,
  invertColors,
  crosshairEnabled,
  activeViewMode,
  onViewModeChange,
}) => {
  // 3D Holographic Canvas Ref & Rotation
  const canvas3DRef = useRef<HTMLCanvasElement | null>(null);
  const [rotX, setRotX] = useState<number>(25);
  const [rotY, setRotY] = useState<number>(45);
  const [isRotating3D, setIsRotating3D] = useState<boolean>(false);
  const [rotStart, setRotStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Render 3D Orthogonal Holographic HUD
  useEffect(() => {
    const canvas = canvas3DRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 320);
    const height = (canvas.height = canvas.parentElement?.clientHeight || 280);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Subtle background grid
    ctx.strokeStyle = 'rgba(34, 211, 238, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 24) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 24) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const cx = width / 2;
    const cy = height / 2;
    const scale = Math.min(width, height) * 0.42;

    const radX = (rotX * Math.PI) / 180;
    const radY = (rotY * Math.PI) / 180;

    // 3D Projection helper
    const project = (x: number, y: number, z: number) => {
      // Rotation Y
      const cosY = Math.cos(radY);
      const sinY = Math.sin(radY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      // Rotation X
      const cosX = Math.cos(radX);
      const sinX = Math.sin(radX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      const pScale = scale / (z2 + 2.5);
      return {
        px: cx + x1 * pScale,
        py: cy - y2 * pScale,
      };
    };

    // Bounding Box vertices (-0.5 to +0.5)
    const corners = [
      project(-0.5, -0.5, -0.5),
      project(0.5, -0.5, -0.5),
      project(0.5, 0.5, -0.5),
      project(-0.5, 0.5, -0.5),
      project(-0.5, -0.5, 0.5),
      project(0.5, -0.5, 0.5),
      project(0.5, 0.5, 0.5),
      project(-0.5, 0.5, 0.5),
    ];

    // Draw box edges
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    ctx.strokeStyle = 'rgba(34, 211, 238, 0.4)';
    ctx.lineWidth = 1;
    edges.forEach(([i, j]) => {
      ctx.beginPath();
      ctx.moveTo(corners[i].px, corners[i].py);
      ctx.lineTo(corners[j].px, corners[j].py);
      ctx.stroke();
    });

    // Normalized slice positions (-0.5 to 0.5)
    const normZ = axialSlice / (volume.dimZ - 1) - 0.5;
    const normY = coronalSlice / (volume.dimY - 1) - 0.5;
    const normX = sagittalSlice / (volume.dimX - 1) - 0.5;

    // 1. AXIAL CUT PLANE (Cyan, Z constant)
    const axPts = [
      project(-0.5, -0.5, normZ),
      project(0.5, -0.5, normZ),
      project(0.5, 0.5, normZ),
      project(-0.5, 0.5, normZ),
    ];
    ctx.fillStyle = 'rgba(34, 211, 238, 0.22)';
    ctx.strokeStyle = '#22d3ee';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(axPts[0].px, axPts[0].py);
    axPts.forEach((p) => ctx.lineTo(p.px, p.py));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 2. CORONAL CUT PLANE (Orange, Y constant)
    const corPts = [
      project(-0.5, normY, -0.5),
      project(0.5, normY, -0.5),
      project(0.5, normY, 0.5),
      project(-0.5, normY, 0.5),
    ];
    ctx.fillStyle = 'rgba(249, 115, 22, 0.22)';
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(corPts[0].px, corPts[0].py);
    corPts.forEach((p) => ctx.lineTo(p.px, p.py));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // 3. SAGITTAL CUT PLANE (Magenta/Red, X constant)
    const sagPts = [
      project(normX, -0.5, -0.5),
      project(normX, 0.5, -0.5),
      project(normX, 0.5, 0.5),
      project(normX, -0.5, 0.5),
    ];
    ctx.fillStyle = 'rgba(239, 68, 68, 0.22)';
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(sagPts[0].px, sagPts[0].py);
    sagPts.forEach((p) => ctx.lineTo(p.px, p.py));
    ctx.closePath();
    ctx.stroke();
    ctx.fill();

    // Draw central intersection cursor
    const interPt = project(normX, normY, normZ);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(interPt.px, interPt.py, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }, [volume, axialSlice, coronalSlice, sagittalSlice, rotX, rotY]);

  // Synchronize crosshair click across planes
  const handleCrosshairClick = (coords: { x: number; y: number; z: number }) => {
    onSagittalSliceChange(coords.x);
    onCoronalSliceChange(coords.y);
    onAxialSliceChange(coords.z);
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-black text-[#f4f4f0] font-mono">
      {/* View Switcher Tabs & Axis Sliders Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 py-1.5 bg-black/80 border-b border-cyan-900/60 text-xs">
        {/* View Mode Buttons */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-cyan-400/80 mr-1 hidden sm:inline">VIEWPORT:</span>
          {(['QUAD', 'AXIAL', 'CORONAL', 'SAGITTAL', '3D'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => {
                hudAudio.playActionBeep('select');
                onViewModeChange(mode);
              }}
              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wider transition-all ${
                activeViewMode === mode
                  ? 'bg-cyan-950 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                  : 'bg-black/60 border border-cyan-900/80 text-[#f4f4f0]/60 hover:text-cyan-300 hover:border-cyan-700'
              }`}
            >
              {mode === 'QUAD' ? '4-AXIS QUAD' : mode}
            </button>
          ))}
        </div>

        {/* Orthogonal Axis Coordinate Sliders */}
        <div className="flex items-center gap-3 text-[10px] pt-1 sm:pt-0">
          {/* Axial Z */}
          <div className="flex items-center gap-1.5 text-cyan-300">
            <span className="text-cyan-400 font-bold">Z:</span>
            <input
              type="range"
              min={0}
              max={volume.dimZ - 1}
              value={axialSlice}
              onChange={(e) => onAxialSliceChange(parseInt(e.target.value, 10))}
              className="w-16 h-1 accent-cyan-400 bg-cyan-950 rounded cursor-pointer"
            />
            <span className="w-5 text-right">{axialSlice + 1}</span>
          </div>

          {/* Coronal Y */}
          <div className="flex items-center gap-1.5 text-orange-300">
            <span className="text-orange-400 font-bold">Y:</span>
            <input
              type="range"
              min={0}
              max={volume.dimY - 1}
              value={coronalSlice}
              onChange={(e) => onCoronalSliceChange(parseInt(e.target.value, 10))}
              className="w-16 h-1 accent-orange-400 bg-orange-950 rounded cursor-pointer"
            />
            <span className="w-5 text-right">{coronalSlice + 1}</span>
          </div>

          {/* Sagittal X */}
          <div className="flex items-center gap-1.5 text-red-300">
            <span className="text-red-400 font-bold">X:</span>
            <input
              type="range"
              min={0}
              max={volume.dimX - 1}
              value={sagittalSlice}
              onChange={(e) => onSagittalSliceChange(parseInt(e.target.value, 10))}
              className="w-16 h-1 accent-red-400 bg-red-950 rounded cursor-pointer"
            />
            <span className="w-5 text-right">{sagittalSlice + 1}</span>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 min-h-0 relative p-1">
        {activeViewMode === 'QUAD' && (
          <div className="grid grid-cols-1 md:grid-cols-2 grid-rows-2 h-full gap-1">
            {/* Top-Left: Axial */}
            <div className="relative border border-cyan-800/80 rounded overflow-hidden">
              <SliceViewport
                volume={volume}
                orientation="AXIAL"
                sliceIdx={axialSlice}
                windowPreset={windowPreset}
                showHemorrhageOverlay={showHemorrhageOverlay}
                invertColors={invertColors}
                crosshairEnabled={crosshairEnabled}
                onSliceClick={handleCrosshairClick}
                onToggleMaximize={() => onViewModeChange('AXIAL')}
                title="AXIAL [TRANSVERSE]"
                badge={`SL ${axialSlice + 1}/${volume.dimZ}`}
              />
            </div>

            {/* Top-Right: Coronal */}
            <div className="relative border border-orange-800/80 rounded overflow-hidden">
              <SliceViewport
                volume={volume}
                orientation="CORONAL"
                sliceIdx={coronalSlice}
                windowPreset={windowPreset}
                showHemorrhageOverlay={showHemorrhageOverlay}
                invertColors={invertColors}
                crosshairEnabled={crosshairEnabled}
                onSliceClick={handleCrosshairClick}
                onToggleMaximize={() => onViewModeChange('CORONAL')}
                title="CORONAL [FRONTAL]"
                badge={`SL ${coronalSlice + 1}/${volume.dimY}`}
              />
            </div>

            {/* Bottom-Left: Sagittal */}
            <div className="relative border border-red-800/80 rounded overflow-hidden">
              <SliceViewport
                volume={volume}
                orientation="SAGITTAL"
                sliceIdx={sagittalSlice}
                windowPreset={windowPreset}
                showHemorrhageOverlay={showHemorrhageOverlay}
                invertColors={invertColors}
                crosshairEnabled={crosshairEnabled}
                onSliceClick={handleCrosshairClick}
                onToggleMaximize={() => onViewModeChange('SAGITTAL')}
                title="SAGITTAL [MEDIAN]"
                badge={`SL ${sagittalSlice + 1}/${volume.dimX}`}
              />
            </div>

            {/* Bottom-Right: 3D Holographic HUD projection */}
            <div
              className="relative border border-cyan-900/80 rounded overflow-hidden flex flex-col bg-black cursor-grab active:cursor-grabbing"
              onMouseDown={(e) => {
                setIsRotating3D(true);
                setRotStart({ x: e.clientX, y: e.clientY });
              }}
              onMouseMove={(e) => {
                if (!isRotating3D) return;
                const dx = e.clientX - rotStart.x;
                const dy = e.clientY - rotStart.y;
                setRotY((y) => y + dx * 0.7);
                setRotX((x) => Math.max(-80, Math.min(80, x + dy * 0.7)));
                setRotStart({ x: e.clientX, y: e.clientY });
              }}
              onMouseUp={() => setIsRotating3D(false)}
              onMouseLeave={() => setIsRotating3D(false)}
            >
              {/* Header */}
              <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between pointer-events-none">
                <div className="flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded border border-cyan-800 font-mono text-[10px] text-cyan-400">
                  <Move3D className="w-3.5 h-3.5 text-cyan-400" />
                  <span>3D MULTI-PLANAR PROJECTION</span>
                </div>
                <div className="text-[9px] font-mono text-[#f4f4f0]/60 bg-black/80 px-2 py-0.5 rounded border border-cyan-950">
                  DRAG TO ROTATE 3D HUD
                </div>
              </div>

              <canvas ref={canvas3DRef} className="w-full h-full" />

              {/* 3D Legend */}
              <div className="absolute bottom-2 left-2 right-2 z-10 flex items-center justify-center gap-4 bg-black/80 py-1 rounded border border-cyan-950 text-[9px] font-mono">
                <span className="flex items-center gap-1 text-cyan-400">
                  <span className="w-2 h-2 rounded-full bg-cyan-400" /> AXIAL (Z)
                </span>
                <span className="flex items-center gap-1 text-orange-400">
                  <span className="w-2 h-2 rounded-full bg-orange-400" /> CORONAL (Y)
                </span>
                <span className="flex items-center gap-1 text-red-400">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> SAGITTAL (X)
                </span>
              </div>
            </div>
          </div>
        )}

        {activeViewMode === 'AXIAL' && (
          <div className="w-full h-full border border-cyan-800 rounded overflow-hidden">
            <SliceViewport
              volume={volume}
              orientation="AXIAL"
              sliceIdx={axialSlice}
              windowPreset={windowPreset}
              showHemorrhageOverlay={showHemorrhageOverlay}
              invertColors={invertColors}
              crosshairEnabled={crosshairEnabled}
              onSliceClick={handleCrosshairClick}
              isMaximized={true}
              onToggleMaximize={() => onViewModeChange('QUAD')}
              title="AXIAL [TRANSVERSE PLANE] - FULLSCREEN"
              badge={`SL ${axialSlice + 1}/${volume.dimZ}`}
            />
          </div>
        )}

        {activeViewMode === 'CORONAL' && (
          <div className="w-full h-full border border-orange-800 rounded overflow-hidden">
            <SliceViewport
              volume={volume}
              orientation="CORONAL"
              sliceIdx={coronalSlice}
              windowPreset={windowPreset}
              showHemorrhageOverlay={showHemorrhageOverlay}
              invertColors={invertColors}
              crosshairEnabled={crosshairEnabled}
              onSliceClick={handleCrosshairClick}
              isMaximized={true}
              onToggleMaximize={() => onViewModeChange('QUAD')}
              title="CORONAL [FRONTAL PLANE] - FULLSCREEN"
              badge={`SL ${coronalSlice + 1}/${volume.dimY}`}
            />
          </div>
        )}

        {activeViewMode === 'SAGITTAL' && (
          <div className="w-full h-full border border-red-800 rounded overflow-hidden">
            <SliceViewport
              volume={volume}
              orientation="SAGITTAL"
              sliceIdx={sagittalSlice}
              windowPreset={windowPreset}
              showHemorrhageOverlay={showHemorrhageOverlay}
              invertColors={invertColors}
              crosshairEnabled={crosshairEnabled}
              onSliceClick={handleCrosshairClick}
              isMaximized={true}
              onToggleMaximize={() => onViewModeChange('QUAD')}
              title="SAGITTAL [MEDIAN PLANE] - FULLSCREEN"
              badge={`SL ${sagittalSlice + 1}/${volume.dimX}`}
            />
          </div>
        )}

        {activeViewMode === '3D' && (
          <div
            className="w-full h-full border border-cyan-700 rounded overflow-hidden flex flex-col bg-black cursor-grab active:cursor-grabbing relative"
            onMouseDown={(e) => {
              setIsRotating3D(true);
              setRotStart({ x: e.clientX, y: e.clientY });
            }}
            onMouseMove={(e) => {
              if (!isRotating3D) return;
              const dx = e.clientX - rotStart.x;
              const dy = e.clientY - rotStart.y;
              setRotY((y) => y + dx * 0.7);
              setRotX((x) => Math.max(-80, Math.min(80, x + dy * 0.7)));
              setRotStart({ x: e.clientX, y: e.clientY });
            }}
            onMouseUp={() => setIsRotating3D(false)}
            onMouseLeave={() => setIsRotating3D(false)}
          >
            <div className="absolute top-3 left-3 right-3 z-10 flex items-center justify-between pointer-events-none">
              <div className="flex items-center gap-2 bg-black/80 px-2.5 py-1.5 rounded border border-cyan-600 font-mono text-xs text-cyan-300">
                <Move3D className="w-4 h-4 text-cyan-400" />
                <span>3D VOLUMETRIC HOLOGRAPHIC WORKSTATION</span>
              </div>
              <button
                onClick={() => onViewModeChange('QUAD')}
                className="pointer-events-auto px-2 py-1 rounded bg-black/80 border border-cyan-800 hover:border-cyan-400 text-cyan-300 text-xs"
              >
                RETURN TO QUAD
              </button>
            </div>
            <canvas ref={canvas3DRef} className="w-full h-full" />
          </div>
        )}
      </div>
    </div>
  );
};
