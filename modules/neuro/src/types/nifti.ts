export interface NiftiHeader {
  dims: [number, number, number, number]; // dim[1]=X, dim[2]=Y, dim[3]=Z
  datatype: number;
  bitpix: number;
  pixDims: [number, number, number, number]; // voxel spacing in mm [unused, dx, dy, dz]
  sclSlope: number;
  sclInter: number;
  voxOffset: number;
  descrip: string;
  isLittleEndian: boolean;
}

export interface VolumeData {
  dimX: number;
  dimY: number;
  dimZ: number;
  voxelData: Int16Array;
  minHU: number;
  maxHU: number;
  fileName: string;
  fileSizeBytes: number;
  pixelSpacing: [number, number, number]; // [dx, dy, dz] in mm
  isPreset?: boolean;
  presetCaseId?: string;
  hemorrhageGroundTruth?: {
    type: 'EDH' | 'SDH' | 'SAH' | 'IPH' | 'IVH' | 'NONE';
    subtypeName: string;
    description: string;
    location: string;
    estimatedVolumeMl: number;
    recommendedSlices: number[];
  };
}

export type SliceOrientation = 'AXIAL' | 'CORONAL' | 'SAGITTAL';

export interface WindowPreset {
  id: string;
  name: string;
  width: number;
  level: number;
  description: string;
  badge: string;
}

export interface DetectedHemorrhageStats {
  hyperdenseVoxelCount: number;
  estimatedVolumeMl: number;
  peakHU: number;
  meanHU: number;
  region: string;
  type: 'EDH' | 'SDH' | 'SAH' | 'IPH' | 'IVH' | 'NONE';
  peakSliceIndex: number;
  sliceVoxelCounts: number[];
}

export interface ICHSubtypePrediction {
  name: string;
  probability: number; // 0 - 100
  present: boolean;
  criteria: string;
}

export interface ICHAnalysisResult {
  triageStatus: 'CRITICAL' | 'URGENT' | 'CLINICAL_REVIEW' | 'NORMAL';
  hemorrhageDetected: boolean;
  overallConfidenceScore: number;
  primaryHemorrhageSubtype: string;
  subtypes: ICHSubtypePrediction[];
  radiologicalFindings: string[];
  massEffect: {
    midlineShiftMm: number;
    ventricleEffacement: boolean;
    sulcalEffacement: boolean;
    herniationRisk: 'HIGH' | 'MODERATE' | 'LOW' | 'NONE';
  };
  estimatedVolumeMl: number;
  anatomicalLocation: string;
  recommendedEmergencyActions: string[];
  clinicalImpression: string;
  source?: string;
}

export interface CaliperMeasurement {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  distanceMm: number;
}

export interface AlertSpot {
  id: string;
  sliceZ: number;
  voxelX: number;
  voxelY: number;
  hu: number;
  label: string;
  type: 'BLEED_CORE' | 'EXTRAVASATION_SPOT' | 'MASS_EFFECT_SHIFT' | 'PERILESIONAL_EDEMA';
  severity: 'CRITICAL' | 'WARNING';
}

export interface PatientRecord {
  id: string;
  patientName: string;
  medicalRecordNumber: string;
  age: number;
  gender: string;
  scanTime: string;
  fileName: string;
  volume: VolumeData;
  triageLevel: 'CRITICAL' | 'URGENT' | 'OBSERVATION' | 'NORMAL';
  urgencyRank: number;
  triageScore: number;
  hemorrhageDetected: boolean;
  primarySubtype: string;
  volumeMl: number;
  midlineShiftMm: number;
  location: string;
  alertSpots: AlertSpot[];
  findings: string[];
  gcs?: number; // Glasgow Coma Scale (3 - 15)
}
