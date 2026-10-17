import { VolumeData, SliceOrientation, WindowPreset, DetectedHemorrhageStats } from '../types/nifti';

export interface SliceDimension {
  width: number;
  height: number;
  maxIndex: number;
  aspectRatio: number;
  label: string;
}

export function getSliceDimensions(volume: VolumeData, orientation: SliceOrientation): SliceDimension {
  const [dx, dy, dz] = volume.pixelSpacing;

  switch (orientation) {
    case 'AXIAL':
      return {
        width: volume.dimX,
        height: volume.dimY,
        maxIndex: volume.dimZ - 1,
        aspectRatio: (volume.dimY * dy) / (volume.dimX * dx),
        label: 'AXIAL (TRANSVERSE - CRANIAL TO CAUDAL)',
      };
    case 'CORONAL':
      return {
        width: volume.dimX,
        height: volume.dimZ,
        maxIndex: volume.dimY - 1,
        aspectRatio: (volume.dimZ * dz) / (volume.dimX * dx),
        label: 'CORONAL (FRONTAL - ANTERIOR TO POSTERIOR)',
      };
    case 'SAGITTAL':
      return {
        width: volume.dimY,
        height: volume.dimZ,
        maxIndex: volume.dimX - 1,
        aspectRatio: (volume.dimZ * dz) / (volume.dimY * dy),
        label: 'SAGITTAL (MEDIAN - DEXTER TO SINISTER)',
      };
  }
}

/**
 * Gets the Hounsfield Unit of a specific voxel coordinate (x, y, z)
 */
export function getVoxelHU(volume: VolumeData, x: number, y: number, z: number): number {
  if (x < 0 || x >= volume.dimX || y < 0 || y >= volume.dimY || z < 0 || z >= volume.dimZ) {
    return -1000;
  }
  const idx = z * (volume.dimX * volume.dimY) + y * volume.dimX + x;
  return volume.voxelData[idx];
}

/**
 * Classifies tissue type based on standard CT Hounsfield Units (HU)
 */
export function classifyHUTissue(hu: number): { label: string; color: string; badge: string } {
  if (hu < -500) {
    return { label: 'AIR / SINUS', color: '#64748b', badge: 'VACUUM' };
  } else if (hu >= -120 && hu <= -30) {
    return { label: 'ADIPOSE / FAT TISSUE', color: '#fbbf24', badge: 'FAT' };
  } else if (hu > -30 && hu <= 18) {
    return { label: 'CEREBROSPINAL FLUID (CSF)', color: '#38bdf8', badge: 'CSF' };
  } else if (hu > 18 && hu <= 34) {
    return { label: 'CEREBRAL WHITE MATTER / EDEMA', color: '#818cf8', badge: 'WHITE MATTER' };
  } else if (hu > 34 && hu < 52) {
    return { label: 'CORTICAL GRAY MATTER', color: '#a78bfa', badge: 'GRAY MATTER' };
  } else if (hu >= 52 && hu <= 90) {
    return { label: 'ACUTE HEMORRHAGE / HEMATOMA', color: '#ef4444', badge: 'ALERT: BLOOD' };
  } else if (hu > 90 && hu <= 250) {
    return { label: 'CHOROID PLEXUS / CALCIFICATION', color: '#f59e0b', badge: 'CALCIUM' };
  } else {
    return { label: 'CALVARIAL SKULL BONE', color: '#f8fafc', badge: 'BONE' };
  }
}

/**
 * Renders a slice onto an ImageData object with windowing & hemorrhage overlay
 */
