import React, { useRef, useEffect, useMemo, useState } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sliders,
  Flame,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Crosshair,
  Waves,
  Activity,
  Sparkles,
  Radio,
} from 'lucide-react';
import { VolumeData, WindowPreset, PatientRecord } from '../types/nifti';
import {
  getSliceDimensions,
  renderSliceToImageData,
  getVoxelHU,
  classifyHUTissue,
} from '../utils/sliceRenderer';
import { hudAudio, StethoscopeTelemetry } from '../utils/audioHUD';

interface TwoPanelWorkstationProps {
  patient: PatientRecord;
  axialSlice: number;
  onAxialSliceChange: (s: number) => void;
  windowPreset: WindowPreset;
  showHemorrhageOverlay: boolean;
  onToggleHemorrhageOverlay: () => void;
  stethoscopeTelemetry: StethoscopeTelemetry | null;
  onOpenBioStaging?: () => void;
}

export const TwoPanelWorkstation: React.FC<TwoPanelWorkstationProps> = ({
  patient,
  axialSlice,
  onAxialSliceChange,
  windowPreset,
  showHemorrhageOverlay,
  onToggleHemorrhageOverlay,
  stethoscopeTelemetry,
  onOpenBioStaging,
}) => {
  const { volume } = patient;

  return (
    <div className="dj-neuro-panel-grid flex-1 w-full h-full min-h-0 bg-[#F6FAFD] grid grid-cols-1 lg:grid-cols-2 gap-3 p-3 select-none">
      {/* ------------------------------------------------------------- */}
      {/* PANEL 1: AXIAL (FULL BRAIN NON-CONTRAST CT VIEWPORT) */}
      {/* ------------------------------------------------------------- */}
      <div className="dj-neuro-panel border border-[#071B55]/10 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-w-0 min-h-0">
        <AxialFullScanner
          volume={volume}
          patient={patient}
          axialSlice={axialSlice}
          onAxialSliceChange={onAxialSliceChange}
          windowPreset={windowPreset}
          showHemorrhageOverlay={showHemorrhageOverlay}
          stethoscopeTelemetry={stethoscopeTelemetry}
          onOpenBioStaging={onOpenBioStaging}
        />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* PANEL 2: TRANSVERSE 2.5X IPH HEMATOMA FOCUS */}
      {/* ------------------------------------------------------------- */}
      <div className="dj-neuro-panel dj-neuro-focus border border-[#071B55]/10 bg-white rounded-2xl shadow-sm overflow-hidden flex flex-col h-full min-w-0 min-h-0">
        <TransverseIPHFocus
          volume={volume}
          patient={patient}
          axialSlice={axialSlice}
          onAxialSliceChange={onAxialSliceChange}
          windowPreset={windowPreset}
          showHemorrhageOverlay={showHemorrhageOverlay}
          stethoscopeTelemetry={stethoscopeTelemetry}
          onOpenBioStaging={onOpenBioStaging}
        />
      </div>
    </div>
  );
};

// =============================================================
// ROBUST, HIGH-CONTRAST BOLD HOVER TELEMETRY HUD BOX
// =============================================================
interface HoverProbeBoxProps {
  hu: number;
  voxelX: number;
  voxelY: number;
  voxelZ: number;
  screenX: number;
  screenY: number;
  containerWidth?: number;
  containerHeight?: number;
  stethoscopeTelemetry: StethoscopeTelemetry | null;
}

