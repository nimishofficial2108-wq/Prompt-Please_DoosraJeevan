import { VolumeData } from '../types/nifti';

export interface PresetCaseMeta {
  id: string;
  name: string;
  shortName: string;
  triage: 'CRITICAL' | 'URGENT' | 'OBSERVATION' | 'NORMAL';
  triageColor: string;
  patientId: string;
  patientAgeGender: string;
  clinicalHistory: string;
  groundTruthType: 'EDH' | 'SDH' | 'SAH' | 'IPH' | 'IVH' | 'NONE';
  description: string;
  location: string;
  estimatedVolumeMl: number;
  keySlice: number;
}

export const PRESET_CASES: PresetCaseMeta[] = [
  {
    id: 'case-edh-01',
    name: 'CASE-01: Acute Epidural Hematoma (Right Temporal)',
    shortName: 'Acute EDH',
    triage: 'CRITICAL',
    triageColor: '#ef4444',
    patientId: 'PT-98041-TRAUMA',
    patientAgeGender: '27M // Motor Vehicle Collision',
    clinicalHistory: 'Head impact with brief loss of consciousness followed by a lucid interval and rapid neurological deterioration (GCS 9, right fixed pupil).',
    groundTruthType: 'EDH',
    description: 'Classic biconvex (lens-shaped) extra-axial hyperdense hematoma in right temporoparietal region. Bound by cranial suture lines.',
    location: 'Right Temporoparietal extra-axial epidural space',
    estimatedVolumeMl: 28.5,
    keySlice: 21,
  },
  {
    id: 'case-sdh-02',
    name: 'CASE-02: Acute Subdural Hematoma with 6mm Midline Shift',
    shortName: 'Acute SDH',
    triage: 'CRITICAL',
    triageColor: '#ef4444',
    patientId: 'PT-41902-FALL',
    patientAgeGender: '72F // Mechanical Fall at Home',
    clinicalHistory: 'Anticoagulated patient presenting with acute left hemiparesis and progressive obtundation after fall.',
    groundTruthType: 'SDH',
    description: 'Crescentic concavo-convex hyperattenuation tracking along the right fronto-temporo-parietal convexity crossing cranial sutures, exerting significant mass effect.',
    location: 'Right hemispheric subdural convexity',
    estimatedVolumeMl: 44.0,
    keySlice: 23,
  },
  {
    id: 'case-sah-03',
    name: 'CASE-03: Acute Aneurysmal Subarachnoid Hemorrhage',
    shortName: 'Acute SAH',
    triage: 'CRITICAL',
    triageColor: '#ef4444',
    patientId: 'PT-55219-THUNDER',
    patientAgeGender: '49F // Thunderclap Headache',
    clinicalHistory: 'Sudden onset "worst headache of life", photophobia, meningismus, blood pressure 195/105 mmHg.',
    groundTruthType: 'SAH',
    description: 'Extensive hyperdense cast outlining the suprasellar and interpeduncular cisterns, extending into bilateral Sylvian fissures (Fisher Grade 3).',
    location: 'Basal Cisterns & Bilateral Sylvian Fissures',
    estimatedVolumeMl: 16.2,
    keySlice: 17,
  },
  {
    id: 'case-iph-04',
    name: 'CASE-04: Hypertensive Basal Ganglia Bleed + Intraventricular (IVH)',
    shortName: 'IPH + IVH',
    triage: 'CRITICAL',
    triageColor: '#ef4444',
    patientId: 'PT-71034-HYPERTEN',
    patientAgeGender: '63M // Severe Hypertension 220/120',
    clinicalHistory: 'Sudden collapse during dinner with right hemiplegia, expressive aphasia, and stupor.',
    groundTruthType: 'IPH',
    description: 'Large oval hyperdense hematoma in left putamen/basal ganglia with surrounding hypoattenuating vasogenic edema and intraventricular rupture with blood fluid levels in lateral ventricles.',
    location: 'Left Basal Ganglia / Internal Capsule with IVH',
    estimatedVolumeMl: 36.4,
    keySlice: 19,
  },
  {
    id: 'case-normal-05',
    name: 'CASE-05: Normal Baseline Non-Contrast Head CT',
    shortName: 'Normal CT',
    triage: 'NORMAL',
    triageColor: '#22c55e',
    patientId: 'PT-12093-SCREEN',
    patientAgeGender: '35M // Uncomplicated Syncope',
    clinicalHistory: 'Evaluation for transient vasovagal syncope without head strike. Neurologically intact.',
    groundTruthType: 'NONE',
    description: 'Normal gray-white matter differentiation. Symmetrical cerebral hemispheres. Normal ventricular caliber, patent basal cisterns, no hemorrhage or mass effect.',
    location: 'Intracranial Vault (Unremarkable)',
    estimatedVolumeMl: 0.0,
    keySlice: 20,
  },
];

