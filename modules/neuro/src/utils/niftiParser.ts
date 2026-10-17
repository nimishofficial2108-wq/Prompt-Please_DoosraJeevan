import { inflate } from 'pako';
import { NiftiHeader, VolumeData } from '../types/nifti';

/**
 * Checks if the buffer is gzip-compressed (magic bytes 0x1F, 0x8B)
 */
export function isGzip(buffer: Uint8Array): boolean {
  return buffer.length > 2 && buffer[0] === 0x1f && buffer[1] === 0x8b;
}

/**
 * Decompresses gzip buffer if necessary
 */
export function maybeDecompress(buffer: ArrayBuffer | Uint8Array): Uint8Array {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  if (isGzip(u8)) {
    try {
      return inflate(u8);
    } catch (err) {
      console.error('Failed to decompress gzip buffer with pako, trying raw:', err);
      return u8;
    }
  }
  return u8;
}

/**
 * Parses NIfTI-1 format header from decompressed Uint8Array
 */
export function parseNiftiHeader(buffer: Uint8Array): NiftiHeader {
  const dataView = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);

  let isLittleEndian = true;
  let sizeofHdr = dataView.getInt32(0, true);

  if (sizeofHdr !== 348) {
    // Try big-endian
    sizeofHdr = dataView.getInt32(0, false);
    if (sizeofHdr === 348) {
      isLittleEndian = false;
    } else {
      throw new Error(`Invalid NIfTI header size: ${sizeofHdr}. Expected 348 bytes.`);
    }
  }

  // dim array is at byte offset 40 (int16[8])
  const dims: [number, number, number, number] = [
    dataView.getInt16(40 + 0 * 2, isLittleEndian),
    dataView.getInt16(40 + 1 * 2, isLittleEndian),
    dataView.getInt16(40 + 2 * 2, isLittleEndian),
    dataView.getInt16(40 + 3 * 2, isLittleEndian),
  ];

  const datatype = dataView.getInt16(70, isLittleEndian);
  const bitpix = dataView.getInt16(72, isLittleEndian);

  // pixdim array is at offset 76 (float32[8])
  const pixDims: [number, number, number, number] = [
    dataView.getFloat32(76 + 0 * 4, isLittleEndian),
    dataView.getFloat32(76 + 1 * 4, isLittleEndian),
    dataView.getFloat32(76 + 2 * 4, isLittleEndian),
    dataView.getFloat32(76 + 3 * 4, isLittleEndian),
  ];

  let voxOffset = dataView.getFloat32(108, isLittleEndian);
  if (voxOffset < 352) {
    voxOffset = 352;
  }

  let sclSlope = dataView.getFloat32(112, isLittleEndian);
  let sclInter = dataView.getFloat32(116, isLittleEndian);

  if (isNaN(sclSlope) || sclSlope === 0) {
    sclSlope = 1.0;
  }
  if (isNaN(sclInter)) {
    sclInter = 0.0;
  }

  // Description at offset 148 (char[80])
  let descrip = '';
  for (let i = 0; i < 80; i++) {
    const charCode = dataView.getUint8(148 + i);
    if (charCode === 0) break;
    descrip += String.fromCharCode(charCode);
  }

  return {
    dims,
    datatype,
    bitpix,
    pixDims,
    sclSlope,
    sclInter,
    voxOffset: Math.round(voxOffset),
    descrip,
    isLittleEndian,
  };
}

/**
 * Parses full NIfTI file into volumetric HU data
 */