const HoverProbeBox: React.FC<HoverProbeBoxProps> = ({
  hu,
  voxelX,
  voxelY,
  voxelZ,
  screenX,
  screenY,
  containerWidth = 600,
  containerHeight = 500,
  stethoscopeTelemetry,
}) => {
  const tissue = classifyHUTissue(hu);
  const isClot = hu >= 50 && hu <= 90;

  // Box dimensions for comfortable reading & no awkward wrapping
  const boxWidth = Math.min(310, Math.max(180, containerWidth - 24));
  const boxHeight = isClot ? 176 : 142;

  // Intelligently flip to left of cursor if near right boundary
  const placeLeft = screenX + boxWidth + 24 > containerWidth;
  const left = placeLeft
    ? Math.max(12, screenX - boxWidth - 18)
    : Math.min(containerWidth - boxWidth - 12, screenX + 18);

  // Clamped top position so it never slips off top or bottom
  const top = Math.max(
    12,
    Math.min(containerHeight - boxHeight - 14, screenY - boxHeight / 2)
  );

  return (
    <div
      className={`absolute z-50 pointer-events-none p-4 rounded-2xl font-sans backdrop-blur-xl transition-all duration-75 shadow-2xl border-2 ${
        isClot
          ? 'bg-white/98 border-[#FF554B] shadow-[0_12px_40px_rgba(255,85,75,0.2)] text-[#071B55]'
          : 'bg-white/98 border-[#071B55]/20 shadow-[0_12px_40px_rgba(7,27,85,0.15)] text-[#071B55]'
      }`}
      style={{
        left,
        top,
        width: `${boxWidth}px`,
      }}
    >
      {/* TOP ROW: BOLD MASSIVE HU VALUE & CLINICAL STATUS BADGE */}
      <div
        className={`flex items-center justify-between gap-3 border-b pb-2.5 ${
          isClot ? 'border-[#FF554B]/20' : 'border-[#071B55]/10'
        }`}
      >
        <div className="flex items-baseline gap-2">
          <span
            className={`text-xs font-bold tracking-wider uppercase ${
              isClot ? 'text-[#FF554B]' : 'text-[#071B55]/70'
            }`}
          >
            DENSITY
          </span>
          <span
            className={`text-3xl font-bold tracking-tight font-mono-num ${
              isClot ? 'text-[#FF554B]' : 'text-[#071B55]'
            }`}
          >
            {hu >= 0 ? `+${hu}` : hu}
          </span>
          <span className="text-xs font-semibold text-[#071B55]/60">HU</span>
        </div>

        <span
          className={`text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-xs ${
            isClot
              ? 'bg-[#FFF1EB] text-[#FF554B] border border-[#FF554B]/30'
              : 'bg-[#EAF5FF] text-[#071B55] border border-[#071B55]/15'
          }`}
        >
          {tissue.badge}
        </span>
      </div>

      {/* MIDDLE ROW: TISSUE CLASSIFICATION & VOXEL COORDINATES */}
      <div className="pt-2.5 flex items-center justify-between gap-2">
        <span
          className={`text-sm font-semibold tracking-wide ${
            isClot ? 'text-[#FF554B]' : 'text-[#071B55]'
          }`}
        >
          {tissue.label}
        </span>
        <div className="flex items-center gap-1 text-xs font-mono-num px-2 py-0.5 rounded-lg bg-[#EAF5FF] border border-[#071B55]/10 text-[#071B55] shrink-0 font-medium">
          <span className="text-[10px] text-[#071B55]/60">VOX</span>
          <span>X:{voxelX} Y:{voxelY} Z:{voxelZ + 1}</span>
        </div>
      </div>

      {/* BOTTOM ROW: VASCULAR SONIFICATION ACOUSTIC TELEMETRY */}
      <div
        className={`mt-2.5 pt-2 border-t flex items-center justify-between gap-2 text-xs font-medium ${
          isClot
            ? 'border-[#FF554B]/20 text-[#FF554B]'
            : 'border-[#071B55]/10 text-[#071B55]'
        }`}
      >
        <div className="flex items-center gap-1.5 truncate">
          <Waves
            className={`w-4 h-4 shrink-0 ${
              isClot ? 'text-[#FF554B] animate-pulse' : 'text-[#071B55]'
            }`}
          />
          <span className="truncate font-semibold tracking-wide">
            {isClot
              ? 'TURBULENT CLOT BRUIT'
              : hu < -200
              ? 'AIR / VOID'
              : 'LAMINAR VASCULAR HUM'}
          </span>
        </div>

        {stethoscopeTelemetry && stethoscopeTelemetry.active && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#EAF5FF] border border-[#071B55]/15 text-[#071B55] font-mono-num shrink-0 shadow-xs">
            {stethoscopeTelemetry.freq} Hz
          </span>
        )}
      </div>

      {/* EXTRAVASATION SIGNATURE ROW */}
      {isClot && (
        <div className="mt-2 pt-1.5 border-t border-[#FF554B]/20 flex items-center justify-between text-[10px]">
          <span className="text-[#FF554B] font-bold flex items-center gap-1">
            <Flame className="w-3 h-3 text-[#FF554B]" />
            Active Extravasation Focus
          </span>
          <span className="text-[#071B55] font-semibold">Bio-Staging Calibrated</span>
        </div>
      )}
    </div>
  );
};

