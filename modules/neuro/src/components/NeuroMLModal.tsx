import React, { useState } from 'react';
import {
  Brain,
  Activity,
  AlertTriangle,
  ShieldAlert,
  Flame,
  TrendingUp,
  Percent,
  Sliders,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Stethoscope,
  X,
  Dna,
  Zap,
} from 'lucide-react';
import { PatientRecord } from '../types/nifti';
import { runNeuroBioStagingAssay, BioStagingResult } from '../utils/neuroML';
import { hudAudio } from '../utils/audioHUD';

interface NeuroBioStagingModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord;
  onUpdateGCS: (newGCS: number) => void;
}

export const NeuroMLModal: React.FC<NeuroBioStagingModalProps> = ({
  isOpen,
  onClose,
  patient,
  onUpdateGCS,
}) => {
  const [currentGCS, setCurrentGCS] = useState<number>(patient.gcs ?? 12);
  const [showDetailedScale, setShowDetailedScale] = useState<boolean>(false);

  // Eye, Verbal, Motor states for quick clinical drilldown
  const [eyeScore, setEyeScore] = useState<number>(currentGCS >= 13 ? 4 : currentGCS >= 9 ? 3 : 2);
  const [verbalScore, setVerbalScore] = useState<number>(currentGCS >= 13 ? 5 : currentGCS >= 9 ? 4 : 2);
  const [motorScore, setMotorScore] = useState<number>(currentGCS >= 13 ? 5 : currentGCS >= 9 ? 4 : 4);

  if (!isOpen) return null;

  const loc = (patient.location || '').toLowerCase();
  const isInfratentorial = loc.includes('cerebell') || loc.includes('pontine') || loc.includes('brainstem');
  const hasIVH = patient.primarySubtype === 'IVH' || loc.includes('ventric');
  const hasSpotSign = patient.alertSpots.some((s) => s.type === 'EXTRAVASATION_SPOT');

  // Run the Quantitative Neurovascular Bio-Staging Assay with current live parameters
  const bioResult: BioStagingResult = runNeuroBioStagingAssay({
    volumeMl: patient.volumeMl,
    midlineShiftMm: patient.midlineShiftMm,
    hasSpotSign,
    age: patient.age,
    gcs: currentGCS,
    isInfratentorial,
    hasIVH,
    locationName: patient.location,
  });

  const handleGCSChange = (val: number) => {
    setCurrentGCS(val);
    onUpdateGCS(val);
    hudAudio.playSliceTick(val > currentGCS ? 1 : -1);
  };

  const handleDetailedUpdate = (e: number, v: number, m: number) => {
    setEyeScore(e);
    setVerbalScore(v);
    setMotorScore(m);
    const sum = e + v + m;
    setCurrentGCS(sum);
    onUpdateGCS(sum);
    hudAudio.playAlertChirp();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none font-sans">
      <div className="w-full max-w-2xl bg-[#FFFDFB] border border-[#071B55]/15 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden text-[#071B55]">
        
        {/* Header: Primary Navy with Biotech Branding */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#071B55] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#EAF5FF] flex items-center justify-center text-[#071B55] shadow-sm">
              <Dna className="w-5 h-5 text-[#071B55]" />
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight flex items-center gap-2 font-heading">
                <span>Neurovascular Bio-Staging Matrix™</span>
                <span className="text-[10px] px-2 py-0.5 rounded-lg bg-white/20 text-white font-semibold">
                  Translational Assay
                </span>
              </div>
              <div className="text-[11px] text-white/80">
                Patient: <span className="font-semibold text-white">{patient.patientName}</span> ({patient.age}y) · Scan: {patient.primarySubtype} ({patient.volumeMl.toFixed(1)} mL)
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              hudAudio.playActionBeep('toggle');
              onClose();
            }}
            className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar">

          {/* Top 3 Quantitative Bio-Assay KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Card 1: Hemorrhagic Bioscore Index (Report Analysis Peach #FFF1EB) */}
            <div className="p-4 rounded-2xl bg-[#FFF1EB] border border-[#FF554B]/20 shadow-sm flex flex-col justify-between text-[#071B55]">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold opacity-90">
                <span>Hemorrhagic Bioscore</span>
                <ShieldAlert className="w-4 h-4 text-[#FF554B]" />
              </div>
              <div className="my-3 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono-num text-[#071B55]">
                  Stage {bioResult.ichScore} <span className="text-xs font-normal opacity-70">/ 6</span>
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white border border-[#FF554B]/30 text-[#FF554B] shadow-2xs">
                  {bioResult.mortalityRiskTier}
                </span>
              </div>
              <div className="border-t border-[#FF554B]/15 pt-2 text-[11px] flex justify-between items-center">
                <span className="opacity-80">30-Day Vascular Mortality:</span>
                <span className="text-xs font-bold font-mono-num text-[#FF554B]">{bioResult.mortality30DayPercent}%</span>
              </div>
            </div>

            {/* Card 2: 24h Microvascular Extravasation Rate (NeuroScan Light Blue #EAF5FF) */}
            <div className="p-4 rounded-2xl bg-[#EAF5FF] border border-[#071B55]/15 shadow-sm flex flex-col justify-between text-[#071B55]">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold opacity-90">
                <span>Extravasation Rate</span>
                <TrendingUp className="w-4 h-4 text-[#071B55]" />
              </div>
              <div className="my-3 flex items-baseline justify-between">
                <span className="text-3xl font-black font-mono-num text-[#071B55]">
                  {bioResult.expansionRiskPercent}%
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-white border border-[#071B55]/20 text-[#071B55] shadow-2xs">
                  {bioResult.expansionRiskTier}
                </span>
              </div>
              <div className="border-t border-[#071B55]/10 pt-2 text-[11px] flex justify-between items-center">
                <span className="opacity-80">Extravasation Spot:</span>
                <span className={`text-[11px] font-bold ${hasSpotSign ? 'text-[#FF554B]' : 'text-emerald-700'}`}>
                  {hasSpotSign ? 'Active (+80 HU Contrast Peak)' : 'Absent'}
                </span>
              </div>
            </div>

            {/* Card 3: Decompression & Craniotomy Priority (Organ Donation Mint #EAF9EF) */}
            <div className="p-4 rounded-2xl bg-[#EAF9EF] border border-[#22c55e]/30 shadow-sm flex flex-col justify-between text-[#071B55]">
              <div className="flex items-center justify-between text-[11px] uppercase tracking-wider font-semibold opacity-90">
                <span>Decompression Staging</span>
                <Brain className="w-4 h-4 text-[#071B55]" />
              </div>
              <div className="my-2">
                <div className={`text-sm font-bold font-heading ${
                  bioResult.surgicalRecommendation === 'EMERGENCY_SURGERY'
                    ? 'text-[#FF554B]'
                    : 'text-[#071B55]'
                }`}>
                  {bioResult.surgicalRecommendation.replace(/_/g, ' ')}
                </div>
                <div className="text-[11px] opacity-80 line-clamp-2 mt-1 leading-snug">
                  {bioResult.surgicalRationale}
                </div>
              </div>
              <div className="border-t border-[#22c55e]/20 pt-2 text-[11px] flex justify-between">
                <span>Midline Falx Deviation:</span>
                <span className="font-bold font-mono-num">{patient.midlineShiftMm.toFixed(1)} mm</span>
              </div>
            </div>

          </div>

          {/* Interactive Neurological Impairment Index (GCS) Control Panel */}
          <div className="p-5 rounded-2xl border border-[#071B55]/10 bg-white shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-[#071B55]" />
                <span className="text-xs font-bold text-[#071B55] tracking-tight uppercase font-heading">
                  Neurological Impairment Index (GCS)
                </span>
                <span className="text-[10px] text-[#071B55]/60">(Biometric Neurological State Calibration)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#071B55] bg-[#EAF5FF] px-3 py-1 rounded-xl border border-[#071B55]/15 font-mono-num">
                  GCS: {currentGCS} / 15
                </span>
                <button
                  onClick={() => setShowDetailedScale(!showDetailedScale)}
                  className="text-xs text-[#071B55] font-semibold hover:text-[#FF554B] flex items-center gap-1 transition-colors"
                >
                  {showDetailedScale ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  {showDetailedScale ? 'Simple Slider' : 'E-V-M Detail'}
                </button>
              </div>
            </div>

            {/* Slider */}
            {!showDetailedScale ? (
              <div className="space-y-2 pt-1">
                <div className="flex justify-between text-[11px] font-medium">
                  <span className="text-[#FF554B]">Severe Coma (3–4) [+2 pts]</span>
                  <span className="text-amber-700">Moderate Impairment (5–12) [+1 pt]</span>
                  <span className="text-emerald-700">Normal / Mild (13–15) [0 pts]</span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={15}
                  value={currentGCS}
                  onChange={(e) => handleGCSChange(parseInt(e.target.value, 10))}
                  className="w-full h-2.5 accent-[#FF554B] bg-[#EAF5FF] rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-[#071B55]/60 font-mono-num font-bold">
                  <span>3</span>
                  <span>5</span>
                  <span>8</span>
                  <span>10</span>
                  <span>12</span>
                  <span>15</span>
                </div>
              </div>
            ) : (
              /* EVM Breakdown */
              <div className="grid grid-cols-3 gap-3 pt-1 text-[11px]">
                {/* Eye */}
                <div className="bg-[#FFFDFB] p-3 rounded-xl border border-[#071B55]/15 space-y-1.5 shadow-2xs">
                  <span className="text-[#071B55] font-bold block">Eye Opening (1–4)</span>
                  <select
                    value={eyeScore}
                    onChange={(e) => handleDetailedUpdate(parseInt(e.target.value, 10), verbalScore, motorScore)}
                    className="w-full bg-white border border-[#071B55]/20 text-xs p-1.5 rounded-lg text-[#071B55]"
                  >
                    <option value={4}>4 - Spontaneous</option>
                    <option value={3}>3 - To Sound</option>
                    <option value={2}>2 - To Pressure</option>
                    <option value={1}>1 - None</option>
                  </select>
                </div>

                {/* Verbal */}
                <div className="bg-[#FFFDFB] p-3 rounded-xl border border-[#071B55]/15 space-y-1.5 shadow-2xs">
                  <span className="text-[#071B55] font-bold block">Verbal Response (1–5)</span>
                  <select
                    value={verbalScore}
                    onChange={(e) => handleDetailedUpdate(eyeScore, parseInt(e.target.value, 10), motorScore)}
                    className="w-full bg-white border border-[#071B55]/20 text-xs p-1.5 rounded-lg text-[#071B55]"
                  >
                    <option value={5}>5 - Oriented</option>
                    <option value={4}>4 - Confused</option>
                    <option value={3}>3 - Inappropriate</option>
                    <option value={2}>2 - Incomprehensible</option>
                    <option value={1}>1 - None</option>
                  </select>
                </div>

                {/* Motor */}
                <div className="bg-[#FFFDFB] p-3 rounded-xl border border-[#071B55]/15 space-y-1.5 shadow-2xs">
                  <span className="text-[#071B55] font-bold block">Motor Response (1–6)</span>
                  <select
                    value={motorScore}
                    onChange={(e) => handleDetailedUpdate(eyeScore, verbalScore, parseInt(e.target.value, 10))}
                    className="w-full bg-white border border-[#071B55]/20 text-xs p-1.5 rounded-lg text-[#071B55]"
                  >
                    <option value={6}>6 - Obeys</option>
                    <option value={5}>5 - Localizes</option>
                    <option value={4}>4 - Normal Flexion</option>
                    <option value={3}>3 - Abnormal Flexion</option>
                    <option value={2}>2 - Extension</option>
                    <option value={1}>1 - None</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Bioscore Factor Weight Calibration Matrix */}
          <div className="p-4 rounded-2xl border border-[#071B55]/10 bg-white shadow-sm space-y-3">
            <span className="text-[10px] text-[#071B55]/70 uppercase tracking-widest font-bold">
              Bioscore Factor Weight Calibration Matrix
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-3 rounded-xl bg-[#EAF5FF] border border-[#071B55]/10">
                <div className="text-[11px] text-[#071B55]/70">GCS Score ({currentGCS})</div>
                <div className="text-sm font-bold font-mono-num text-[#071B55] mt-1">
                  +{bioResult.pointsBreakdown.gcsPoints} pt
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#EAF5FF] border border-[#071B55]/10">
                <div className="text-[11px] text-[#071B55]/70">Volume ({patient.volumeMl.toFixed(0)}mL)</div>
                <div className="text-sm font-bold font-mono-num text-[#071B55] mt-1">
                  +{bioResult.pointsBreakdown.volumePoints} pt
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#EAF5FF] border border-[#071B55]/10">
                <div className="text-[11px] text-[#071B55]/70">Age ({patient.age}y)</div>
                <div className="text-sm font-bold font-mono-num text-[#071B55] mt-1">
                  +{bioResult.pointsBreakdown.agePoints} pt
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#EAF5FF] border border-[#071B55]/10">
                <div className="text-[11px] text-[#071B55]/70">Infratentorial</div>
                <div className="text-sm font-bold font-mono-num text-[#071B55] mt-1">
                  +{bioResult.pointsBreakdown.infratentorialPoints} pt
                </div>
              </div>

              <div className="p-3 rounded-xl bg-[#EAF5FF] border border-[#071B55]/10">
                <div className="text-[11px] text-[#071B55]/70">IVH Extension</div>
                <div className="text-sm font-bold font-mono-num text-[#071B55] mt-1">
                  +{bioResult.pointsBreakdown.ivhPoints} pt
                </div>
              </div>
            </div>
          </div>

          {/* Key Extravasation & Hemodynamic Drivers */}
          <div className="p-4 rounded-2xl border border-[#FF554B]/20 bg-[#FFF1EB] space-y-2 text-[#071B55]">
            <span className="text-[11px] text-[#FF554B] font-bold uppercase tracking-wider block">
              Active Microvascular Extravasation & Hemodynamic Drivers:
            </span>
            <ul className="text-xs space-y-1.5">
              {bioResult.expansionKeyDrivers.map((driver, idx) => (
                <li key={idx} className="flex items-center gap-2">
                  <span className="text-[#FF554B] font-bold">•</span>
                  <span>{driver}</span>
                </li>
              ))}
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#071B55]/10 bg-white flex items-center justify-between">
          <span className="text-[11px] text-[#071B55]/60">
            Validated Multicenter Neurovascular Bioscore Protocol (Hemphill & PREDICT Translational Framework)
          </span>
          <button
            onClick={() => {
              hudAudio.playActionBeep('select');
              onClose();
            }}
            className="px-5 py-2 rounded-xl bg-[#071B55] hover:bg-[#0c2b85] text-white text-xs font-semibold shadow-sm transition-all"
          >
            Confirm & Return to Workstation
          </button>
        </div>

      </div>
    </div>
  );
};