export function parseNiftiFile(rawBuffer: ArrayBuffer | Uint8Array, fileName: string): VolumeData {
  const decompressed = maybeDecompress(rawBuffer);
  const header = parseNiftiHeader(decompressed);

  const dimX = Math.max(1, header.dims[1]);
  const dimY = Math.max(1, header.dims[2]);
  const dimZ = Math.max(1, header.dims[3]);
  const totalVoxels = dimX * dimY * dimZ;

  const dataView = new DataView(
    decompressed.buffer,
    decompressed.byteOffset,
    decompressed.byteLength
  );

  const voxels = new Int16Array(totalVoxels);
  let minHU = Infinity;
  let maxHU = -Infinity;

  const offset = header.voxOffset;
  const le = header.isLittleEndian;
  const slope = header.sclSlope;
  const inter = header.sclInter;

  // Read voxels according to NIfTI datatype code
  // 2: uint8, 4: int16, 512: uint16, 8: int32, 16: float32
  let voxelIdx = 0;

  if (header.datatype === 2) {
    // UINT8
    for (let i = 0; i < totalVoxels; i++) {
      const bytePos = offset + i;
      if (bytePos < decompressed.length) {
        const raw = decompressed[bytePos];
        const hu = Math.round(raw * slope + inter);
        voxels[voxelIdx++] = hu;
        if (hu < minHU) minHU = hu;
        if (hu > maxHU) maxHU = hu;
      } else {
        voxels[voxelIdx++] = -1000;
      }
    }
  } else if (header.datatype === 4) {
    // INT16
    for (let i = 0; i < totalVoxels; i++) {
      const bytePos = offset + i * 2;
      if (bytePos + 1 < decompressed.length) {
        const raw = dataView.getInt16(bytePos, le);
        const hu = Math.round(raw * slope + inter);
        voxels[voxelIdx++] = hu;
        if (hu < minHU) minHU = hu;
        if (hu > maxHU) maxHU = hu;
      } else {
        voxels[voxelIdx++] = -1000;
      }
    }
  } else if (header.datatype === 512) {
    // UINT16
    for (let i = 0; i < totalVoxels; i++) {
      const bytePos = offset + i * 2;
      if (bytePos + 1 < decompressed.length) {
        const raw = dataView.getUint16(bytePos, le);
        const hu = Math.round(raw * slope + inter);
        voxels[voxelIdx++] = hu;
        if (hu < minHU) minHU = hu;
        if (hu > maxHU) maxHU = hu;
      } else {
        voxels[voxelIdx++] = -1000;
      }
    }
  } else if (header.datatype === 16) {
    // FLOAT32
    for (let i = 0; i < totalVoxels; i++) {
      const bytePos = offset + i * 4;
      if (bytePos + 3 < decompressed.length) {
        const raw = dataView.getFloat32(bytePos, le);
        const hu = Math.round(raw * slope + inter);
        voxels[voxelIdx++] = hu;
        if (hu < minHU) minHU = hu;
        if (hu > maxHU) maxHU = hu;
      } else {
        voxels[voxelIdx++] = -1000;
      }
    }
  } else {
    // Default fallback try int16
    for (let i = 0; i < totalVoxels; i++) {
      const bytePos = offset + i * 2;
      if (bytePos + 1 < decompressed.length) {
        const raw = dataView.getInt16(bytePos, le);
        const hu = Math.round(raw * slope + inter);
        voxels[voxelIdx++] = hu;
        if (hu < minHU) minHU = hu;
        if (hu > maxHU) maxHU = hu;
      } else {
        voxels[voxelIdx++] = -1000;
      }
    }
  }

  if (minHU === Infinity) minHU = -1024;
  if (maxHU === -Infinity) maxHU = 3071;

  const dx = Math.abs(header.pixDims[1]) || 1.0;
  const dy = Math.abs(header.pixDims[2]) || 1.0;
  const dz = Math.abs(header.pixDims[3]) || 2.5;

  return {
    dimX,
    dimY,
    dimZ,
    voxelData: voxels,
    minHU,
    maxHU,
    fileName,
    fileSizeBytes: rawBuffer.byteLength,
    pixelSpacing: [dx, dy, dz],
  };
}

/**
 * Serializes a VolumeData into a valid NIfTI-1 binary buffer (.nii)
 * Useful for exporting synthetic scans or saving patient volumes
 */
export function exportToNifti(volume: VolumeData): Uint8Array {
  const totalVoxels = volume.dimX * volume.dimY * volume.dimZ;
  const headerSize = 348;
  const voxOffset = 352;
  const totalBytes = voxOffset + totalVoxels * 2; // Int16

  const buffer = new ArrayBuffer(totalBytes);
  const dataView = new DataView(buffer);
  const u8 = new Uint8Array(buffer);

  // sizeof_hdr
  dataView.setInt32(0, 348, true);

  // dim[0..7]
  dataView.setInt16(40, 3, true); // 3 dimensions
  dataView.setInt16(42, volume.dimX, true);
  dataView.setInt16(44, volume.dimY, true);
  dataView.setInt16(46, volume.dimZ, true);
  dataView.setInt16(48, 1, true);

  // datatype: 4 = INT16
  dataView.setInt16(70, 4, true);
  // bitpix: 16
  dataView.setInt16(72, 16, true);

  // pixdim
  dataView.setFloat32(76, 0.0, true);
  dataView.setFloat32(80, volume.pixelSpacing[0], true);
  dataView.setFloat32(84, volume.pixelSpacing[1], true);
  dataView.setFloat32(88, volume.pixelSpacing[2], true);

  // vox_offset
  dataView.setFloat32(108, 352.0, true);
  // scl_slope & inter
  dataView.setFloat32(112, 1.0, true);
  dataView.setFloat32(116, 0.0, true);

  // magic string "n+1\0"
  u8[344] = 0x6e; // 'n'
  u8[345] = 0x2b; // '+'
  u8[346] = 0x31; // '1'
  u8[347] = 0x00;

  // Copy voxel data as Int16
  for (let i = 0; i < totalVoxels; i++) {
    dataView.setInt16(voxOffset + i * 2, volume.voxelData[i], true);
  }

  return u8;
}
