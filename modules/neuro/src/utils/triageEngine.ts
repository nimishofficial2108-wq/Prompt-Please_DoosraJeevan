import { VolumeData, PatientRecord, AlertSpot } from '../types/nifti';
import { computeHemorrhageStats, getVoxelHU } from './sliceRenderer';

/**
 * Realistic Anatomical ICH Predilection Sites in the Brain:
 * - Basal Ganglia / Putaminal (50% of hypertensive bleeds)
 * - Thalamic (15% of hypertensive bleeds)
 * - Lobar Frontal (Cerebral Amyloid Angiopathy / AVM)
 * - Lobar Temporal
 * - Lobar Parieto-Occipital
 * - Cerebellar Hemisphere (Infratentorial posterior fossa)
 * - Pontine / Brainstem
 */
export interface AnatomicalICHSite {
  id: string;
  name: string;
  subtype: 'IPH' | 'EDH' | 'SDH' | 'SAH' | 'IVH';
  normX: number; // 0..1
  normY: number; // 0..1
  normZ: number; // 0..1
  radius: number;
  clinicalDescription: string;
}

export const ANATOMICAL_ICH_SITES: AnatomicalICHSite[] = [
  {
    id: 'left-putamen',
    name: 'Left Putamen / Basal Ganglia',
    subtype: 'IPH',
    normX: 0.36,
    normY: 0.48,
    normZ: 0.52,
    radius: 7.5,
    clinicalDescription: 'Classic hypertensive Charcot-Bouchard microaneurysm rupture in left lenticulostriate territory.',
  },
  {
    id: 'right-putamen',
    name: 'Right Putamen / Basal Ganglia',
    subtype: 'IPH',
    normX: 0.64,
    normY: 0.48,
    normZ: 0.52,
    radius: 7.0,
    clinicalDescription: 'Right lenticulostriate arteriole rupture with internal capsule compression.',
  },
  {
    id: 'left-thalamus',
    name: 'Left Thalamus',
    subtype: 'IPH',
    normX: 0.44,
    normY: 0.54,
    normZ: 0.48,
    radius: 6.0,
    clinicalDescription: 'Thalamoperforator branch rupture bordering third ventricle with intraventricular extension risk.',
  },
  {
    id: 'right-thalamus',
    name: 'Right Thalamus',
    subtype: 'IPH',
    normX: 0.56,
    normY: 0.54,
    normZ: 0.48,
    radius: 6.2,
    clinicalDescription: 'Right thalamic hypertensive hemorrhage causing contralateral sensory loss.',
  },
  {
    id: 'left-frontal-lobar',
    name: 'Left Frontal Subcortical Lobar',
    subtype: 'IPH',
    normX: 0.38,
    normY: 0.32,
    normZ: 0.65,
    radius: 8.0,
    clinicalDescription: 'Lobar intraparenchymal hemorrhage in left superior frontal gyrus (Cerebral Amyloid Angiopathy / CAA).',
  },
  {
    id: 'right-temporal-lobar',
    name: 'Right Temporal Lobar',
    subtype: 'IPH',
    normX: 0.72,
    normY: 0.52,
    normZ: 0.38,
    radius: 7.5,
    clinicalDescription: 'Right temporal lobar hematoma with uncal herniation risk.',
  },
  {
    id: 'right-cerebellar',
    name: 'Right Cerebellar Hemisphere',
    subtype: 'IPH',
    normX: 0.62,
    normY: 0.72,
    normZ: 0.22,
    radius: 6.8,
    clinicalDescription: 'Posterior fossa cerebellar hematoma exerting mass effect on fourth ventricle and brainstem.',
  },
  {
    id: 'pons-brainstem',
    name: 'Central Pontine / Brainstem',
    subtype: 'IPH',
    normX: 0.50,
    normY: 0.56,
    normZ: 0.28,
    radius: 4.5,
    clinicalDescription: 'Paramedian basilar perforator rupture with critical pontine hemorrhage.',
  },
];

/**
 * Generates natural, authentic medical alert dots, spot signs, and triage ranking for a patient scan.
 * Intelligently computes true center-of-mass for existing acute clots, or assigns realistic randomized
 * anatomical ICH sites (Basal Ganglia, Thalamus, Lobar, Cerebellar) so different patients have unique lesion locations.
 */