// =============================================================
// PANEL 1: AXIAL FULL SCANNER WITH AUDIO-SPATIAL STETHOSCOPE PROBE
// =============================================================
interface AxialFullScannerProps {
  volume: VolumeData;
  patient: PatientRecord;
  axialSlice: number;
  onAxialSliceChange: (s: number) => void;
  windowPreset: WindowPreset;
  showHemorrhageOverlay: boolean;
  stethoscopeTelemetry: StethoscopeTelemetry | null;
  onOpenBioStaging?: () => void;
}

const AxialFullScanner: React.FC<AxialFullScannerProps> = ({
  volume,
  patient,
  axialSlice,
  onAxialSliceChange,
  windowPreset,
  showHemorrhageOverlay,
  stethoscopeTelemetry,
  onOpenBioStaging,
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
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

  const sliceDim = useMemo(() => getSliceDimensions(volume, 'AXIAL'), [volume]);

  // Redraw slice onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = sliceDim.width;
    canvas.height = sliceDim.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = renderSliceToImageData(
      volume,
      'AXIAL',
      axialSlice,
      windowPreset,
      showHemorrhageOverlay,
      false
    );
    ctx.putImageData(imgData, 0, 0);
  }, [volume, axialSlice, windowPreset, showHemorrhageOverlay, sliceDim]);

  // Handle probe glide with Audio-Spatial Stethoscope sonification
  const handleMouseMove = (e: React.MouseEvent) => {
    hudAudio.initCtx(); // ensure audio context is active
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

      const hu = getVoxelHU(volume, px, py, axialSlice);

      const contRect = container.getBoundingClientRect();
      setHoverVoxel({
        x: px,
        y: py,
        z: axialSlice,
        hu,
        screenX: clientX - contRect.left,
        screenY: clientY - contRect.top,
        containerWidth: contRect.width,
        containerHeight: contRect.height,
      });

      // VASCULAR SONIFICATION: Gliding probe across brain tissue
      const normPan = (normX - 0.5) * 2;
      hudAudio.updateStethoscopeProbe(hu, normPan);
    } else {
      setHoverVoxel(null);
      hudAudio.muteStethoscopeProbe();
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverVoxel(null);
    hudAudio.muteStethoscopeProbe();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((z) => Math.max(0.6, Math.min(5.0, z * factor)));
  };

  const resetView = () => {
    hudAudio.playActionBeep('select');
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const isClotProbed = hoverVoxel && hoverVoxel.hu >= 50 && hoverVoxel.hu <= 90;
  const currentAlerts = patient.alertSpots.filter((s) => s.sliceZ === axialSlice);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={(e) => {
        hudAudio.initCtx();
        if (e.button === 0 && !(e.target as HTMLElement).closest('button, input, select')) {
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={handleMouseLeave}
      className="dj-neuro-scanner relative flex-1 min-h-0 min-w-0 flex flex-col bg-[#070B12] overflow-hidden group cursor-crosshair"
    >
      {/* Top Header Bar */}
      <div className="dj-neuro-panel-toolbar relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="dj-neuro-panel-title flex items-center flex-wrap gap-2 bg-white px-2.5 py-1 rounded-lg text-[#071B55] pointer-events-auto">
          <span className="w-2.5 h-2.5 rounded-full bg-[#071B55]" />
          <span className="text-xs font-bold text-[#071B55] tracking-tight">
            Panel 1: Axial Scanner (Full Brain)
          </span>
          <span className="text-[10px] text-[#071B55] font-mono-num font-bold px-2 py-0.5 rounded-lg bg-[#EAF5FF] border border-[#071B55]/10">
            Slice {axialSlice + 1} / {volume.dimZ}
          </span>
        </div>

        {/* Zoom, Bio-Staging & Reset Toolbar */}
        <div className="flex items-center gap-1.5 pointer-events-auto">
          <div className="dj-neuro-zoom flex items-center gap-1 bg-[#F0F6FF] px-2 py-1 rounded-xl text-[#071B55] backdrop-blur-md">
            <button
              onClick={() => setZoom((z) => Math.min(5.0, z + 0.25))}
              className="p-1.5 rounded-lg hover:bg-[#EAF5FF] text-[#071B55] transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
              className="p-1.5 rounded-lg hover:bg-[#EAF5FF] text-[#071B55] transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={resetView}
              className="p-1.5 rounded-lg hover:bg-[#EAF5FF] text-[#071B55] transition-colors"
              title="Reset Zoom & Pan"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="dj-neuro-image-stage">
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          cursor: isDragging ? 'grabbing' : 'crosshair',
        }}
        className="dj-neuro-image-layer relative flex items-center justify-center transition-transform duration-75"
      >
        <canvas
          ref={canvasRef}
          className="image-render-pixelated shadow-[0_0_30px_rgba(0,0,0,0.9)] border border-cyan-950"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* SUBTLE CLINICAL ANNOTATIONS (REDUCED REDNESS, AUTHENTIC HAIRLINE CAD) */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 ${sliceDim.width} ${sliceDim.height}`}
        >
          {currentAlerts.map((spot) => (
            <g key={spot.id}>
              <circle
                cx={spot.voxelX}
                cy={spot.voxelY}
                r={4}
                fill="none"
                stroke="#dc2626"
                strokeWidth="0.6"
                strokeDasharray="1.5,1.5"
                opacity="0.8"
              />
              <circle cx={spot.voxelX} cy={spot.voxelY} r={1.2} fill="#dc2626" opacity="0.9" />
              <text
                x={spot.voxelX + 6}
                y={spot.voxelY - 1}
                fill="#fca5a5"
                fontSize="3.2"
                fontFamily="monospace"
                fontWeight="600"
                opacity="0.9"
              >
                {spot.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      </div>

      {/* Stethoscope Status Notification Pill */}
      <div className="dj-neuro-sound-status relative z-20 pointer-events-none bg-[#122238] px-3 py-1.5 font-mono text-[10px] flex items-center gap-2">
        <Waves className={`w-4 h-4 ${isClotProbed ? 'text-red-400 animate-pulse' : 'text-cyan-400'}`} />
        <span className={isClotProbed ? 'text-red-400 font-black tracking-wider' : 'text-cyan-300 font-bold'}>
          {isClotProbed
            ? '⚠ AUDIO STETHOSCOPE: TURBULENT CLOT BRUIT DETECTED'
            : 'AUDIO STETHOSCOPE: GLIDING ACROSS VASCULAR BED'}
        </span>
      </div>

      {/* Z-Axis Slice Simulation Slider */}
      <div className="dj-neuro-bottom relative z-20 flex items-center gap-3 bg-[#101B2C] px-3 py-2">
        <span className="text-[10px] font-bold text-cyan-400">AXIAL Z:</span>
        <input
          type="range"
          min={0}
          max={volume.dimZ - 1}
          value={axialSlice}
          onChange={(e) => {
            const val = parseInt(e.target.value, 10);
            hudAudio.playSliceTick(val > axialSlice ? 1 : -1);
            onAxialSliceChange(val);
          }}
          className="flex-1 h-1.5 accent-cyan-400 bg-cyan-950 rounded cursor-pointer"
        />
        <span className="text-[10px] text-cyan-300 w-12 text-right">
          {axialSlice + 1} / {volume.dimZ}
        </span>
      </div>

      {/* PROMINENT, BOLD, LARGE HOVER INSPECTION BOX */}
      {hoverVoxel && (
        <HoverProbeBox
          hu={hoverVoxel.hu}
          voxelX={hoverVoxel.x}
          voxelY={hoverVoxel.y}
          voxelZ={hoverVoxel.z}
          screenX={hoverVoxel.screenX}
          screenY={hoverVoxel.screenY}
          containerWidth={hoverVoxel.containerWidth}
          containerHeight={hoverVoxel.containerHeight}
          stethoscopeTelemetry={stethoscopeTelemetry}
        />
      )}
    </div>
  );
};

// =============================================================
// PANEL 2: TRANSVERSE 2.5X IPH HEMATOMA FOCUS
// =============================================================
interface TransverseIPHFocusProps {
  volume: VolumeData;
  patient: PatientRecord;
  axialSlice: number;
  onAxialSliceChange: (s: number) => void;
  windowPreset: WindowPreset;
  showHemorrhageOverlay: boolean;
  stethoscopeTelemetry: StethoscopeTelemetry | null;
  onOpenBioStaging?: () => void;
}

const TransverseIPHFocus: React.FC<TransverseIPHFocusProps> = ({
  volume,
  patient,
  axialSlice,
  onAxialSliceChange,
  windowPreset,
  showHemorrhageOverlay,
  stethoscopeTelemetry,
  onOpenBioStaging,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [fineZoom, setFineZoom] = useState(1.35); // Start in context; zoom in for a closer look
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [hoverVoxel, setHoverVoxel] = useState<{
    x: number;
    y: number;
    hu: number;
    screenX: number;
    screenY: number;
    containerWidth: number;
    containerHeight: number;
  } | null>(null);

  const sliceDim = useMemo(() => getSliceDimensions(volume, 'AXIAL'), [volume]);
  const isBleed = patient.hemorrhageDetected;

  // Primary clot center coordinates
  const peakSpot = patient.alertSpots[0];
  const centerX = peakSpot ? peakSpot.voxelX : Math.floor(volume.dimX * 0.65);
  const centerY = peakSpot ? peakSpot.voxelY : Math.floor(volume.dimY * 0.48);

  const originXPercent = (centerX / volume.dimX) * 100;
  const originYPercent = (centerY / volume.dimY) * 100;

  // Render high-resolution transverse slice
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = sliceDim.width;
    canvas.height = sliceDim.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgData = renderSliceToImageData(
      volume,
      'AXIAL',
      axialSlice,
      windowPreset,
      showHemorrhageOverlay,
      false
    );
    ctx.putImageData(imgData, 0, 0);
  }, [volume, axialSlice, windowPreset, showHemorrhageOverlay, sliceDim]);

  const handleMouseMove = (e: React.MouseEvent) => {
    hudAudio.initCtx(); // ensure audio is playing
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

      const hu = getVoxelHU(volume, px, py, axialSlice);

      const contRect = container.getBoundingClientRect();
      setHoverVoxel({
        x: px,
        y: py,
        hu,
        screenX: clientX - contRect.left,
        screenY: clientY - contRect.top,
        containerWidth: contRect.width,
        containerHeight: contRect.height,
      });

      // Audio-Spatial Stethoscope modulation
      const normPan = (normX - 0.5) * 2;
      hudAudio.updateStethoscopeProbe(hu, normPan);
    } else {
      setHoverVoxel(null);
      hudAudio.muteStethoscopeProbe();
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setHoverVoxel(null);
    hudAudio.muteStethoscopeProbe();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setFineZoom((z) => Math.max(1.0, Math.min(4.0, z * factor)));
  };

  const resetFocus = () => {
    hudAudio.playActionBeep('select');
    setFineZoom(1.35);
    setPan({ x: 0, y: 0 });
  };

  const currentAlerts = patient.alertSpots.filter((s) => s.sliceZ === axialSlice);

  return (
    <div
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={(e) => {
        hudAudio.initCtx();
        if (e.button === 0 && !(e.target as HTMLElement).closest('button, input, select')) {
          setIsDragging(true);
          setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={handleMouseLeave}
      className="dj-neuro-scanner relative flex-1 min-h-0 min-w-0 flex flex-col bg-[#070B12] overflow-hidden group cursor-crosshair"
    >
      {/* Top Header Bar */}
      <div className="dj-neuro-panel-toolbar relative z-20 flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="dj-neuro-panel-title flex items-center flex-wrap gap-2 bg-white px-2.5 py-1 rounded-lg text-[#071B55] pointer-events-auto">
          <Flame className="w-3.5 h-3.5 text-[#FF554B] animate-pulse" />
          <span className="text-xs font-bold text-[#071B55] tracking-tight">
            Panel 2: Detailed brain view
          </span>
          <span className="text-[10px] text-[#FF554B] font-bold px-2 py-0.5 rounded-lg bg-[#FFF1EB] border border-[#FF554B]/30">
            {isBleed ? `${patient.primarySubtype}` : 'No Acute Bleed'}
          </span>
        </div>

        {/* Zoom & Reset Toolbar */}
        <div className="dj-neuro-zoom flex items-center gap-1 bg-[#F0F6FF] px-2 py-1 rounded-xl pointer-events-auto text-[#071B55] backdrop-blur-md">
          <span className="text-[10px] text-[#071B55] font-bold font-mono-num px-2 py-0.5 rounded-lg bg-[#EAF5FF]">
            {fineZoom.toFixed(1)}x Focus
          </span>
          <button
            onClick={() => setFineZoom((z) => Math.min(4.0, z + 0.2))}
            className="p-1.5 rounded-lg hover:bg-[#EAF5FF] text-[#071B55] transition-colors"
            title="Increase Focus Zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setFineZoom((z) => Math.max(1.0, z - 0.2))}
            className="p-1.5 rounded-lg hover:bg-[#EAF5FF] text-[#071B55] transition-colors"
            title="Decrease Focus Zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetFocus}
            className="p-1.5 rounded-lg hover:bg-[#EAF5FF] text-[#071B55] transition-colors"
            title="Reset focus zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Adjustable detail view. Starts at 1.35x so the scan remains visible. */}
      <div className="dj-neuro-image-stage">
      <div
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${fineZoom})`,
          transformOrigin: `${originXPercent}% ${originYPercent}%`,
          cursor: isDragging ? 'grabbing' : 'crosshair',
        }}
        className="dj-neuro-image-layer relative flex items-center justify-center transition-transform duration-75"
      >
        <canvas
          ref={canvasRef}
          className="image-render-pixelated shadow-[0_0_35px_rgba(0,0,0,0.9)] border border-cyan-950"
          style={{ imageRendering: 'pixelated' }}
        />

        {/* Natural subtle CAD contour around acute clot core */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 ${sliceDim.width} ${sliceDim.height}`}
        >
          {currentAlerts.map((spot) => (
            <g key={spot.id}>
              <circle
                cx={spot.voxelX}
                cy={spot.voxelY}
                r={5.5}
                fill="none"
                stroke="#dc2626"
                strokeWidth="0.5"
                strokeDasharray="1,1"
                opacity="0.85"
              />
              <circle cx={spot.voxelX} cy={spot.voxelY} r={1.2} fill="#dc2626" opacity="0.9" />
              <text
                x={spot.voxelX + 7}
                y={spot.voxelY}
                fill="#fca5a5"
                fontSize="2.8"
                fontFamily="monospace"
                fontWeight="600"
                opacity="0.9"
              >
                {spot.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      </div>

      {/* Clinical Telemetry Bar at Bottom with Direct Bio-Staging Rechaining */}
      <div className="dj-neuro-metrics relative z-20 flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 border-t border-[#071B55]/10 text-xs text-[#071B55]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-[10px] uppercase tracking-wider text-[#071B55]/70">Hematoma Vol:</span>
            <span className="font-mono-num text-[#071B55]">{isBleed ? patient.volumeMl.toFixed(1) : '0.0'} mL</span>
          </div>
          <span className="text-[#071B55]/20">|</span>
          <div className="flex items-center gap-1.5 font-bold">
            <span className="text-[10px] uppercase tracking-wider text-[#071B55]/70">Midline Shift:</span>
            <span className={`font-mono-num ${patient.midlineShiftMm > 4 ? 'text-[#FF554B]' : 'text-[#071B55]'}`}>
              {isBleed ? patient.midlineShiftMm.toFixed(1) : '0.0'} mm
            </span>
          </div>
          <span className="text-[#071B55]/20 hidden sm:inline">|</span>
          <span className="text-[11px] font-semibold text-emerald-700 hidden sm:inline">
            {isBleed ? 'Illustrative finding — not verified' : 'Normal synthetic example'}
          </span>
        </div>

        {onOpenBioStaging && (
          <button
            onClick={onOpenBioStaging}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FF554B] hover:bg-[#ff3e33] text-white rounded-xl font-bold text-[11px] shadow-sm hover:shadow-md transition-all pointer-events-auto cursor-pointer"
            title="Launch Quantitative Neurovascular Bio-Staging Matrix"
          >
            <Activity className="w-3.5 h-3.5 text-white" />
            <span>Launch Bio-Staging Matrix</span>
          </button>
        )}
      </div>

      {/* PROMINENT, BOLD, LARGE HOVER INSPECTION BOX ALSO IN PANEL 2! */}
      {hoverVoxel && (
        <HoverProbeBox
          hu={hoverVoxel.hu}
          voxelX={hoverVoxel.x}
          voxelY={hoverVoxel.y}
          voxelZ={axialSlice}
          screenX={hoverVoxel.screenX}
          screenY={hoverVoxel.screenY}
          containerWidth={hoverVoxel.containerWidth}
          containerHeight={hoverVoxel.containerHeight}
          stethoscopeTelemetry={stethoscopeTelemetry}
        />
      )}
    </div>
  );
};
