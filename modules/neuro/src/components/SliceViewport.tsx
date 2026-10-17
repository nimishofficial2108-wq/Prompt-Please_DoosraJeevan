import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Ruler,
  Crosshair,
  Layers,
  Flame,
  Maximize2,
  Minimize2,
  CheckCircle,
} from 'lucide-react';
import {
  VolumeData,
  SliceOrientation,
  WindowPreset,
  CaliperMeasurement,
} from '../types/nifti';
import {
  getSliceDimensions,
  renderSliceToImageData,
  getVoxelHU,
  classifyHUTissue,
} from '../utils/sliceRenderer';
import { hudAudio } from '../utils/audioHUD';

interface SliceViewportProps {
  volume: VolumeData;
  orientation: SliceOrientation;
  sliceIdx: number;
  windowPreset: WindowPreset;
  showHemorrhageOverlay: boolean;
  invertColors: boolean;
  crosshairEnabled: boolean;
  onSliceClick?: (coords: { x: number; y: number; z: number }) => void;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  title?: string;
  badge?: string;
}

export const SliceViewport: React.FC<SliceViewportProps> = ({
  volume,
  orientation,
  sliceIdx,
  windowPreset,
  showHemorrhageOverlay,
  invertColors,
  crosshairEnabled,
  onSliceClick,
  isMaximized = false,
  onToggleMaximize,
  title,
  badge,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Probe inspector state
  const [hoverVoxel, setHoverVoxel] = useState<{
    x: number;
    y: number;
    z: number;
    hu: number;
    screenX: number;
    screenY: number;
  } | null>(null);

  // Caliper ruler measurement tool
  const [caliperActive, setCaliperActive] = useState<boolean>(false);
  const [calipers, setCalipers] = useState<CaliperMeasurement[]>([]);
  const [activeMeasurementStart, setActiveMeasurementStart] = useState<{ x: number; y: number } | null>(null);

  // Slice metadata
  const sliceDim = getSliceDimensions(volume, orientation);

  // Redraw canvas on slice/window/overlay changes
  const renderCanvas = useCallback(() => {
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
      invertColors
    );

    ctx.putImageData(imgData, 0, 0);
  }, [volume, orientation, sliceIdx, windowPreset, showHemorrhageOverlay, invertColors, sliceDim]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Handle Pan & Zoom interactions
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.12 : 0.89;
    setZoom((prev) => Math.max(0.6, Math.min(6.0, prev * factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !caliperActive) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
      return;
    }

    // Voxel coordinate detection under cursor
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

      let vx = 0;
      let vy = 0;
      let vz = 0;

      if (orientation === 'AXIAL') {
        vx = px;
        vy = py;
        vz = sliceIdx;
      } else if (orientation === 'CORONAL') {
        vx = px;
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Caliper measurement handling
  const handleViewportClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    const px = Math.floor(normX * sliceDim.width);
    const py = Math.floor(normY * sliceDim.height);

    if (caliperActive) {
      if (!activeMeasurementStart) {
        hudAudio.playActionBeep('select');
        setActiveMeasurementStart({ x: px, y: py });
      } else {
        hudAudio.playActionBeep('scan');
        const [dx, dy, dz] = volume.pixelSpacing;
        const distMm = Math.sqrt(
          Math.pow((px - activeMeasurementStart.x) * dx, 2) +
          Math.pow((py - activeMeasurementStart.y) * dy, 2)
        );

        setCalipers((prev) => [
          ...prev,
          {
            id: `caliper-${Date.now()}`,
            start: activeMeasurementStart,
            end: { x: px, y: py },
            distanceMm: Math.round(distMm * 10) / 10,
          },
        ]);
        setActiveMeasurementStart(null);
      }
      return;
    }

    // Crosshair synchronize across axes
    if (onSliceClick && hoverVoxel) {
      onSliceClick({ x: hoverVoxel.x, y: hoverVoxel.y, z: hoverVoxel.z });
    }
  };

  const resetView = () => {
    hudAudio.playActionBeep('select');
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
    setCalipers([]);
    setActiveMeasurementStart(null);
  };

  const tissue = hoverVoxel ? classifyHUTissue(hoverVoxel.hu) : null;

  // Anatomical orientation tags
  let topTag = 'A (ANTERIOR)';
  let bottomTag = 'P (POSTERIOR)';
  let leftTag = 'R (DEXTER)';
  let rightTag = 'L (SINISTER)';

  if (orientation === 'CORONAL') {
    topTag = 'S (CRANIAL / VERTEX)';
    bottomTag = 'I (CAUDAL / BASE)';
    leftTag = 'R (DEXTER)';
    rightTag = 'L (SINISTER)';
  } else if (orientation === 'SAGITTAL') {
    topTag = 'S (CRANIAL / VERTEX)';
    bottomTag = 'I (CAUDAL / BASE)';
    leftTag = 'A (ANTERIOR)';
    rightTag = 'P (POSTERIOR)';
  }

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
      className={`relative flex flex-col items-center justify-center bg-black overflow-hidden border border-cyan-900/60 select-none group transition-all ${
        isMaximized ? 'w-full h-full' : 'w-full h-full min-h-[300px]'
      }`}
    >
      {/* Viewport HUD Header Bar */}
      <div className="absolute top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none">
        <div className="flex items-center gap-1.5 bg-black/80 px-2 py-1 rounded border border-cyan-800/80 backdrop-blur-sm pointer-events-auto">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-[10px] font-mono font-bold text-cyan-400 tracking-wider">
            {title || orientation}
          </span>
          {badge && (
            <span className="text-[9px] px-1 rounded bg-cyan-950 text-cyan-300 font-mono border border-cyan-800">
              {badge}
            </span>
          )}
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-1 pointer-events-auto bg-black/80 px-1.5 py-1 rounded border border-cyan-900 backdrop-blur-sm">
          {/* Zoom controls */}
          <button
            onClick={() => setZoom((z) => Math.min(6.0, z + 0.25))}
            className="p-1 rounded hover:bg-cyan-950 text-cyan-400 text-xs"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
            className="p-1 rounded hover:bg-cyan-950 text-cyan-400 text-xs"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1 rounded hover:bg-cyan-950 text-cyan-400/80 text-xs"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Caliper tool toggle */}
          <button
            onClick={() => {
              hudAudio.playActionBeep('toggle');
              setCaliperActive(!caliperActive);
              setActiveMeasurementStart(null);
            }}
            className={`p-1 rounded text-xs transition-all ${
              caliperActive
                ? 'bg-amber-950 border border-amber-500 text-amber-300'
                : 'hover:bg-cyan-950 text-cyan-400'
            }`}
            title="Caliper Ruler Tool: Click 2 points on slice to measure distance in mm"
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>

          {/* Maximize viewport toggle */}
          {onToggleMaximize && (
            <button
              onClick={onToggleMaximize}
              className="p-1 rounded hover:bg-cyan-950 text-cyan-400 text-xs"
              title={isMaximized ? 'Restore Viewport' : 'Maximize Viewport'}
            >
              {isMaximized ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Anatomical Orientation Markers */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 text-[9px] font-mono tracking-widest text-cyan-400/70 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
        {topTag}
      </div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-[9px] font-mono tracking-widest text-cyan-400/70 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
        {bottomTag}
      </div>
      <div className="absolute left-2 top-1/2 -translate-y-1/2 z-10 text-[9px] font-mono tracking-widest text-cyan-400/70 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
        {leftTag}
      </div>
      <div className="absolute right-2 top-1/2 -translate-y-1/2 z-10 text-[9px] font-mono tracking-widest text-cyan-400/70 bg-black/60 px-1.5 py-0.5 rounded pointer-events-none">
        {rightTag}
      </div>

      {/* Main Canvas with Transform Pan & Zoom */}
      <div
        onClick={handleViewportClick}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          cursor: caliperActive ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
        }}
        className="relative transition-transform duration-75 flex items-center justify-center origin-center"
      >
        <canvas
          ref={canvasRef}
          className="image-render-pixelated shadow-[0_0_20px_rgba(0,0,0,0.8)] border border-cyan-950"
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            imageRendering: 'pixelated',
          }}
        />

        {/* Caliper Overlay SVG */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
          viewBox={`0 0 ${sliceDim.width} ${sliceDim.height}`}
        >
          {calipers.map((cal) => (
            <g key={cal.id}>
              <line
                x1={cal.start.x}
                y1={cal.start.y}
                x2={cal.end.x}
                y2={cal.end.y}
                stroke="#eab308"
                strokeWidth="1.5"
                strokeDasharray="2,2"
              />
              <circle cx={cal.start.x} cy={cal.start.y} r="2.5" fill="#eab308" />
              <circle cx={cal.end.x} cy={cal.end.y} r="2.5" fill="#eab308" />
              <text
                x={(cal.start.x + cal.end.x) / 2 + 4}
                y={(cal.start.y + cal.end.y) / 2 - 4}
                fill="#fde047"
                fontSize="6"
                fontFamily="monospace"
                fontWeight="bold"
              >
                {cal.distanceMm} mm
              </text>
            </g>
          ))}
          {activeMeasurementStart && (
            <circle
              cx={activeMeasurementStart.x}
              cy={activeMeasurementStart.y}
              r="3"
              fill="#ef4444"
              className="animate-ping"
            />
          )}
        </svg>

        {/* Crosshair Overlay */}
        {crosshairEnabled && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-cyan-400/20 border-r border-dashed border-cyan-400/30" />
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-cyan-400/20 border-b border-dashed border-cyan-400/30" />
          </div>
        )}
      </div>

      {/* Cyber HUD Corner Telemetry Overlays */}
      <div className="absolute bottom-2 left-2 z-20 pointer-events-none bg-black/80 px-2 py-1 rounded border border-cyan-900/80 font-mono text-[9px] text-[#f4f4f0]/80">
        <div>
          <span className="text-cyan-400">POS: </span>
          {orientation} SLICE {sliceIdx + 1}/{sliceDim.maxIndex + 1}
        </div>
        <div>
          <span className="text-cyan-400">ZOOM: </span>
          {(zoom * 100).toFixed(0)}%
        </div>
      </div>

      <div className="absolute bottom-2 right-2 z-20 pointer-events-none bg-black/80 px-2 py-1 rounded border border-cyan-900/80 font-mono text-[9px] text-right text-[#f4f4f0]/80">
        <div>
          <span className="text-cyan-400">WINDOW: </span>
          W:{windowPreset.width} L:{windowPreset.level}
        </div>
        <div>
          <span className="text-cyan-400">SPACING: </span>
          {volume.pixelSpacing[0].toFixed(1)}×{volume.pixelSpacing[1].toFixed(1)}×
          {volume.pixelSpacing[2].toFixed(1)} mm
        </div>
      </div>

      {/* Hover Voxel Probe Tooltip */}
      {hoverVoxel && tissue && (
        <div
          className="absolute z-30 pointer-events-none bg-black/90 border border-cyan-400/80 p-1.5 rounded shadow-[0_0_15px_rgba(34,211,238,0.3)] font-mono text-[9px] min-w-[140px]"
          style={{
            left: Math.min(window.innerWidth - 180, hoverVoxel.screenX + 16),
            top: Math.max(10, hoverVoxel.screenY - 30),
          }}
        >
          <div className="flex items-center justify-between gap-2 border-b border-cyan-900/60 pb-0.5">
            <span className="text-cyan-400 font-bold">HU PROBE</span>
            <span
              className="px-1 py-0.2 rounded text-[8px] font-bold"
              style={{ color: tissue.color }}
            >
              {tissue.badge}
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xs font-bold" style={{ color: tissue.color }}>
              {hoverVoxel.hu >= 0 ? `+${hoverVoxel.hu}` : hoverVoxel.hu} HU
            </span>
            <span className="text-[#f4f4f0]/50 text-[8px]">
              [{hoverVoxel.x}, {hoverVoxel.y}, {hoverVoxel.z}]
            </span>
          </div>
          <div className="text-[8px] text-[#f4f4f0]/70 truncate mt-0.5">{tissue.label}</div>
        </div>
      )}
    </div>
  );
};