export function renderSliceToImageData(
  volume: VolumeData,
  orientation: SliceOrientation,
  sliceIdx: number,
  windowPreset: WindowPreset,
  showHemorrhageOverlay: boolean,
  invertColors: boolean = false
): ImageData {
  const { width, height } = getSliceDimensions(volume, orientation);
  const imgData = new ImageData(width, height);
  const data = imgData.data;

  const wMin = windowPreset.level - windowPreset.width / 2;
  const wWidth = Math.max(1, windowPreset.width);

  const { dimX, dimY, dimZ, voxelData } = volume;

  let pixelPos = 0;

  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      let vx = 0;
      let vy = 0;
      let vz = 0;

      if (orientation === 'AXIAL') {
        vx = col;
        vy = row;
        vz = sliceIdx;
      } else if (orientation === 'CORONAL') {
        vx = col;
        vy = sliceIdx;
        // CT slices standard: Z increases from bottom (skull base) to top (vertex)
        // Image rows top-to-bottom, so invert Z
        vz = dimZ - 1 - row;
      } else if (orientation === 'SAGITTAL') {
        vx = sliceIdx;
        vy = col;
        vz = dimZ - 1 - row;
      }

      const clampedX = Math.max(0, Math.min(dimX - 1, vx));
      const clampedY = Math.max(0, Math.min(dimY - 1, vy));
      const clampedZ = Math.max(0, Math.min(dimZ - 1, vz));

      const vIdx = clampedZ * (dimX * dimY) + clampedY * dimX + clampedX;
      const hu = voxelData[vIdx];

      // Window/level conversion to 0..255
      let val = Math.round(((hu - wMin) / wWidth) * 255);
      if (val < 0) val = 0;
      if (val > 255) val = 255;

      if (invertColors) {
        val = 255 - val;
      }

      let r = val;
      let g = val;
      let b = val;
      let a = 255;

      // Realistic Clinical CT Hemorrhage visualization
      // In true radiology CT data, acute blood is naturally hyperdense (brighter grayscale 54-85 HU)
      // Any CAD assistance overlay must be subtle and realistic, never cartoon-like neon red
      if (showHemorrhageOverlay && hu >= 54 && hu <= 88) {
        // Very subtle clinical warm tint (15-20% shift preserving natural CT texture)
        r = Math.min(255, Math.round(val * 0.85 + 42));
        g = Math.min(255, Math.round(val * 0.95 + 6));
        b = Math.min(255, Math.round(val * 0.9));
      }

      data[pixelPos] = r;
      data[pixelPos + 1] = g;
      data[pixelPos + 2] = b;
      data[pixelPos + 3] = a;

      pixelPos += 4;
    }
  }

  return imgData;
}

/**
 * Computes global volumetric hemorrhage statistics
 */
export function computeHemorrhageStats(volume: VolumeData): DetectedHemorrhageStats {
  const { dimX, dimY, dimZ, voxelData, pixelSpacing } = volume;
  const [dx, dy, dz] = pixelSpacing;
  const voxelVolumeMm3 = dx * dy * dz;

  let totalHyperdense = 0;
  let peakHU = -1000;
  let sumHU = 0;
  let peakSlice = Math.floor(dimZ / 2);
  let maxSliceCount = 0;

  const sliceVoxelCounts: number[] = new Array(dimZ).fill(0);

  const centerX = dimX / 2;
  const centerY = dimY / 2;

  // Approximate intracranial radius
  const maxRadiusSq = Math.pow(dimX * 0.42, 2);

  for (let z = 0; z < dimZ; z++) {
    let sliceCount = 0;
    for (let y = 0; y < dimY; y++) {
      for (let x = 0; x < dimX; x++) {
        // Stay within cranial cavity to avoid skull bone margins
        const dxC = x - centerX;
        const dyC = y - centerY;
        if (dxC * dxC + dyC * dyC > maxRadiusSq) continue;

        const idx = z * (dimX * dimY) + y * dimX + x;
        const hu = voxelData[idx];

        // Hyperdense acute clot (54 - 86 HU)
        if (hu >= 54 && hu <= 86) {
          sliceCount++;
          totalHyperdense++;
          sumHU += hu;
          if (hu > peakHU) peakHU = hu;
        }
      }
    }
    sliceVoxelCounts[z] = sliceCount;
    if (sliceCount > maxSliceCount) {
      maxSliceCount = sliceCount;
      peakSlice = z;
    }
  }

  const estimatedVolumeMl = (totalHyperdense * voxelVolumeMm3) / 1000.0;
  const meanHU = totalHyperdense > 0 ? Math.round(sumHU / totalHyperdense) : 0;

  // Determine likely clinical type from preset ground truth or heuristic
  const type = volume.hemorrhageGroundTruth?.type || (totalHyperdense > 100 ? 'IPH' : 'NONE');

  return {
    hyperdenseVoxelCount: totalHyperdense,
    estimatedVolumeMl: Math.round(estimatedVolumeMl * 10) / 10,
    peakHU: peakHU > 0 ? peakHU : 0,
    meanHU,
    region: volume.hemorrhageGroundTruth?.location || (totalHyperdense > 100 ? 'Intracranial Parenchyma' : 'Intracranial Vault'),
    type,
    peakSliceIndex: peakSlice,
    sliceVoxelCounts,
  };
}

/**
 * Converts current slice canvas to a base64 PNG data URL for Gemini AI analysis
 */
export function sliceToDataURL(
  volume: VolumeData,
  orientation: SliceOrientation,
  sliceIdx: number,
  windowPreset: WindowPreset
): string {
  const { width, height } = getSliceDimensions(volume, orientation);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  const imgData = renderSliceToImageData(volume, orientation, sliceIdx, windowPreset, false, false);
  ctx.putImageData(imgData, 0, 0);

  return canvas.toDataURL('image/png');
}
