import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TwoPanelWorkstation } from './components/TwoPanelWorkstation';
import { UploadPatientModal } from './components/UploadPatientModal';
import { TriageDashboardDrawer } from './components/TriageDashboardDrawer';
import { PatientRecord, WindowPreset } from './types/nifti';
import { NeuroMLModal } from './components/NeuroMLModal';
import { WINDOW_PRESETS, generatePresetVolume } from './utils/presetScans';
import { rankPatientsByUrgency, generatePatientTriageRecord } from './utils/triageEngine';
import { hudAudio, StethoscopeTelemetry } from './utils/audioHUD';
import {
  Brain,
  UserPlus,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  Crosshair,
  Gauge,
  Waves,
  ShieldAlert,
  Radio,
  Activity,
  Sparkles,
} from 'lucide-react';

export default function App() {
  // Patient queue state
  const [patients, setPatients] = useState<PatientRecord[]>(() => [generatePatientTriageRecord(generatePresetVolume('case-normal-05'), 'SYNTHETIC DEMO SCAN', 'DEMO-0001')]);
  const [activePatientId, setActivePatientId] = useState<string>(patients[0].id);

  // Upload modal state
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isTriageDrawerOpen, setIsTriageDrawerOpen] = useState<boolean>(false);
  const [isMLModalOpen, setIsMLModalOpen] = useState<boolean>(false);

  // Active patient volume slices (Axial Z)
  const [axialSlice, setAxialSlice] = useState<number>(0);

  // Radiological Windowing & Overlays
  const [windowPreset, setWindowPreset] = useState<WindowPreset>(WINDOW_PRESETS[0]); // Hemorrhage Window W:130, L:50
  const [showHemorrhageOverlay, setShowHemorrhageOverlay] = useState<boolean>(true);

  // Cine Slice Sequential Animation Player
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(15);

  // Audio HUD & Stethoscope state
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(true);
  const [isStethoscopeEnabled, setIsStethoscopeEnabled] = useState<boolean>(false);
  const [stethoscopeVolume, setStethoscopeVolume] = useState<number>(90); // default loud 90%
  const [stethoscopeTelemetry, setStethoscopeTelemetry] = useState<StethoscopeTelemetry | null>(null);

  const [soundReady, setSoundReady] = useState(false);
  useEffect(() => { hudAudio.isMuted = true; hudAudio.stethoscopeEnabled = false; }, []);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Ensure AudioContext is actively resumed on any user touch/click/key
  useEffect(() => {
    const handleGlobalInteraction = () => {
      hudAudio.initCtx();
    };
    window.addEventListener('pointerdown', handleGlobalInteraction);
    window.addEventListener('keydown', handleGlobalInteraction);
    return () => {
      window.removeEventListener('pointerdown', handleGlobalInteraction);
      window.removeEventListener('keydown', handleGlobalInteraction);
    };
  }, []);

  // Bind stethoscope telemetry callback
  useEffect(() => {
    hudAudio.onTelemetryUpdate = (telemetry) => {
      setStethoscopeTelemetry(telemetry);
    };
    return () => {
      hudAudio.onTelemetryUpdate = undefined;
    };
  }, []);

  // Active patient record
  const activePatient = useMemo(() => {
    return patients.find((p) => p.id === activePatientId) || patients[0] || null;
  }, [patients, activePatientId]);

  // When active patient changes, center slices on their peak lesion
  useEffect(() => {
    if (activePatient) {
      const vol = activePatient.volume;
      const peakZ = activePatient.alertSpots[0]?.sliceZ ?? Math.floor(vol.dimZ / 2);
      setAxialSlice(peakZ);
    }
  }, [activePatient]);

  // Handle single patient uploaded
  const handlePatientAdded = useCallback((newPatient: PatientRecord) => {
    setPatients((prev) => {
      const updated = rankPatientsByUrgency([...prev, newPatient]);
      return updated;
    });
    setActivePatientId(newPatient.id);
    setIsUploadModalOpen(false);
  }, []);

  // Update GCS score for current patient
  const handleUpdateGCS = useCallback((newGCS: number) => {
    setPatients((prev) =>
      prev.map((p) => (p.id === activePatientId ? { ...p, gcs: newGCS } : p))
    );
  }, [activePatientId]);

  // Handle multiple patients uploaded at the same time
  const handleMultiplePatientsAdded = useCallback((newPatients: PatientRecord[]) => {
    setPatients((prev) => {
      const updated = rankPatientsByUrgency([...prev, ...newPatients]);
      return updated;
    });
    const ranked = rankPatientsByUrgency(newPatients);
    if (ranked.length > 0) {
      setActivePatientId(ranked[0].id);
    }
    setIsUploadModalOpen(false);
    setIsTriageDrawerOpen(true);
  }, []);

  // Cine slice animation loop
  useEffect(() => {
    if (!isPlaying || !activePatient) return;

    const totalZ = activePatient.volume.dimZ;
    const intervalMs = Math.max(16, Math.round(1000 / fps));
    const timer = setInterval(() => {
      setAxialSlice((prev) => {
        const next = (prev + 1) % totalZ;
        hudAudio.playSliceTick(1);
        return next;
      });
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isPlaying, activePatient, fps]);

  // Fullscreen toggle
  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // If no patient loaded yet, show the full-screen upload onboarding
  if (!activePatient) {
    return (
      <div className="relative w-screen h-screen bg-black text-[#f4f4f0] flex items-center justify-center font-mono">
        <UploadPatientModal
          isOpen={true}
          isInitialScreen={true}
          onPatientAdded={handlePatientAdded}
          onMultiplePatientsAdded={handleMultiplePatientsAdded}
        />
      </div>
    );
  }

  const vol = activePatient.volume;
  const isBleed = activePatient.hemorrhageDetected;
  const isBruitActive =
    stethoscopeTelemetry &&
    stethoscopeTelemetry.active &&
    stethoscopeTelemetry.status === 'CRITICAL_CLOT_BRUIT';

  return (
    <div className="dj-neuro-shell relative w-full bg-[#F6FAFD] text-[#071B55] flex flex-col select-none">
      <nav className="dj-global-nav" aria-label="DoosraJeevan main navigation">
        <a className="dj-global-brand" href="/"><svg className="dj-global-svg" width="39" height="39" viewBox="0 0 60 60" fill="none" aria-hidden="true"><circle cx="21" cy="8" r="4.4" fill="#FF6255"/><circle cx="39" cy="8" r="4.4" fill="#FF6255"/><path d="M30 51.5 12.2 34.5C1.4 24.3 8.6 12.8 19.4 15.9c4.8 1.4 8 4.8 10.6 8.4 2.6-3.6 5.8-7 10.6-8.4 10.8-3.1 18 8.4 7.2 18.6L30 51.5Z" stroke="#FF6255" strokeWidth="5.5" strokeLinecap="round" strokeLinejoin="round"/><path d="m21.6 34 7.2 7.3 13-14" stroke="#4A95D2" strokeWidth="5.8" strokeLinecap="round" strokeLinejoin="round"/></svg>DoosraJeevan</a>
        <div className="dj-global-links"><a href="/">Home</a><a href="/modules/neuro/" aria-current="page">NeuroScan</a><a href="/modules/organ/">Organ Donation</a></div>
      </nav>
      {/* Upload Patient Modal */}
      <UploadPatientModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onPatientAdded={handlePatientAdded}
        onMultiplePatientsAdded={handleMultiplePatientsAdded}
      />

      {/* Triage Dashboard Drawer */}
      <TriageDashboardDrawer
        isOpen={isTriageDrawerOpen}
        onClose={() => setIsTriageDrawerOpen(false)}
        patients={patients}
        activePatientId={activePatient.id}
        onSelectPatient={(pId) => {
          setActivePatientId(pId);
          hudAudio.playAlertChirp();
        }}
        onOpenUpload={() => setIsUploadModalOpen(true)}
        onOpenBioStaging={(pId) => {
          setActivePatientId(pId);
          setIsMLModalOpen(true);
        }}
      />

      {/* Neurovascular Bio-Staging Matrix Modal */}
      <NeuroMLModal
        isOpen={isMLModalOpen}
        onClose={() => setIsMLModalOpen(false)}
        patient={activePatient}
        onUpdateGCS={handleUpdateGCS}
      />

      {/* ------------------------------------------------------------- */}
      {/* BRAND TOP BAR: PRIMARY NAVY #071B55 WITH 8PX SPACING */}
      {/* ------------------------------------------------------------- */}
      <header className="dj-workspace-header" data-layout-version="3.0">
        <div className="dj-workspace-topline">
          <div className="dj-workspace-brand">
            <div className="dj-workspace-brand-icon"><Brain size={23} /></div>
            <div className="dj-workspace-brand-copy">
              <div className="dj-workspace-brand-title">NeuroScan <span>CT Workstation</span></div>
              {activePatient.patientName !== 'SYNTHETIC DEMO SCAN' && (
                <div className="dj-workspace-patient-meta">
                  <span>{activePatient.patientName}</span>
                  <span className="dj-workspace-dot">·</span>
                  <span>{activePatient.medicalRecordNumber}</span>
                </div>
              )}
            </div>
          </div>
          <div className="dj-workspace-top-actions">

            <button type="button" className={`dj-workspace-button dj-audio-button ${soundReady ? 'dj-audio-ready' : ''}`}
              onClick={() => {
                hudAudio.initCtx();
                hudAudio.isMuted = false;
                hudAudio.stethoscopeEnabled = true;
                hudAudio.setVolume(stethoscopeVolume);
                hudAudio.playActionBeep('scan');
                setIsAudioMuted(false);
                setIsStethoscopeEnabled(true);
                setSoundReady(true);
              }}>
              <Volume2 size={16} /> {soundReady ? 'Sound enabled · Test again' : 'Enable sound'}
            </button>
          </div>
        </div>
        <div className="dj-workspace-controls" aria-label="NeuroScan tools">
          <div className="dj-workspace-controls-left">
            <label className="dj-workspace-input-label">Sample / patient
              <select value={activePatient.id} onChange={(e) => setActivePatientId(e.target.value)}
                className="dj-workspace-select dj-patient-select">
                {patients.map(p => <option value={p.id} key={p.id}>{p.patientName} ({p.triageLevel})</option>)}
              </select>
            </label>
            <label className="dj-workspace-input-label">View window
              <select className="dj-workspace-select" value={windowPreset.id}
                onChange={(e) => {const selected=WINDOW_PRESETS.find(x => x.id === e.target.value);if(selected)setWindowPreset(selected);}}>
                {WINDOW_PRESETS.map(x=><option value={x.id} key={x.id}>{x.name}</option>)}
              </select>
            </label>
            <div className="dj-workspace-audio-group">
              <button className="dj-workspace-icon-button" type="button" aria-label={isStethoscopeEnabled ? 'Turn off stethoscope' : 'Turn on stethoscope'}
                onClick={() => {
                  if (!soundReady) return;
                  const next=hudAudio.toggleStethoscope();
                  setIsStethoscopeEnabled(next);
                }} title={soundReady ? 'Toggle sonification' : 'First click Enable sound'}>
                <Waves size={17}/>
              </button>
              <label htmlFor="dj-stethoscope-volume">Volume</label>
              <input id="dj-stethoscope-volume" type="range" min={0} max={100} value={stethoscopeVolume}
                onChange={e=>{const n=Number(e.target.value);setStethoscopeVolume(n);hudAudio.setVolume(n)}} />
              <span>{stethoscopeVolume}%</span>
            </div>
          </div>
          <div className="dj-workspace-controls-right">
            <button type="button" className="dj-workspace-button" onClick={()=>setIsUploadModalOpen(true)}>
              <UserPlus size={16}/> Load scan
            </button>
            <button type="button" className="dj-workspace-button" onClick={()=>setIsTriageDrawerOpen(true)}>
              <ShieldAlert size={16}/> Triage queue
            </button>
            <button type="button" className="dj-workspace-button dj-workspace-primary" onClick={()=>setIsMLModalOpen(true)}>
              <Activity size={16}/> Bio-staging
            </button>
            <button type="button" className="dj-workspace-icon-button" aria-label={isAudioMuted?'Unmute audio':'Mute audio'}
              onClick={()=>{const next=!isAudioMuted;setIsAudioMuted(next);hudAudio.isMuted=next}}>
              {isAudioMuted?<VolumeX size={17}/>:<Volume2 size={17}/>}
            </button>
            <button type="button" className="dj-workspace-icon-button" aria-label={isFullscreen?'Exit fullscreen':'Enter fullscreen'} onClick={handleToggleFullscreen}>
              {isFullscreen?<Minimize2 size={17}/>:<Maximize2 size={17}/>}
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------- */}
      {/* 2-PANEL WORKSTATION: AXIAL & TRANSVERSE 2.5X IPH FOCUS */}
      {/* ------------------------------------------------------------- */}
      <main className="dj-neuro-workstation flex-1 min-h-0 w-full relative flex bg-[#F6FAFD]">
        <TwoPanelWorkstation
          patient={activePatient}
          axialSlice={axialSlice}
          onAxialSliceChange={setAxialSlice}
          windowPreset={windowPreset}
          showHemorrhageOverlay={showHemorrhageOverlay}
          onToggleHemorrhageOverlay={() => setShowHemorrhageOverlay(!showHemorrhageOverlay)}
          stethoscopeTelemetry={stethoscopeTelemetry}
          onOpenBioStaging={() => setIsMLModalOpen(true)}
        />
      </main>

      {/* ------------------------------------------------------------- */}
      {/* CINE ANIMATION BAR: WARM BACKGROUND #FFFDFB & SHADOW */}
      {/* ------------------------------------------------------------- */}
      <footer className="dj-neuro-footer relative z-30 flex items-center justify-between gap-3 px-4 py-2.5 bg-white border-t border-[#071B55]/10 shadow-sm text-xs text-[#071B55]">
        {/* Playback controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              hudAudio.playSliceTick(-1);
              setAxialSlice((prev) => (prev > 0 ? prev - 1 : vol.dimZ - 1));
            }}
            className="p-2 rounded-xl bg-[#EAF5FF] hover:bg-[#d6ecff] text-[#071B55] transition-colors shadow-sm"
            title="Previous Slice"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              hudAudio.playActionBeep('toggle');
              setIsPlaying(!isPlaying);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm ${
              isPlaying
                ? 'bg-[#FF554B] text-white shadow-md'
                : 'bg-[#071B55] text-white hover:bg-[#0c2b85]'
            }`}
          >
            {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlaying ? 'Pause Cine' : 'Play Cine'}</span>
          </button>

          <button
            onClick={() => {
              hudAudio.playSliceTick(1);
              setAxialSlice((prev) => (prev + 1) % vol.dimZ);
            }}
            className="p-2 rounded-xl bg-[#EAF5FF] hover:bg-[#d6ecff] text-[#071B55] transition-colors shadow-sm"
            title="Next Slice"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>

          {/* Jump to Peak Bleed focus button */}
          {activePatient.alertSpots[0] && (
            <button
              onClick={() => {
                hudAudio.playAlertChirp();
                setAxialSlice(activePatient.alertSpots[0].sliceZ);
              }}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FFF1EB] hover:bg-[#ffe5dc] text-[#FF554B] text-[11px] font-bold border border-[#FF554B]/20 transition-colors shadow-sm"
              title="Jump directly to peak acute hemorrhage slice"
            >
              <Crosshair className="w-3.5 h-3.5" />
              <span>Jump to Bleed (Slice {activePatient.alertSpots[0].sliceZ + 1})</span>
            </button>
          )}
        </div>

        {/* Global Slice Scrubber */}
        <div className="flex-1 max-w-xl mx-6 flex items-center gap-3">
          <span className="text-[11px] font-semibold text-[#071B55]/70 hidden sm:inline">Slice Scrubber:</span>
          <input
            type="range"
            min={0}
            max={vol.dimZ - 1}
            value={axialSlice}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              hudAudio.playSliceTick(val > axialSlice ? 1 : -1);
              setAxialSlice(val);
            }}
            className="flex-1 h-2 accent-[#071B55] bg-[#EAF5FF] rounded-lg cursor-pointer"
          />
          <span className="text-xs font-bold text-[#071B55] font-mono-num w-16 text-right">
            {String(axialSlice + 1).padStart(2, '0')} / {String(vol.dimZ).padStart(2, '0')}
          </span>
        </div>

        {/* Animation Speed FPS */}
        <div className="hidden md:flex items-center gap-2 text-[11px] text-[#071B55]/80">
          <Gauge className="w-3.5 h-3.5 text-[#071B55]" />
          <span>Speed:</span>
          <input
            type="range"
            min={5}
            max={45}
            step={5}
            value={fps}
            onChange={(e) => setFps(parseInt(e.target.value, 10))}
            className="w-16 h-1.5 accent-[#071B55] bg-[#EAF5FF] rounded-lg cursor-pointer"
          />
          <span className="text-[#071B55] font-bold font-mono-num w-8">{fps} FPS</span>
        </div>
      </footer>
    </div>
  );
}
