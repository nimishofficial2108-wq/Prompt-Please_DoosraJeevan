import React, { useState, useRef } from 'react';
import { Upload, FileText, UserPlus, AlertCircle, Sparkles, X, ShieldAlert } from 'lucide-react';
import { VolumeData, PatientRecord } from '../types/nifti';
import { parseNiftiFile } from '../utils/niftiParser';
import { dicomSliceToVolume, isDicom } from '../utils/dicomParser';
import { generatePresetVolume, PRESET_CASES } from '../utils/presetScans';
import { generatePatientTriageRecord } from '../utils/triageEngine';
import { hudAudio } from '../utils/audioHUD';

interface UploadPatientModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onPatientAdded: (patient: PatientRecord) => void;
  onMultiplePatientsAdded: (patients: PatientRecord[]) => void;
  isInitialScreen?: boolean;
}

export const UploadPatientModal: React.FC<UploadPatientModalProps> = ({
  isOpen,
  onClose,
  onPatientAdded,
  onMultiplePatientsAdded,
  isInitialScreen = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [patientName, setPatientName] = useState('');
  const [mrn, setMrn] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFiles = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setIsProcessing(true);
    setErrorMsg(null);
    hudAudio.playActionBeep('scan');

    try {
      const newPatients: PatientRecord[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const buffer = await file.arrayBuffer();
        const u8 = new Uint8Array(buffer);

        let volume: VolumeData;
        if (isDicom(u8) || file.name.endsWith('.dcm') || file.name.endsWith('.dicom')) {
          volume = dicomSliceToVolume(buffer, file.name);
        } else {
          volume = parseNiftiFile(buffer, file.name);
        }

        const pName =
          files.length === 1 && patientName.trim()
            ? patientName.trim()
            : `PATIENT_${file.name.replace(/\.[^/.]+$/, '').toUpperCase()}`;
        const pMrn =
          files.length === 1 && mrn.trim()
            ? mrn.trim()
            : `MRN-${Math.floor(100000 + Math.random() * 900000)}`;

        const patientRecord = generatePatientTriageRecord(volume, pName, pMrn);
        newPatients.push(patientRecord);
      }

      if (newPatients.length === 1) {
        onPatientAdded(newPatients[0]);
      } else if (newPatients.length > 1) {
        onMultiplePatientsAdded(newPatients);
      }

      hudAudio.playAlertChirp();
      if (onClose) onClose();
    } catch (err: any) {
      console.error('File parsing error:', err);
      setErrorMsg(err.message || 'Failed to parse scan file. Ensure valid .nii, .nii.gz, or .dcm format.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuickLoadPreset = (caseId: string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    hudAudio.playActionBeep('select');
    try {
      const vol = generatePresetVolume(caseId);
      const caseMeta = PRESET_CASES.find((c) => c.id === caseId);
      const p = generatePatientTriageRecord(
        vol,
        caseMeta ? `TRAUMA_${caseMeta.shortName.toUpperCase()}` : 'EMERGENCY_TRAUMA_PT',
        `MRN-${Math.floor(200000 + Math.random() * 700000)}`
      );
      onPatientAdded(p);
      hudAudio.playAlertChirp();
      if (onClose) onClose();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoadMultiCaseDemo = () => {
    setIsProcessing(true);
    hudAudio.playActionBeep('select');
    try {
      // Load 3 patients with different urgency levels to show ranking
      const p1 = generatePatientTriageRecord(
        generatePresetVolume('case-edh-01'),
        'PATIENT_A_TRAUMA (EDH)',
        'MRN-849201'
      );
      const p2 = generatePatientTriageRecord(
        generatePresetVolume('case-sdh-02'),
        'PATIENT_B_FALL (SDH)',
        'MRN-849202'
      );
      const p3 = generatePatientTriageRecord(
        generatePresetVolume('case-normal-05'),
        'PATIENT_C_HEADACHE (NORMAL)',
        'MRN-849203'
      );
      onMultiplePatientsAdded([p1, p2, p3]);
      hudAudio.playAlertChirp();
      if (onClose) onClose();
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="relative w-full max-w-2xl bg-[#FFFDFB] border border-[#071B55]/15 rounded-2xl p-6 shadow-2xl flex flex-col gap-5 text-[#071B55]">
        {/* Close button if not initial blocking screen */}
        {!isInitialScreen && onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl hover:bg-[#EAF5FF] text-[#071B55] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[#071B55]/10 pb-4">
          <div className="w-10 h-10 rounded-xl bg-[#EAF5FF] flex items-center justify-center text-[#071B55] shadow-sm">
            <UserPlus className="w-5 h-5 text-[#071B55]" />
          </div>
          <div>
            <div className="text-base font-bold text-[#071B55] tracking-tight font-heading">
              Patient Scan Ingestion
            </div>
            <div className="text-xs text-[#071B55]/60">
              Upload .nii, .nii.gz, or .dcm brain CT scans for instant multi-axis CAD triage
            </div>
          </div>
        </div>

        {/* Error notice */}
        {errorMsg && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FFF1EB] border border-[#FF554B]/30 text-xs text-[#FF554B]">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-[#FF554B]" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Patient Details Input */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-[#071B55]/80 mb-1">Patient Name / Identifier</label>
            <input
              type="text"
              placeholder="e.g. John Doe"
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="w-full bg-white border border-[#071B55]/20 rounded-xl px-3 py-2 text-[#071B55] focus:outline-none focus:border-[#071B55] shadow-2xs"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#071B55]/80 mb-1">Medical Record Number (MRN)</label>
            <input
              type="text"
              placeholder="e.g. MRN-894201"
              value={mrn}
              onChange={(e) => setMrn(e.target.value)}
              className="w-full bg-white border border-[#071B55]/20 rounded-xl px-3 py-2 text-[#071B55] focus:outline-none focus:border-[#071B55] shadow-2xs"
            />
          </div>
        </div>

        {/* File Dropzone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            setIsDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) handleFiles(e.dataTransfer.files);
          }}
          onClick={() => fileInputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
            isDragging
              ? 'border-[#071B55] bg-[#EAF5FF] shadow-md'
              : 'border-[#071B55]/25 bg-[#EAF5FF]/40 hover:border-[#071B55]/50 hover:bg-[#EAF5FF]'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".nii,.gz,.nii.gz,.dcm,.dicom"
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
            }}
            className="hidden"
          />

          <Upload className="w-10 h-10 text-[#071B55] mb-2 animate-bounce" />
          <div className="text-sm font-bold text-[#071B55] font-heading">
            {isProcessing ? 'Processing & Extracting Voxel Slices...' : 'Click or Drag & Drop Brain CT Scans Here'}
          </div>
          <div className="text-xs text-[#071B55]/60 mt-1 text-center">
            Supports .nii, .nii.gz, .dcm files (Upload multiple patients at once to rank emergency queue)
          </div>
        </div>

        {/* Quick Demo Option */}
        <div className="pt-3 border-t border-[#071B55]/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <span className="text-[11px] text-[#071B55]/60">Don't have a scan file ready?</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleLoadMultiCaseDemo}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl bg-[#071B55] hover:bg-[#0c2b85] text-white text-xs font-semibold shadow-sm transition-all"
            >
              Load 3 Patients for Triage Ranking
            </button>
            <button
              type="button"
              onClick={() => handleQuickLoadPreset('case-edh-01')}
              disabled={isProcessing}
              className="px-3 py-2 rounded-xl bg-white border border-[#071B55]/20 hover:bg-[#EAF5FF] text-[#071B55] text-xs font-semibold shadow-2xs transition-all"
            >
              Load Acute ICH Case
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
