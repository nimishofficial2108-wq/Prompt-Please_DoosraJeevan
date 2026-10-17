import React, { useRef } from 'react';
import {
  Brain,
  Upload,
  Download,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Activity,
  Sparkles,
  ShieldAlert,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { VolumeData } from '../types/nifti';
import { PRESET_CASES, PresetCaseMeta } from '../utils/presetScans';
import { parseNiftiFile, exportToNifti } from '../utils/niftiParser';
import { hudAudio } from '../utils/audioHUD';

interface HUDHeaderProps {
  volume: VolumeData;
  onVolumeChange: (vol: VolumeData) => void;
  selectedCaseId: string;
  onSelectCase: (caseId: string) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onTriggerAI: () => void;
  isAnalyzing: boolean;
  activeOrientation: string;
  onOpenUploadModal?: () => void;
}

export const HUDHeader: React.FC<HUDHeaderProps> = ({
  volume,
  onVolumeChange,
  selectedCaseId,
  onSelectCase,
  isFullscreen,
  onToggleFullscreen,
  isAudioMuted,
  onToggleAudio,
  onTriggerAI,
  isAnalyzing,
  activeOrientation,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    hudAudio.playActionBeep('scan');
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseNiftiFile(buffer, file.name);
      onVolumeChange(parsed);
    } catch (err: any) {
      console.error('Error parsing uploaded NIfTI file:', err);
      alert(`NIfTI Load Error: ${err.message || 'Corrupted or unsupported format'}`);
    }
  };

  const handleExport = () => {
    hudAudio.playActionBeep('select');
    const niftiBytes = exportToNifti(volume);
    const blob = new Blob([niftiBytes], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = volume.fileName.endsWith('.nii') ? volume.fileName : `${volume.fileName}.nii`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentCase = PRESET_CASES.find((c) => c.id === selectedCaseId);

  return (
    <header className="relative z-20 flex items-center justify-between px-4 py-2 bg-black/85 backdrop-blur-md border-b border-cyan-800/60 select-none text-[#f4f4f0]">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".nii,.gz,.nii.gz"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Brand & Terminal Station ID */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-8 h-8 rounded border border-cyan-400 bg-cyan-950/40 text-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.3)]">
          <Brain className="w-5 h-5 animate-pulse" />
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-xs md:text-sm text-cyan-400">
              ICH-RAD // NEURO-CT HUD
            </span>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 font-mono tracking-widest">
              V.4.2-DIAGNOSTIC
            </span>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-[#f4f4f0]/60 font-mono">
            <span>FILE: {volume.fileName}</span>
            <span className="text-cyan-600">|</span>
            <span>
              DIM: {volume.dimX}×{volume.dimY}×{volume.dimZ}
            </span>
            <span className="text-cyan-600">|</span>
            <span className="text-cyan-400">PLANE: {activeOrientation}</span>
          </div>
        </div>
      </div>

      {/* Clinical Case Quick Switcher */}
      <div className="hidden lg:flex items-center gap-2 bg-black/60 border border-cyan-900/60 px-2 py-1 rounded">
        <span className="text-[9px] font-mono tracking-widest text-cyan-400/80 uppercase">
          CLINICAL CASE:
        </span>
        <div className="relative">
          <select
            value={selectedCaseId}
            onChange={(e) => {
              hudAudio.playActionBeep('select');
              onSelectCase(e.target.value);
            }}
            className="bg-black/90 text-xs font-mono text-cyan-300 border border-cyan-700/80 rounded px-2 py-1 pr-6 cursor-pointer focus:outline-none focus:border-cyan-400 hover:border-cyan-500 appearance-none"
          >
            {PRESET_CASES.map((c) => (
              <option key={c.id} value={c.id} className="bg-black text-[#f4f4f0]">
                {c.shortName} - {c.triage}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-cyan-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>

        {currentCase && (
          <span
            className={`text-[9px] px-1.5 py-0.5 rounded font-mono font-bold tracking-widest ${
              currentCase.triage === 'CRITICAL'
                ? 'bg-red-950/80 border border-red-500 text-red-400 animate-pulse'
                : 'bg-emerald-950/80 border border-emerald-500 text-emerald-400'
            }`}
          >
            {currentCase.triage}
          </span>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5 md:gap-2">
        {/* Upload .NII / .NII.GZ */}
        <button
          onClick={() => {
            hudAudio.playActionBeep('select');
            fileInputRef.current?.click();
          }}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-black/70 border border-cyan-700/80 hover:border-cyan-400 text-cyan-300 hover:text-cyan-200 text-xs font-mono transition-all hover:shadow-[0_0_10px_rgba(34,211,238,0.25)]"
          title="Upload local .nii or .nii.gz file"
        >
          <Upload className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">LOAD .NII / .GZ</span>
        </button>

        {/* Export .NII */}
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-2 py-1.5 rounded bg-black/70 border border-cyan-800 hover:border-cyan-500 text-[#f4f4f0]/70 hover:text-cyan-300 text-xs font-mono transition-all"
          title="Export current volume as NIfTI-1 (.nii) binary"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">SAVE .NII</span>
        </button>

        {/* AI Triage Analysis Button */}
        <button
          onClick={() => {
            hudAudio.playAlertChirp();
            onTriggerAI();
          }}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-gradient-to-r from-red-950/80 via-red-900/60 to-red-950/80 border border-red-500 hover:border-red-400 text-red-200 hover:text-white text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(239,68,68,0.4)] disabled:opacity-50"
        >
          <Sparkles className={`w-3.5 h-3.5 text-red-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'SCANNING AI...' : 'AI ICH TRIAGE'}</span>
        </button>

        {/* Audio HUD Toggle */}
        <button
          onClick={() => {
            onToggleAudio();
            hudAudio.playActionBeep('toggle');
          }}
          className="p-1.5 rounded bg-black/70 border border-cyan-900 hover:border-cyan-600 text-cyan-400 transition-all"
          title={isAudioMuted ? 'Unmute HUD Audio' : 'Mute HUD Audio'}
        >
          {isAudioMuted ? (
            <VolumeX className="w-4 h-4 text-[#f4f4f0]/40" />
          ) : (
            <Volume2 className="w-4 h-4 text-cyan-400" />
          )}
        </button>

        {/* Fullscreen Toggle */}
        <button
          onClick={() => {
            hudAudio.playActionBeep('select');
            onToggleFullscreen();
          }}
          className="p-1.5 rounded bg-black/70 border border-cyan-700 hover:border-cyan-400 text-cyan-400 transition-all hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen HUD'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};