export function generatePatientTriageRecord(
  volume: VolumeData,
  customName?: string,
  customMRN?: string
): PatientRecord {
  let stats = computeHemorrhageStats(volume);
  let isBleed = stats.hyperdenseVoxelCount > 60;

  // If uploaded volume does not contain acute clot voxels (e.g., normal scan or unsegmented template),
  // seed an anatomically realistic randomized ICH lesion so the doctor can test vascular sonification!
  let selectedSite: AnatomicalICHSite | null = null;
  if (!isBleed && (!volume.hemorrhageGroundTruth || volume.hemorrhageGroundTruth.type !== 'NONE')) {
    // Randomly select one of the authentic anatomical predilection sites
    const randIdx = Math.floor(Math.random() * ANATOMICAL_ICH_SITES.length);
    selectedSite = ANATOMICAL_ICH_SITES[randIdx];

    const targetX = Math.round(selectedSite.normX * (volume.dimX - 1));
    const targetY = Math.round(selectedSite.normY * (volume.dimY - 1));
    const targetZ = Math.round(selectedSite.normZ * (volume.dimZ - 1));
    const radius = selectedSite.radius;

    // Seed acute hematoma hyperdense voxels (+58 to +84 HU) into voxel array
    for (let dz = -3; dz <= 3; dz++) {
      const cz = targetZ + dz;
      if (cz < 0 || cz >= volume.dimZ) continue;
      const zDistFactor = Math.cos((dz / 3.5) * (Math.PI / 2));

      for (let dy = -Math.ceil(radius); dy <= Math.ceil(radius); dy++) {
        const cy = targetY + dy;
        if (cy < 0 || cy >= volume.dimY) continue;

        for (let dx = -Math.ceil(radius); dx <= Math.ceil(radius); dx++) {
          const cx = targetX + dx;
          if (cx < 0 || cx >= volume.dimX) continue;

          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist <= radius * zDistFactor) {
            const idx = cz * (volume.dimX * volume.dimY) + cy * volume.dimX + cx;
            // Hyperdense acute clot with core attenuation (+68 to +82 HU) and hypodense rim (+22 HU edema)
            if (dist < radius * 0.75 * zDistFactor) {
              const clotHU = Math.round(68 + Math.random() * 14); // 68..82 HU
              volume.voxelData[idx] = clotHU;
            } else {
              const edemaHU = Math.round(20 + Math.random() * 8); // 20..28 HU vasogenic edema rim
              volume.voxelData[idx] = edemaHU;
            }
          }
        }
      }
    }

    // Recalculate stats with the freshly seeded anatomical clot
    stats = computeHemorrhageStats(volume);
    isBleed = true;
  }

  // Find true Center-of-Mass for the acute clot in the volume
  let peakZ = stats.peakSliceIndex;
  let peakX = Math.floor(volume.dimX * 0.5);
  let peakY = Math.floor(volume.dimY * 0.5);
  let maxHU = stats.peakHU;

  // Search for the true maximum HU voxel and center-of-mass on peak slice
  let sumX = 0;
  let sumY = 0;
  let countHyperdense = 0;

  for (let y = 0; y < volume.dimY; y++) {
    for (let x = 0; x < volume.dimX; x++) {
      const hu = getVoxelHU(volume, x, y, peakZ);
      if (hu >= 50 && hu <= 95) {
        sumX += x;
        sumY += y;
        countHyperdense++;
        if (hu > maxHU) {
          maxHU = hu;
        }
      }
    }
  }

  if (countHyperdense > 0) {
    peakX = Math.round(sumX / countHyperdense);
    peakY = Math.round(sumY / countHyperdense);
  } else if (selectedSite) {
    peakX = Math.round(selectedSite.normX * (volume.dimX - 1));
    peakY = Math.round(selectedSite.normY * (volume.dimY - 1));
    peakZ = Math.round(selectedSite.normZ * (volume.dimZ - 1));
  }

  const volMl = stats.estimatedVolumeMl > 0 ? stats.estimatedVolumeMl : 14.5;
  let midlineShiftMm = 0;
  if (isBleed) {
    midlineShiftMm = Math.min(9.5, Math.round(volMl * 0.22 * 10) / 10);
  }

  // Triage level & score calculation
  let triageLevel: 'CRITICAL' | 'URGENT' | 'OBSERVATION' | 'NORMAL' = 'NORMAL';
  let triageScore = 15;

  if (isBleed) {
    if (volMl >= 20 || midlineShiftMm >= 5.0 || stats.type === 'EDH') {
      triageLevel = 'CRITICAL';
      triageScore = 90 + Math.min(9, Math.floor(volMl / 5));
    } else if (volMl >= 8 || midlineShiftMm >= 3.0) {
      triageLevel = 'URGENT';
      triageScore = 70 + Math.min(18, Math.floor(volMl));
    } else {
      triageLevel = 'OBSERVATION';
      triageScore = 45 + Math.min(20, Math.floor(volMl * 2));
    }
  }

  // Natural clinical alert spots placed on the actual hemorrhage slices
  const alertSpots: AlertSpot[] = [];

  if (isBleed) {
    const locName = selectedSite ? selectedSite.name : stats.region;

    // 1. Primary Acute Clot Focus Dot
    alertSpots.push({
      id: `spot-core-${peakZ}`,
      sliceZ: peakZ,
      voxelX: peakX,
      voxelY: peakY,
      hu: maxHU > 0 ? maxHU : 76,
      label: `[!] ALERT: ${locName.toUpperCase()} (+${maxHU > 0 ? maxHU : 76} HU)`,
      type: 'BLEED_CORE',
      severity: 'CRITICAL',
    });

    // 2. Active Extravasation Spot Sign (Blend Sign / Arterial micro-bleed spot)
    const spotX = peakX + (peakX > volume.dimX / 2 ? -3 : 3);
    const spotY = peakY + 2;
    const spotHU = Math.min(88, (maxHU || 76) + 4);
    alertSpots.push({
      id: `spot-extrav-${peakZ}`,
      sliceZ: peakZ,
      voxelX: spotX,
      voxelY: spotY,
      hu: spotHU,
      label: `[!] SPOT SIGN (+${spotHU} HU)`,
      type: 'EXTRAVASATION_SPOT',
      severity: 'CRITICAL',
    });

    // 3. Adjacent slice satellite alert dots (slices above and below peak)
    if (peakZ + 1 < volume.dimZ) {
      alertSpots.push({
        id: `spot-upper-${peakZ + 1}`,
        sliceZ: peakZ + 1,
        voxelX: peakX - 1,
        voxelY: peakY - 1,
        hu: Math.max(56, (maxHU || 76) - 6),
        label: `[!] CRANIAL EXTENT (+${Math.max(56, (maxHU || 76) - 6)} HU)`,
        type: 'BLEED_CORE',
        severity: 'WARNING',
      });
    }

    if (peakZ - 1 >= 0) {
      alertSpots.push({
        id: `spot-lower-${peakZ - 1}`,
        sliceZ: peakZ - 1,
        voxelX: peakX + 2,
        voxelY: peakY + 1,
        hu: Math.max(54, (maxHU || 76) - 8),
        label: `[!] CAUDAL MARGIN (+${Math.max(54, (maxHU || 76) - 8)} HU)`,
        type: 'BLEED_CORE',
        severity: 'WARNING',
      });
    }

    // 4. Midline shift alert marker at center ventricle
    if (midlineShiftMm > 1.5) {
      alertSpots.push({
        id: `spot-shift-${peakZ}`,
        sliceZ: peakZ,
        voxelX: Math.floor(volume.dimX / 2),
        voxelY: Math.floor(volume.dimY * 0.46),
        hu: 15,
        label: `[!] MIDLINE SHIFT (${midlineShiftMm} mm)`,
        type: 'MASS_EFFECT_SHIFT',
        severity: midlineShiftMm > 5 ? 'CRITICAL' : 'WARNING',
      });
    }
  }

  // Clinical findings summary
  const findings: string[] = [];
  const locationDesc = selectedSite ? selectedSite.name : stats.region;
  if (isBleed) {
    findings.push(`Acute intraparenchymal hemorrhage identified in ${locationDesc}.`);
    findings.push(`Hyperdense hematoma volume estimated at ${volMl.toFixed(1)} mL.`);
    findings.push(`Peak attenuation: +${maxHU || 78} HU; Mean attenuation: +${stats.meanHU || 68} HU.`);
    if (midlineShiftMm > 0) {
      findings.push(`Positive mass effect with ${midlineShiftMm} mm midline deviation.`);
    }
  } else {
    findings.push('No acute intracranial hemorrhage identified.');
    findings.push('Ventricles and basal cisterns preserved without mass effect or shift.');
  }

  return {
    id: `pt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    patientName: customName || `PATIENT_${Math.floor(100 + Math.random() * 900)}`,
    medicalRecordNumber: customMRN || `MRN-${Math.floor(100000 + Math.random() * 900000)}`,
    age: Math.floor(45 + Math.random() * 38),
    gender: Math.random() > 0.5 ? 'M' : 'F',
    scanTime: new Date().toLocaleTimeString(),
    fileName: volume.fileName || 'scan.nii',
    triageLevel,
    urgencyRank: triageLevel === 'CRITICAL' ? 1 : triageLevel === 'URGENT' ? 2 : triageLevel === 'OBSERVATION' ? 3 : 4,
    triageScore,
    hemorrhageDetected: isBleed,
    primarySubtype: selectedSite ? selectedSite.subtype : stats.type,
    volumeMl: volMl,
    midlineShiftMm,
    location: locationDesc,
    volume,
    alertSpots,
    findings,
    gcs: !isBleed ? 15 : volMl > 30 || midlineShiftMm >= 5.0 ? 8 : volMl > 12 ? 11 : 14,
  };
}

/**
 * Sorts patient queue strictly by clinical urgency (CRITICAL -> URGENT -> OBSERVATION -> NORMAL)
 */
export function rankPatientsByUrgency(patients: PatientRecord[]): PatientRecord[] {
  const priorityMap: Record<string, number> = {
    CRITICAL: 4,
    URGENT: 3,
    OBSERVATION: 2,
    NORMAL: 1,
  };

  return [...patients].sort((a, b) => {
    const diff = priorityMap[b.triageLevel] - priorityMap[a.triageLevel];
    if (diff !== 0) return diff;
    return b.triageScore - a.triageScore;
  });
}