/**
 * Procedurally generates an anatomically authentic 3D Brain CT volume in Hounsfield Units (HU)
 */
export function generatePresetVolume(caseId: string): VolumeData {
  const caseMeta = PRESET_CASES.find((c) => c.id === caseId) || PRESET_CASES[0];

  const dimX = 128;
  const dimY = 128;
  const dimZ = 40;
  const totalVoxels = dimX * dimY * dimZ;
  const voxelData = new Int16Array(totalVoxels);

  const centerX = dimX / 2;
  const centerY = dimY / 2;

  // Noise generator for realistic CT beam hardening and parenchymal texture
  const pseudoNoise = (x: number, y: number, z: number) => {
    const s = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1; // -1 to 1
  };

  for (let z = 0; z < dimZ; z++) {
    // Normal normalized Z slice position: 0 (skull base) to 1 (vertex)
    const normZ = z / (dimZ - 1);

    // Anatomical radii for cranial oval at slice Z
    const skullFactor = Math.sin(Math.PI * (normZ * 0.85 + 0.08));
    const radX = (dimX * 0.38) * Math.max(0.2, skullFactor);
    const radY = (dimY * 0.44) * Math.max(0.2, skullFactor);

    const skullThickness = 3.8;
    const innerRadX = Math.max(1, radX - skullThickness);
    const innerRadY = Math.max(1, radY - skullThickness);

    // Midline shift calculation for SDH / mass effect cases
    let currentMidlineShift = 0;
    if (caseMeta.groundTruthType === 'SDH' && normZ > 0.3 && normZ < 0.8) {
      currentMidlineShift = -4.5 * Math.sin((normZ - 0.3) / 0.5 * Math.PI); // Shift leftward
    } else if (caseMeta.groundTruthType === 'EDH' && normZ > 0.35 && normZ < 0.75) {
      currentMidlineShift = -2.8 * Math.sin((normZ - 0.35) / 0.4 * Math.PI);
    } else if (caseMeta.groundTruthType === 'IPH' && normZ > 0.3 && normZ < 0.7) {
      currentMidlineShift = 3.2 * Math.sin((normZ - 0.3) / 0.4 * Math.PI);
    }

    for (let y = 0; y < dimY; y++) {
      for (let x = 0; x < dimX; x++) {
        const idx = z * (dimX * dimY) + y * dimX + x;

        const dx = x - centerX;
        const dy = y - centerY;

        // Normalized distance to skull ellipse
        const distSqOuter = (dx * dx) / (radX * radX) + (dy * dy) / (radY * radY);
        const distSqInner = (dx * dx) / (innerRadX * innerRadX) + (dy * dy) / (innerRadY * innerRadY);

        let hu = -1000; // Air outside head

        // Scalp soft tissue rim
        if (distSqOuter > 1.0 && distSqOuter <= 1.15) {
          hu = Math.round(35 + pseudoNoise(x, y, z) * 6);
        }
        // Cranial Skull Bone (High attenuation 600 - 1200 HU)
        else if (distSqOuter <= 1.0 && distSqInner > 1.0) {
          hu = Math.round(850 + pseudoNoise(x, y, z) * 200);
        }
        // Intracranial vault
        else if (distSqInner <= 1.0) {
          const depthFromInner = 1.0 - Math.sqrt(distSqInner);

          // Cortical gray matter (outer band: 38-44 HU)
          // Cerebral white matter (deeper: 28-32 HU)
          const isCortex = depthFromInner < 0.15;
          const baseParenchyma = isCortex ? 39 : 30;
          hu = Math.round(baseParenchyma + pseudoNoise(x, y, z) * 4);

          // Interhemispheric fissure & Falx Cerebri (along X = centerX + shift)
          const distToFalx = Math.abs(x - (centerX + currentMidlineShift));
          if (distToFalx < 1.2 && normZ > 0.25) {
            hu = Math.round(48 + pseudoNoise(x, y, z) * 4); // Falx hyperattenuation
          }

          // Ventricular System (CSF attenuation: 4 - 12 HU)
          // Lateral ventricles appear predominantly between slice z = 14 to 28
          if (normZ >= 0.32 && normZ <= 0.72) {
            const ventZ = (normZ - 0.32) / 0.40;
            const ventSpread = Math.sin(ventZ * Math.PI);

            // Right Lateral Ventricle (subject's right is image left, X > centerX)
            const rightVentX = centerX + currentMidlineShift + 7 * ventSpread;
            const rightVentY = centerY - 2 + (y - centerY) * 0.3;
            const distRightVent =
              Math.pow((x - rightVentX) / (4.5 * ventSpread), 2) +
              Math.pow((y - rightVentY) / (12 * ventSpread), 2);

            // Left Lateral Ventricle
            const leftVentX = centerX + currentMidlineShift - 7 * ventSpread;
            const leftVentY = centerY - 2 + (y - centerY) * 0.3;
            // Effacement check for mass effect: ipsilateral ventricle compressed
            const rightEffaced = caseMeta.groundTruthType === 'SDH' || caseMeta.groundTruthType === 'EDH';
            const leftEffaced = caseMeta.groundTruthType === 'IPH';

            const effaceScaleR = rightEffaced ? 0.35 : 1.0;
            const effaceScaleL = leftEffaced ? 0.30 : 1.0;

            const distRV =
              Math.pow((x - rightVentX) / (Math.max(1.2, 4.5 * ventSpread * effaceScaleR)), 2) +
              Math.pow((y - rightVentY) / (Math.max(2, 12 * ventSpread * effaceScaleR)), 2);

            const distLV =
              Math.pow((x - leftVentX) / (Math.max(1.2, 4.5 * ventSpread * effaceScaleL)), 2) +
              Math.pow((y - leftVentY) / (Math.max(2, 12 * ventSpread * effaceScaleL)), 2);

            if (distRV <= 1.0 || distLV <= 1.0) {
              hu = Math.round(8 + pseudoNoise(x, y, z) * 3); // CSF

              // If IVH (Intraventricular Hemorrhage present), acute blood layers dependently in occipital horns
              if (caseMeta.groundTruthType === 'IPH' && y > centerY + 4) {
                hu = Math.round(62 + pseudoNoise(x, y, z) * 5); // Blood fluid level in ventricle
              }
            }
          }

          // Basal Cisterns (suprasellar star, prepontine) at lower cuts z = 12 to 20
          if (normZ >= 0.28 && normZ <= 0.48) {
            const distCistern = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY + 3, 2));
            if (distCistern < 6.5) {
              if (caseMeta.groundTruthType === 'SAH') {
                // Blood casting the basal cisterns in SAH! 55 - 75 HU
                hu = Math.round(64 + pseudoNoise(x, y, z) * 7);
              } else {
                hu = Math.round(6 + pseudoNoise(x, y, z) * 3); // Normal CSF
              }
            }

            // Sylvian fissures in SAH
            if (caseMeta.groundTruthType === 'SAH') {
              const sylvianR = Math.abs((x - (centerX + 18)) * 0.6 + (y - centerY) * 0.4);
              const sylvianL = Math.abs((x - (centerX - 18)) * 0.6 - (y - centerY) * 0.4);
              if (sylvianR < 2.5 || sylvianL < 2.5) {
                if (distSqInner < 0.9) {
                  hu = Math.round(66 + pseudoNoise(x, y, z) * 6); // Acute blood in Sylvian fissures
                }
              }
            }
          }

          // INTRACRANIAL HEMORRHAGE INJECTIONS BASED ON CLINICAL CASE:

          // 1. EPIDURAL HEMATOMA (EDH): Biconvex lens along inner skull table (Right temporoparietal)
          if (caseMeta.groundTruthType === 'EDH' && normZ >= 0.35 && normZ <= 0.72) {
            const edhCenterZ = 0.52;
            const zWeight = 1.0 - Math.abs(normZ - edhCenterZ) / 0.22;
            if (zWeight > 0) {
              const edhX = centerX + radX * 0.76;
              const edhY = centerY + radY * 0.05;
              const distEdh = Math.sqrt(Math.pow(x - edhX, 2) + Math.pow(y - edhY, 2));
              // Biconvex lens thickness extending into brain from skull
              const distFromSkullEdge = Math.abs(Math.sqrt(distSqInner) - 0.96);
              const lensThickness = 12 * zWeight;

              if (distEdh < 18 * zWeight && distFromSkullEdge * radX < lensThickness && x > centerX + 10) {
                // Fresh hyperdense clot (65 - 82 HU) with subtle swirl sign of active extravasation
                const isSwirl = distEdh < 3.5 && zWeight > 0.7;
                hu = isSwirl ? Math.round(45 + pseudoNoise(x, y, z) * 4) : Math.round(72 + pseudoNoise(x, y, z) * 6);
              }
            }
          }

          // 2. SUBDURAL HEMATOMA (SDH): Crescentic concavo-convex collection along right hemisphere
          if (caseMeta.groundTruthType === 'SDH' && normZ >= 0.28 && normZ <= 0.82) {
            const sdhCenterZ = 0.55;
            const zWeight = 1.0 - Math.abs(normZ - sdhCenterZ) / 0.32;
            if (zWeight > 0) {
              // Crescent along right lateral periphery
              const distFromInnerPeriphery = (1.0 - Math.sqrt(distSqInner)) * radX;
              const angle = Math.atan2(y - centerY, x - centerX);
              // Spanning anterior to posterior along right convexity (-PI/3 to +PI/3)
              const isRightConvexity = x > centerX + 12 && Math.abs(angle) < 1.35;

              if (isRightConvexity && distFromInnerPeriphery < 9.5 * zWeight) {
                hu = Math.round(70 + pseudoNoise(x, y, z) * 6); // Acute hyperdense SDH
              } else if (isRightConvexity && distFromInnerPeriphery < 13.5 * zWeight) {
                // Sulcal effacement / cortical edema margin
                hu = Math.round(24 + pseudoNoise(x, y, z) * 4);
              }
            }
          }

          // 4. INTRAPARENCHYMAL HEMORRHAGE (IPH): Left basal ganglia hematoma with edema ring
          if (caseMeta.groundTruthType === 'IPH' && normZ >= 0.32 && normZ <= 0.68) {
            const iphCenterZ = 0.48;
            const zWeight = 1.0 - Math.abs(normZ - iphCenterZ) / 0.20;
            if (zWeight > 0) {
              const iphCenterX = centerX - 16; // Left basal ganglia
              const iphCenterY = centerY - 1;
              const distIPH = Math.sqrt(Math.pow(x - iphCenterX, 2) + Math.pow(y - iphCenterY, 2));
              const hematomaRadius = 11.5 * zWeight;
              const edemaRadius = 16.0 * zWeight;

              if (distIPH <= hematomaRadius) {
                hu = Math.round(75 + pseudoNoise(x, y, z) * 7); // Dense hematoma clot (68-82 HU)
              } else if (distIPH <= edemaRadius) {
                hu = Math.round(22 + pseudoNoise(x, y, z) * 3); // Hypodense perihematomal edema rim (18-25 HU)
              }
            }
          }
        }

        voxelData[idx] = hu;
      }
    }
  }

  return {
    dimX,
    dimY,
    dimZ,
    voxelData,
    minHU: -1000,
    maxHU: 1100,
    fileName: `${caseMeta.patientId}_CT_HEAD_VOL.nii`,
    fileSizeBytes: totalVoxels * 2 + 352,
    pixelSpacing: [1.2, 1.2, 3.0],
    isPreset: true,
    presetCaseId: caseMeta.id,
    hemorrhageGroundTruth: {
      type: caseMeta.groundTruthType,
      subtypeName: caseMeta.shortName,
      description: caseMeta.description,
      location: caseMeta.location,
      estimatedVolumeMl: caseMeta.estimatedVolumeMl,
      recommendedSlices: [caseMeta.keySlice - 2, caseMeta.keySlice, caseMeta.keySlice + 2],
    },
  };
}

