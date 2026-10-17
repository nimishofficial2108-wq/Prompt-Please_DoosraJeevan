import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  Sliders,
  Crosshair,
  Flame,
  AlertTriangle,
  Layers,
  Sparkles,
  Search,
} from 'lucide-react';
import {
  VolumeData,
  SliceOrientation,
  WindowPreset,
  AlertSpot,
  PatientRecord,
} from '../types/nifti';
import {
  getSliceDimensions,
  renderSliceToImageData,
  getVoxelHU,
  classifyHUTissue,
} from '../utils/sliceRenderer';
import { hudAudio } from '../utils/audioHUD';

interface FourScreenViewportProps {
  patient: PatientRecord;
  axialSlice: number;
  onAxialSliceChange: (s: number) => void;
  coronalSlice: number;
  onCoronalSliceChange: (s: number) => void;
  sagittalSlice: number;
  onSagittalSliceChange: (s: number) => void;
  windowPreset: WindowPreset;
  showHemorrhageOverlay: boolean;
  onToggleHemorrhageOverlay: () => void;
  maximizedScreen: 'NONE' | 'AXIAL' | 'CORONAL' | 'SAGITTAL' | 'CLOSEUP';
  onSetMaximizedScreen: (screen: 'NONE' | 'AXIAL' | 'CORONAL' | 'SAGITTAL' | 'CLOSEUP') => void;
}

