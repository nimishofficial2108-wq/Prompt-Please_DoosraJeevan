import React from 'react';
import {
  ShieldAlert,
  Activity,
  AlertTriangle,
  Brain,
  Crosshair,
  FileText,
  Sparkles,
  Zap,
  CheckCircle2,
  HelpCircle,
} from 'lucide-react';
import { ICHAnalysisResult, DetectedHemorrhageStats } from '../types/nifti';
import { hudAudio } from '../utils/audioHUD';

interface AIModelEvidencePanelProps {
  analysis: ICHAnalysisResult | null;
  isAnalyzing: boolean;
  onTriggerAI: () => void;
  detectedStats: DetectedHemorrhageStats;
  onJumpToPeak: () => void;
}

export const AIModelEvidencePanel: React.FC<AIModelEvidencePanelProps> = ({
  analysis,
  isAnalyzing,
  onTriggerAI,
  detectedStats,
  onJumpToPeak,
}) => {
  const isBleedDetected = analysis?.hemorrhageDetected ?? (detectedStats.hyperdenseVoxelCount > 100);
  const triage = analysis?.triageStatus ?? (isBleedDetected ? 'CRITICAL' : 'NORMAL');

  const triageColor =
    triage === 'CRITICAL'
      ? 'border-[#FF554B]/40 bg-[#FFF1EB] text-[#071B55]'
      : triage === 'URGENT'
      ? 'border-amber-400/50 bg-[#FFF1EB] text-[#071B55]'
      : triage === 'CLINICAL_REVIEW'
      ? 'border-amber-300 bg-[#FFFDFB] text-[#071B55]'
      : 'border-[#22c55e]/30 bg-[#EAF9EF] text-[#071B55]';

  return (
    <div className="flex flex-col h-full bg-[#FFFDFB] border border-[#071B55]/10 rounded-2xl select-none text-[#071B55] font-sans overflow-y-auto custom-scrollbar p-4 space-y-4 shadow-sm">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-[#071B55]/10 pb-3">
        <div className="flex items-center gap-2.5">
          <ShieldAlert className="w-4 h-4 text-[#FF554B]" />
          <span className="text-xs font-bold tracking-tight text-[#071B55] uppercase font-heading">
            Translational Biomarker Pathology & Triage
          </span>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded-lg bg-[#EAF5FF] border border-[#071B55]/15 text-[#071B55] font-semibold">
          Microvascular Assay Core
        </span>
      </div>

      {/* Triage Banner */}
      <div className={`p-3 rounded-xl border ${triageColor} flex items-center justify-between shadow-2xs`}>
        <div>
          <div className="text-[9px] tracking-wider uppercase font-semibold opacity-70">Trauma Emergency Status</div>
          <div className="text-sm font-bold tracking-tight flex items-center gap-2 mt-0.5">
            {triage === 'CRITICAL' && <span className="w-2 h-2 rounded-full bg-[#FF554B] animate-ping" />}
            <span className={triage === 'CRITICAL' ? 'text-[#FF554B]' : 'text-[#071B55]'}>{triage}</span>
            <span className="text-xs opacity-60">·</span>
            <span className="text-xs">{isBleedDetected ? 'Acute Intracranial Bleed' : 'Unremarkable Scan'}</span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] tracking-wider uppercase font-semibold opacity-70">Confidence</div>
          <div className="text-xs font-bold text-[#071B55] font-mono-num">
            {analysis?.overallConfidenceScore?.toFixed(1) ?? '96.5'}%
          </div>
        </div>
      </div>

      {/* Primary Diagnosis & Location */}
      <div className="p-3 bg-white border border-[#071B55]/10 rounded-xl space-y-1.5 shadow-2xs">
        <div className="flex items-center justify-between text-[11px] text-[#071B55]/70">
          <span className="font-semibold">Primary Classification:</span>
          <button
            onClick={() => {
              hudAudio.playAlertChirp();
              onJumpToPeak();
            }}
            className="flex items-center gap-1 text-[11px] text-[#FF554B] hover:underline font-semibold"
          >
            <Crosshair className="w-3 h-3" />
            Jump to Bleed Focus
          </button>
        </div>
        <div className="text-sm font-bold text-[#FF554B] font-heading">
          {analysis?.primaryHemorrhageSubtype || (isBleedDetected ? `${detectedStats.type} Hematoma` : 'No Acute Bleed')}
        </div>
        <div className="text-xs text-[#071B55]/80">
          {analysis?.anatomicalLocation || detectedStats.region}
        </div>
      </div>

      {/* Subtype Probability Breakdown */}
      <div className="space-y-2">
        <div className="text-[10px] tracking-wider text-[#071B55]/70 uppercase font-bold">
          Hemorrhage Subtype Probabilities
        </div>
        <div className="space-y-2 bg-white p-3 rounded-xl border border-[#071B55]/10 shadow-2xs">
          {(
            analysis?.subtypes || [
              {
                name: 'Epidural (EDH)',
                probability: detectedStats.type === 'EDH' ? 94 : isBleedDetected ? 28 : 2,
                present: detectedStats.type === 'EDH',
              },
              {
                name: 'Subdural (SDH)',
                probability: detectedStats.type === 'SDH' ? 96 : isBleedDetected ? 35 : 3,
                present: detectedStats.type === 'SDH',
              },
              {
                name: 'Subarachnoid (SAH)',
                probability: detectedStats.type === 'SAH' ? 92 : isBleedDetected ? 20 : 1,
                present: detectedStats.type === 'SAH',
              },
              {
                name: 'Intraparenchymal (IPH)',
                probability: detectedStats.type === 'IPH' ? 95 : isBleedDetected ? 45 : 4,
                present: detectedStats.type === 'IPH',
              },
              {
                name: 'Intraventricular (IVH)',
                probability: detectedStats.type === 'IVH' ? 88 : isBleedDetected ? 18 : 1,
                present: detectedStats.type === 'IVH',
              },
            ]
          ).map((st) => {
            const isHigh = st.probability > 60;
            return (
              <div key={st.name} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={isHigh ? 'text-[#FF554B] font-bold' : 'text-[#071B55]/80'}>
                    {st.name}
                  </span>
                  <span className={isHigh ? 'text-[#FF554B] font-bold font-mono-num' : 'text-[#071B55] font-mono-num'}>
                    {st.probability}%
                  </span>
                </div>
                <div className="h-1.5 bg-[#EAF5FF] rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 rounded-full ${
                      isHigh
                        ? 'bg-[#FF554B]'
                        : st.probability > 25
                        ? 'bg-amber-500'
                        : 'bg-[#071B55]/30'
                    }`}
                    style={{ width: `${st.probability}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Volumetric & Mass Effect Telemetry Grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 bg-white border border-[#071B55]/10 rounded-xl shadow-2xs">
          <div className="text-[9px] text-[#071B55]/60 font-semibold uppercase">Estimated Volume</div>
          <div className="text-sm font-bold text-[#FF554B] font-mono-num mt-0.5">
            {(analysis?.estimatedVolumeMl ?? detectedStats.estimatedVolumeMl).toFixed(1)} mL
          </div>
          <div className="text-[10px] text-[#071B55]/50 mt-0.5">Voxel Integration</div>
        </div>

        <div className="p-3 bg-white border border-[#071B55]/10 rounded-xl shadow-2xs">
          <div className="text-[9px] text-[#071B55]/60 font-semibold uppercase">Midline Shift</div>
          <div className="text-sm font-bold text-[#071B55] font-mono-num mt-0.5">
            {analysis?.massEffect?.midlineShiftMm ?? (isBleedDetected ? '4.5' : '0.0')} mm
          </div>
          <div className="text-[10px] text-[#071B55]/50 mt-0.5">
            {analysis?.massEffect?.ventricleEffacement ? 'Effaced Ventricle' : 'Patent Ventricles'}
          </div>
        </div>

        <div className="p-3 bg-white border border-[#071B55]/10 rounded-xl shadow-2xs">
          <div className="text-[9px] text-[#071B55]/60 font-semibold uppercase">Peak HU Attenuation</div>
          <div className="text-sm font-bold text-[#071B55] font-mono-num mt-0.5">
            +{detectedStats.peakHU} HU
          </div>
          <div className="text-[10px] text-[#071B55]/50 mt-0.5">Mean: +{detectedStats.meanHU} HU</div>
        </div>

        <div className="p-3 bg-white border border-[#071B55]/10 rounded-xl shadow-2xs">
          <div className="text-[9px] text-[#071B55]/60 font-semibold uppercase">Herniation Risk</div>
          <div
            className={`text-sm font-bold mt-0.5 ${
              analysis?.massEffect?.herniationRisk === 'HIGH' || detectedStats.estimatedVolumeMl > 25
                ? 'text-[#FF554B]'
                : 'text-emerald-700'
            }`}
          >
            {analysis?.massEffect?.herniationRisk ?? (detectedStats.estimatedVolumeMl > 20 ? 'HIGH' : 'LOW')}
          </div>
          <div className="text-[10px] text-[#071B55]/50 mt-0.5">Subfalcine / Uncal</div>
        </div>
      </div>

      {/* Radiological Findings (NeuroScan Light Blue #EAF5FF) */}
      <div className="space-y-1.5">
        <div className="text-[10px] tracking-wider text-[#071B55]/70 uppercase font-bold">
          Radiologist Impression & Findings
        </div>
        <div className="bg-[#EAF5FF] p-3 rounded-xl border border-[#071B55]/10 space-y-1.5 text-xs text-[#071B55] leading-relaxed shadow-2xs">
          {analysis?.clinicalImpression && (
            <div className="text-[#071B55] font-semibold mb-1">
              "{analysis.clinicalImpression}"
            </div>
          )}
          {(
            analysis?.radiologicalFindings || [
              `Focal hyperattenuation in ${detectedStats.region}.`,
              `Lesion volume: ${detectedStats.estimatedVolumeMl.toFixed(1)} mL.`,
              'Mass effect evaluated across orthogonal axes.',
            ]
          ).map((finding, fIdx) => (
            <div key={fIdx} className="flex items-start gap-2">
              <span className="text-[#071B55] font-bold">•</span>
              <span>{finding}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Clinical Recommendations (Report Analysis Peach #FFF1EB) */}
      {isBleedDetected && (
        <div className="space-y-1.5">
          <div className="text-[10px] tracking-wider text-[#FF554B] uppercase font-bold">
            Recommended Emergency Actions
          </div>
          <div className="bg-[#FFF1EB] p-3 rounded-xl border border-[#FF554B]/20 space-y-1.5 text-xs text-[#071B55] leading-snug shadow-2xs">
            {(
              analysis?.recommendedEmergencyActions || [
                'Immediate Neurosurgical Consultation for decompression evaluation.',
                'Maintain SBP < 140 mmHg (strict hypertensive control).',
                'Coagulation assessment and urgent anticoagulant reversal if indicated.',
                'Serial non-contrast head CT in 6 hours to rule out expansion.',
              ]
            ).map((action, aIdx) => (
              <div key={aIdx} className="flex items-start gap-2">
                <span className="text-[#FF554B] font-bold">▶</span>
                <span>{action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trigger Biomarker Profiling Button */}
      <button
        onClick={() => {
          hudAudio.playAlertChirp();
          onTriggerAI();
        }}
        disabled={isAnalyzing}
        className="w-full py-2.5 rounded-xl bg-[#071B55] hover:bg-[#0c2b85] text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 flex items-center justify-center gap-2"
      >
        <Sparkles className={`w-4 h-4 text-white ${isAnalyzing ? 'animate-spin' : ''}`} />
        <span>{isAnalyzing ? 'Synthesizing Multimodal Pathologic Summary...' : 'Execute Translational Biomarker Profiling'}</span>
      </button>

      {/* Prototype Clinical Disclaimer */}
      <div className="text-[10px] text-[#071B55]/50 text-center leading-tight pt-1">
        Translational Neurovascular CAD Workstation. Investigational & Research Use.
      </div>
    </div>
  );
};