/**
 * Common standard radiological CT Window / Level presets
 */
export const WINDOW_PRESETS = [
  {
    id: 'hemorrhage',
    name: 'HEMORRHAGE / STROKE',
    width: 130,
    level: 50,
    description: 'High sensitivity for acute hyperdense blood against cerebral parenchyma',
    badge: 'ICH OPTIMIZED',
  },
  {
    id: 'brain',
    name: 'BRAIN PARENCHYMA',
    width: 80,
    level: 40,
    description: 'Optimal contrast between cortical gray matter and central white matter',
    badge: 'STANDARD',
  },
  {
    id: 'subdural',
    name: 'SUBDURAL / EXTRA-AXIAL',
    width: 200,
    level: 75,
    description: 'Differentiates acute hematoma from adjacent high-density skull inner table',
    badge: 'EXTRA-AXIAL',
  },
  {
    id: 'bone',
    name: 'BONE / CALVARIUM',
    width: 2000,
    level: 500,
    description: 'Detects linear skull fractures, suture diastasis, and facial fractures',
    badge: 'FRACTURE',
  },
  {
    id: 'custom',
    name: 'CUSTOM HUD W/L',
    width: 100,
    level: 45,
    description: 'User-specified interactive window width and level sliders',
    badge: 'MANUAL',
  },
];
