import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  Clock,
  Activity,
  Layers,
  X,
  UserPlus,
  ArrowRight,
  Flame,
} from 'lucide-react';
import { PatientRecord } from '../types/nifti';
import { hudAudio } from '../utils/audioHUD';

interface TriageDashboardDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  patients: PatientRecord[];
  activePatientId: string;
  onSelectPatient: (patientId: string) => void;
  onOpenUpload: () => void;
  onOpenBioStaging?: (patientId: string) => void;
}

export const TriageDashboardDrawer: React.FC<TriageDashboardDrawerProps> = ({
  isOpen,
  onClose,
  patients,
  activePatientId,
  onSelectPatient,
  onOpenUpload,
  onOpenBioStaging,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm select-none font-sans">
      <div className="w-full max-w-md md:max-w-lg h-full bg-[#FFFDFB] border-l border-[#071B55]/15 p-6 flex flex-col gap-4 text-[#071B55] shadow-2xl overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#071B55]/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#FFF1EB] flex items-center justify-center text-[#FF554B] shadow-2xs">
              <ShieldAlert className="w-5 h-5 text-[#FF554B]" />
            </div>
            <div>
              <div className="text-base font-bold text-[#071B55] tracking-tight font-heading">
                Trauma Triage Dashboard
              </div>
              <div className="text-xs text-[#071B55]/60">
                Patient Queue Ranked by Neurological Urgency
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[#EAF5FF] text-[#071B55] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: Add Another Patient */}
        <button
          onClick={() => {
            hudAudio.playActionBeep('select');
            onOpenUpload();
          }}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#071B55] hover:bg-[#0c2b85] text-white text-xs font-semibold shadow-sm transition-all"
        >
          <UserPlus className="w-4 h-4 text-white" />
          <span>+ Upload Another Patient Scan (.nii / .dcm)</span>
        </button>

        {/* Patient Queue Cards */}
        <div className="space-y-3 flex-1">
          {patients.length === 0 && (
            <div className="text-center py-12 text-xs text-[#071B55]/50">
              No patients in triage queue. Click above to ingest a scan.
            </div>
          )}

          {patients.map((patient) => {
            const isActive = patient.id === activePatientId;
            const isCritical = patient.triageLevel === 'CRITICAL';
            const isUrgent = patient.triageLevel === 'URGENT';

            const badgeBg = isCritical
              ? 'bg-[#FF554B] text-white shadow-xs'
              : isUrgent
              ? 'bg-[#FFF1EB] text-[#FF554B] border border-[#FF554B]/30'
              : 'bg-[#EAF9EF] text-[#071B55] border border-[#22c55e]/30';

            return (
              <div
                key={patient.id}
                onClick={() => {
                  hudAudio.playAlertChirp();
                  onSelectPatient(patient.id);
                  onClose();
                }}
                className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm hover:shadow-md ${
                  isActive
                    ? 'border-[#071B55] bg-[#EAF5FF]/40 ring-2 ring-[#071B55]/15'
                    : 'border-[#071B55]/10 bg-white hover:border-[#071B55]/30'
                }`}
              >
                {/* Top Row: Rank, Patient ID & Triage Badge */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-lg bg-[#EAF5FF] text-[#071B55] font-mono-num">
                      #{patient.urgencyRank}
                    </span>
                    <span className="text-sm font-semibold text-[#071B55]">{patient.patientName}</span>
                  </div>

                  <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-bold tracking-wide uppercase ${badgeBg}`}>
                    {patient.triageLevel}
                  </span>
                </div>

                {/* Patient Sub-details */}
                <div className="flex items-center justify-between text-[11px] text-[#071B55]/60 mt-2">
                  <span className="font-mono-num">{patient.medicalRecordNumber}</span>
                  <span>Time: {patient.scanTime}</span>
                  <span className="truncate max-w-[120px]">{patient.fileName}</span>
                </div>

                {/* Bleed Telemetry */}
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-[#071B55]/10 text-xs">
                  <div>
                    <span className="text-[#071B55]/50 text-[10px] block font-medium">BLEED TYPE</span>
                    <span className={patient.hemorrhageDetected ? 'text-[#FF554B] font-bold' : 'text-emerald-700 font-semibold'}>
                      {patient.primarySubtype}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#071B55]/50 text-[10px] block font-medium">VOLUME</span>
                    <span className="text-[#071B55] font-bold font-mono-num">
                      {patient.volumeMl > 0 ? `${patient.volumeMl.toFixed(1)} mL` : '0 mL'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[#071B55]/50 text-[10px] block font-medium">MIDLINE SHIFT</span>
                    <span className={patient.midlineShiftMm > 4 ? 'text-[#FF554B] font-bold' : 'text-[#071B55] font-mono-num font-semibold'}>
                      {patient.midlineShiftMm > 0 ? `${patient.midlineShiftMm} mm` : 'None'}
                    </span>
                  </div>
                </div>

                {/* Natural Alert Spots Indicator */}
                {patient.alertSpots.length > 0 && (
                  <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[#FF554B] font-semibold bg-[#FFF1EB] px-3 py-1.5 rounded-xl border border-[#FF554B]/20">
                    <Flame className="w-3.5 h-3.5 text-[#FF554B]" />
                    <span>
                      {patient.alertSpots.length} Acute Bleed Spot(s) Identified
                    </span>
                  </div>
                )}

                {/* Active Indicator & Load / Bio-Staging Action */}
                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-[#071B55]/10 text-xs font-semibold text-[#071B55]">
                  {onOpenBioStaging && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectPatient(patient.id);
                        onOpenBioStaging(patient.id);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#EAF5FF] hover:bg-[#d5edff] text-[#071B55] text-[10px] font-bold border border-[#071B55]/15 transition-all shadow-2xs"
                      title="Open Neurovascular Bio-Staging Matrix for this patient"
                    >
                      <Activity className="w-3 h-3 text-[#FF554B]" />
                      <span>Bio-Staging Matrix →</span>
                    </button>
                  )}

                  <div className="ml-auto">
                    {isActive ? (
                      <span className="text-emerald-700 flex items-center gap-1">
                        ✓ Active Scan
                      </span>
                    ) : (
                      <span className="hover:text-[#FF554B] flex items-center gap-1 transition-colors">
                        Load Scan <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