export const FourScreenViewport: React.FC<FourScreenViewportProps> = ({
  patient,
  axialSlice,
  onAxialSliceChange,
  coronalSlice,
  onCoronalSliceChange,
  sagittalSlice,
  onSagittalSliceChange,
  windowPreset,
  showHemorrhageOverlay,
  onToggleHemorrhageOverlay,
  maximizedScreen,
  onSetMaximizedScreen,
}) => {
  const { volume } = patient;

  return (
    <div className="flex-1 w-full h-full min-h-0 bg-black grid grid-cols-1 md:grid-cols-2 grid-rows-2 gap-[2px] p-[2px] select-none font-mono overflow-hidden">
      {/* SCREEN 1: AXIAL (TRANSVERSE) - PRIMARY SCREEN (Top-Left) */}
      {(maximizedScreen === 'NONE' || maximizedScreen === 'AXIAL') && (
        <div
          className={`relative border border-cyan-800/80 bg-black overflow-hidden flex flex-col ${
            maximizedScreen === 'AXIAL' ? 'col-span-2 row-span-2' : ''
          }`}
        >
          <SingleViewport
            volume={volume}
            orientation="AXIAL"
            sliceIdx={axialSlice}
            onSliceChange={onAxialSliceChange}
            windowPreset={windowPreset}
            showHemorrhageOverlay={showHemorrhageOverlay}
            title="AXIAL [TRANSVERSE] - PRIMARY"
            badge={`Z: ${axialSlice + 1}/${volume.dimZ}`}
            accentColor="#22d3ee"
            alertSpots={patient.alertSpots.filter((s) => Math.abs(s.sliceZ - axialSlice) <= 1)}
            isMaximized={maximizedScreen === 'AXIAL'}
            onToggleMaximize={() =>
              onSetMaximizedScreen(maximizedScreen === 'AXIAL' ? 'NONE' : 'AXIAL')
            }
          />
        </div>
      )}

      {/* SCREEN 2: CORONAL (FRONTAL) (Top-Right) */}
      {(maximizedScreen === 'NONE' || maximizedScreen === 'CORONAL') && (
        <div
          className={`relative border border-cyan-800/80 bg-black overflow-hidden flex flex-col ${
            maximizedScreen === 'CORONAL' ? 'col-span-2 row-span-2' : ''
          }`}
        >
          <SingleViewport
            volume={volume}
            orientation="CORONAL"
            sliceIdx={coronalSlice}
            onSliceChange={onCoronalSliceChange}
            windowPreset={windowPreset}
            showHemorrhageOverlay={showHemorrhageOverlay}
            title="CORONAL [FRONTAL]"
            badge={`Y: ${coronalSlice + 1}/${volume.dimY}`}
            accentColor="#38bdf8"
            isMaximized={maximizedScreen === 'CORONAL'}
            onToggleMaximize={() =>
              onSetMaximizedScreen(maximizedScreen === 'CORONAL' ? 'NONE' : 'CORONAL')
            }
          />
        </div>
      )}

      {/* SCREEN 3: SAGITTAL (LATERAL / MEDIAN) (Bottom-Left) */}
      {(maximizedScreen === 'NONE' || maximizedScreen === 'SAGITTAL') && (
        <div
          className={`relative border border-cyan-800/80 bg-black overflow-hidden flex flex-col ${
            maximizedScreen === 'SAGITTAL' ? 'col-span-2 row-span-2' : ''
          }`}
        >
          <SingleViewport
            volume={volume}
            orientation="SAGITTAL"
            sliceIdx={sagittalSlice}
            onSliceChange={onSagittalSliceChange}
            windowPreset={windowPreset}
            showHemorrhageOverlay={showHemorrhageOverlay}
            title="SAGITTAL [LATERAL]"
            badge={`X: ${sagittalSlice + 1}/${volume.dimX}`}
            accentColor="#06b6d4"
            isMaximized={maximizedScreen === 'SAGITTAL'}
            onToggleMaximize={() =>
              onSetMaximizedScreen(maximizedScreen === 'SAGITTAL' ? 'NONE' : 'SAGITTAL')
            }
          />
        </div>
      )}

      {/* SCREEN 4: ACUTE ICH CLOSE-UP / LESION MAGNIFIER (Bottom-Right) */}
      {(maximizedScreen === 'NONE' || maximizedScreen === 'CLOSEUP') && (
        <div
          className={`relative border border-red-800/80 bg-black overflow-hidden flex flex-col ${
            maximizedScreen === 'CLOSEUP' ? 'col-span-2 row-span-2' : ''
          }`}
        >
          <LesionCloseupViewport
            volume={volume}
            patient={patient}
            axialSlice={axialSlice}
            windowPreset={windowPreset}
            isMaximized={maximizedScreen === 'CLOSEUP'}
            onToggleMaximize={() =>
              onSetMaximizedScreen(maximizedScreen === 'CLOSEUP' ? 'NONE' : 'CLOSEUP')
            }
            showHemorrhageOverlay={showHemorrhageOverlay}
            onToggleHemorrhageOverlay={onToggleHemorrhageOverlay}
          />
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// Individual Single Viewport Component with Zoom, Pan, Probe, Slider
// -------------------------------------------------------------
interface SingleViewportProps {
  volume: VolumeData;
  orientation: SliceOrientation;
  sliceIdx: number;
  onSliceChange: (s: number) => void;
  windowPreset: WindowPreset;
  showHemorrhageOverlay: boolean;
  title: string;
  badge: string;
  accentColor: string;
  alertSpots?: AlertSpot[];
  isMaximized: boolean;
  onToggleMaximize: () => void;
}

const SingleViewport: React.FC<SingleViewportProps> = ({
  volume,
  orientation,
  sliceIdx,
  onSliceChange,
  windowPreset,
  showHemorrhageOverlay,
  title,
  badge,
  accentColor,
  alertSpots = [],
  isMaximized,
  onToggleMaximize,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [zoom, setZoom] = useState(1.0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [hoverVoxel, setHoverVoxel] = useState<{
    x: number;
    y: number;
    z: number;
    hu: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  const sliceDim = getSliceDimensions(volume, orientation);

  // Render slice onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = sliceDim.width;
    canvas.height = sliceDim.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = renderSliceToImageData(
      volume,
      orientation,
      sliceIdx,
      windowPreset,
      showHemorrhageOverlay,
      false
    );

    ctx.putImageData(imgData, 0, 0);
  }, [volume, orientation, sliceIdx, windowPreset, showHemorrhageOverlay, sliceDim]);

  // Zoom & Pan handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((z) => Math.max(0.6, Math.min(6.0, z * factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
      return;
    }

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    if (
      clientX >= rect.left &&
      clientX <= rect.right &&
      clientY >= rect.top &&
      clientY <= rect.bottom
    ) {
      const normX = (clientX - rect.left) / rect.width;
      const normY = (clientY - rect.top) / rect.height;

      const px = Math.floor(normX * sliceDim.width);
      const py = Math.floor(normY * sliceDim.height);

      let vx = px,
        vy = py,
        vz = sliceIdx;
      if (orientation === 'CORONAL') {
        vy = sliceIdx;
        vz = volume.dimZ - 1 - py;
      } else if (orientation === 'SAGITTAL') {
        vx = sliceIdx;
        vy = px;
        vz = volume.dimZ - 1 - py;
      }

      const hu = getVoxelHU(volume, vx, vy, vz);
      setHoverVoxel({
        x: vx,
        y: vy,
        z: vz,
        hu,
        screenX: clientX - container.getBoundingClientRect().left,
        screenY: clientY - container.getBoundingClientRect().top,
      });
    } else {
      setHoverVoxel(null);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const resetView = () => {
    hudAudio.playActionBeep('select');
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const tissue = hoverVoxel ? classifyHUTissue(hoverVoxel.hu) : null;

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        setIsDragging(false);
        setHoverVoxel(null);
      }}
      className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden group"
    >
      {/* Minimal Top Header */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/85 px-2.5 py-1 rounded border border-cyan-800/80 backdrop-blur-sm pointer-events-auto">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: accentColor, boxShadow: `0 0 8px ${accentColor}` }}
          />
          <span className="text-xs font-bold tracking-wider" style={{ color: accentColor }}>
            {title}
          </span>
          <span className="text-[10px] text-cyan-300 font-bold px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-800">
            {badge}
          </span>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 bg-black/85 px-2 py-1 rounded border border-cyan-900 pointer-events-auto">
          <button
            onClick={() => setZoom((z) => Math.min(6.0, z + 0.3))}
            className="p-1 text-cyan-400 hover:text-white"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.3))}
            className="p-1 text-cyan-400 hover:text-white"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={resetView} className="p-1 text-cyan-400 hover:text-white" title="Reset Zoom">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onToggleMaximize}
            className="p-1 text-cyan-400 hover:text-white"
            title={isMaximized ? 'Restore 4-Screen View' : 'Maximize this Viewport'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas with Transform */}
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          cursor: isDragging ? 'grabbing' : 'grab',
        }}
        className="relative flex items-center justify-center transition-transform duration-75"
      >
        <canvas
          ref={canvasRef}
          className="image-render-pixelated shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-cyan-950"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* AUTHENTIC CLINICAL RED DOTS & ALERT SPOTS ON HEMORRHAGE SLICES */}
        {orientation === 'AXIAL' && alertSpots.length > 0 && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox={`0 0 ${sliceDim.width} ${sliceDim.height}`}
          >
            {alertSpots.map((spot) => {
              const isExact = spot.sliceZ === sliceIdx;
              return (
                <g key={spot.id}>
                  {/* Subtle pulsing red medical target ring */}
                  <circle
                    cx={spot.voxelX}
                    cy={spot.voxelY}
                    r={isExact ? 5 : 3.5}
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="0.8"
                    strokeDasharray={isExact ? '1,1' : 'none'}
                    className={isExact ? 'animate-pulse' : ''}
                  />
                  {/* Solid pinpoint red center dot */}
                  <circle
                    cx={spot.voxelX}
                    cy={spot.voxelY}
                    r={isExact ? 1.8 : 1.2}
                    fill="#ef4444"
                  />
                  {/* Real clinical crosshair ticks */}
                  {isExact && (
                    <>
                      <line
                        x1={spot.voxelX - 6}
                        y1={spot.voxelY}
                        x2={spot.voxelX - 3}
                        y2={spot.voxelY}
                        stroke="#ef4444"
                        strokeWidth="0.6"
                      />
                      <line
                        x1={spot.voxelX + 3}
                        y1={spot.voxelY}
                        x2={spot.voxelX + 6}
                        y2={spot.voxelY}
                        stroke="#ef4444"
                        strokeWidth="0.6"
                      />
                      <line
                        x1={spot.voxelX}
                        y1={spot.voxelY - 6}
                        x2={spot.voxelX}
                        y2={spot.voxelY - 3}
                        stroke="#ef4444"
                        strokeWidth="0.6"
                      />
                      <line
                        x1={spot.voxelX}
                        y1={spot.voxelY + 3}
                        x2={spot.voxelX}
                        y2={spot.voxelY + 6}
                        stroke="#ef4444"
                        strokeWidth="0.6"
                      />
                      {/* Authentic medical HUD alert text tag */}
                      <text
                        x={spot.voxelX + 7}
                        y={spot.voxelY - 2}
                        fill="#ef4444"
                        fontSize="4"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {spot.label}
                      </text>
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        )}
      </div>

      {/* Movement Simulation Slider on Bottom Edge of each Viewport */}
      <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center gap-3 bg-black/85 px-3 py-1.5 rounded border border-cyan-900/80 backdrop-blur-sm">
        <span className="text-[10px] font-bold text-cyan-400">
          {orientation === 'AXIAL' ? 'Z-AXIS' : orientation === 'CORONAL' ? 'Y-AXIS' : 'X-AXIS'}
        </span>
        <input
          type="range"
          min={0}
          max={sliceDim.maxIndex}
          value={sliceIdx}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            hudAudio.playSliceTick(val > sliceIdx ? 1 : -1);
            onSliceChange(val);
          }}
          className="flex-1 h-1.5 accent-cyan-400 bg-cyan-950 rounded cursor-pointer"
        />
        <span className="text-[10px] text-cyan-300 w-12 text-right">
          {sliceIdx + 1} / {sliceDim.maxIndex + 1}
        </span>
      </div>

      {/* Hover Voxel HU Telemetry Tooltip */}
      {hoverVoxel && tissue && (
        <div
          className="absolute z-30 pointer-events-none bg-black/90 border border-cyan-400 p-1.5 rounded font-mono text-[9px] shadow-[0_0_15px_rgba(34,211,238,0.4)]"
          style={{
            left: Math.min(window.innerWidth - 180, hoverVoxel.screenX + 16),
            top: Math.max(10, hoverVoxel.screenY - 30),
          }}
        >
          <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
            <span>HU: {hoverVoxel.hu >= 0 ? `+${hoverVoxel.hu}` : hoverVoxel.hu}</span>
            <span className="px-1 rounded text-[8px]" style={{ color: tissue.color }}>
              [{tissue.badge}]
            </span>
          </div>
          <div className="text-[8px] text-[#f4f4f0]/70 mt-0.5">{tissue.label}</div>
        </div>
      )}
    </div>
  );
};

// -------------------------------------------------------------
// SCREEN 4: ACUTE ICH LESION CLOSE-UP / MAGNIFIER VIEWPORT
// -------------------------------------------------------------
interface LesionCloseupProps {
  volume: VolumeData;
  patient: PatientRecord;
  axialSlice: number;
  windowPreset: WindowPreset;
  isMaximized: boolean;
  onToggleMaximize: () => void;
  showHemorrhageOverlay: boolean;
  onToggleHemorrhageOverlay: () => void;
}

const LesionCloseupViewport: React.FC<LesionCloseupProps> = ({
  volume,
  patient,
  axialSlice,
  windowPreset,
  isMaximized,
  onToggleMaximize,
  showHemorrhageOverlay,
  onToggleHemorrhageOverlay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'MAGNIFIER' | 'MIP'>('MAGNIFIER');

  const sliceDim = getSliceDimensions(volume, 'AXIAL');
  const isBleed = patient.hemorrhageDetected;

  // Render close-up or MIP
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = sliceDim.width;
    canvas.height = sliceDim.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (viewMode === 'MAGNIFIER') {
      const imgData = renderSliceToImageData(
        volume,
        'AXIAL',
        axialSlice,
        windowPreset,
        true, // always high-contrast ICH alert
        false
      );
      ctx.putImageData(imgData, 0, 0);
    } else {
      // Axial Maximum Intensity Projection (MIP)
      const mipData = ctx.createImageData(volume.dimX, volume.dimY);
      const data = mipData.data;

      for (let y = 0; y < volume.dimY; y++) {
        for (let x = 0; x < volume.dimX; x++) {
          let maxHu = -1000;
          for (let z = 0; z < volume.dimZ; z++) {
            const hu = getVoxelHU(volume, x, y, z);
            if (hu > maxHu) maxHu = hu;
          }

          const idx = (y * volume.dimX + x) * 4;
          if (maxHu >= 50 && maxHu <= 95) {
            // Hyperdense acute clot highlighted in Alert Coral Red
            data[idx] = 239;
            data[idx + 1] = 68;
            data[idx + 2] = 68;
            data[idx + 3] = 255;
          } else if (maxHu > 150) {
            // Calvarial skull bone
            data[idx] = 200;
            data[idx + 1] = 200;
            data[idx + 2] = 200;
            data[idx + 3] = 255;
          } else {
            const norm = Math.max(0, Math.min(255, ((maxHu - 0) / 80) * 255));
            data[idx] = norm * 0.4;
            data[idx + 1] = norm * 0.6;
            data[idx + 2] = norm * 0.7;
            data[idx + 3] = 255;
          }
        }
      }
      ctx.putImageData(mipData, 0, 0);
    }
  }, [volume, axialSlice, windowPreset, viewMode, sliceDim]);

  return (
    <div className="relative flex-1 w-full h-full flex items-center justify-center bg-black overflow-hidden">
      {/* Header Bar */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-2 bg-black/85 px-2.5 py-1 rounded border border-red-500/80 backdrop-blur-sm pointer-events-auto">
          <Flame className="w-3.5 h-3.5 text-red-400 animate-pulse" />
          <span className="text-xs font-bold text-red-400 tracking-wider">
            {viewMode === 'MAGNIFIER' ? 'ACUTE ICH FOCUS // 2.5X MAGNIFIED' : 'AXIAL MIP [MAX INTENSITY]'}
          </span>
          <span className="text-[10px] text-red-300 font-bold px-1.5 py-0.5 rounded bg-red-950 border border-red-800">
            {isBleed ? `${patient.primarySubtype}` : 'NO BLEED'}
          </span>
        </div>

        {/* View Mode toggle & Maximize */}
        <div className="flex items-center gap-1.5 bg-black/85 px-2 py-1 rounded border border-red-900 pointer-events-auto">
          <button
            onClick={() => setViewMode(viewMode === 'MAGNIFIER' ? 'MIP' : 'MAGNIFIER')}
            className="px-2 py-0.5 rounded bg-red-950/80 border border-red-700 text-red-300 text-[10px] font-bold hover:border-red-400"
          >
            {viewMode === 'MAGNIFIER' ? 'SWITCH TO MIP' : 'SWITCH TO FOCUS'}
          </button>
          <button
            onClick={onToggleMaximize}
            className="p-1 text-red-400 hover:text-white"
            title={isMaximized ? 'Restore 4-Screen View' : 'Maximize'}
          >
            {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Magnified Canvas */}
      <div
        style={{
          transform: viewMode === 'MAGNIFIER' ? 'scale(2.2)' : 'scale(1.0)',
          transformOrigin: '65% 48%', // Centers on typical acute lesion focus
        }}
        className="relative flex items-center justify-center transition-transform duration-200"
      >
        <canvas
          ref={canvasRef}
          className="image-render-pixelated shadow-[0_0_30px_rgba(239,68,68,0.3)] border border-red-950"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Natural Medical Alert Spots overlaid directly on lesion */}
        {viewMode === 'MAGNIFIER' && (
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            viewBox={`0 0 ${sliceDim.width} ${sliceDim.height}`}
          >
            {patient.alertSpots.map((spot) => (
              <g key={spot.id}>
                {/* Red focal dot */}
                <circle cx={spot.voxelX} cy={spot.voxelY} r="2" fill="#ef4444" className="animate-ping" />
                <circle cx={spot.voxelX} cy={spot.voxelY} r="1.5" fill="#ef4444" />
                <circle cx={spot.voxelX} cy={spot.voxelY} r="6" fill="none" stroke="#ef4444" strokeWidth="0.6" strokeDasharray="1,1" />
                <text
                  x={spot.voxelX + 8}
                  y={spot.voxelY}
                  fill="#ef4444"
                  fontSize="3.5"
                  fontFamily="monospace"
                  fontWeight="bold"
                >
                  {spot.label}
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Clinical Telemetry Bar at Bottom */}
      <div className="absolute bottom-2 left-3 right-3 z-20 flex items-center justify-between bg-black/85 px-3 py-1.5 rounded border border-red-900/80 backdrop-blur-sm text-[10px]">
        <div className="flex items-center gap-3">
          <span className="text-red-400 font-bold">EST. VOLUME:</span>
          <span className="text-red-300 font-bold">{patient.volumeMl.toFixed(1)} mL</span>
          <span className="text-red-400/50">|</span>
          <span className="text-orange-400 font-bold">MIDLINE SHIFT:</span>
          <span className="text-orange-300 font-bold">{patient.midlineShiftMm} mm</span>
        </div>
        <div className="text-cyan-400 font-bold">
          {isBleed ? 'CAD ALERT: POSITIVE ICH FINDING' : 'CAD ALERT: UNREMARKABLE'}
        </div>
      </div>
    </div>
  );
};
