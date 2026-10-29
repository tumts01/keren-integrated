/**
 * Utilitas kompresi gambar otomatis di sisi client (browser).
 * Didesain khusus untuk dokumen (seperti Kartu Keluarga / KK, bukti transfer, foto dokumen)
 * agar teks tetap tajam, terbaca jelas (tidak pecah/buram), dan ukuran file berkurang drastis
 * hingga di bawah batas maksimal (misal < 2.5 MB).
 */

export interface CompressOptions {
  /** Batas dimensi maksimal terpanjang (lebar / tinggi). Default: 2200px */
  maxDimension?: number;
  /** Kualitas awal JPEG (0.1 - 1.0). Default: 0.85 */
  initialQuality?: number;
  /** Batas maksimal ukuran file akhir dalam bytes. Default: 2.5 * 1024 * 1024 (2.5 MB) */
  maxFileSizeBytes?: number;
}

export interface CompressionResult {
  file: File;
  isCompressed: boolean;
  originalSize: number;
  compressedSize: number;
  ratioPercent: number;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return '0 B';
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 1024)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

/**
 * Kompresi gambar dokumen secara cerdas di browser.
 * Jika file bukan gambar (misal PDF), file asli dikembalikan tanpa perubahan.
 */
export async function compressDocumentImage(
  file: File,
  options: CompressOptions = {}
): Promise<CompressionResult> {
  const originalSize = file.size;
  const maxDimension = options.maxDimension || 2200;
  const initialQuality = options.initialQuality || 0.85;
  const maxFileSizeBytes = options.maxFileSizeBytes || 2.5 * 1024 * 1024;

  // Jika bukan gambar (misal PDF atau dokumen lain), jangan diproses canvas
  if (!file.type.startsWith('image/')) {
    return {
      file,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize,
      ratioPercent: 0,
    };
  }

  // Jika ukuran sudah sangat kecil (< 300KB) dan bertipe jpeg/png, tidak perlu kompresi ulang agresif
  // kecuali dimensinya raksasa (> 2500px)
  try {
    let sourceWidth = 0;
    let sourceHeight = 0;
    let drawSource: CanvasImageSource;

    // Gunakan createImageBitmap bila didukung (modern browser, menangani orientasi EXIF secara otomatis)
    if (typeof window !== 'undefined' && 'createImageBitmap' in window) {
      try {
        const bitmap = await (window as any).createImageBitmap(file, { imageOrientation: 'from-image' });
        sourceWidth = bitmap.width;
        sourceHeight = bitmap.height;
        drawSource = bitmap;
      } catch (errBitmap) {
        // Fallback jika createImageBitmap gagal memproses format tertentu
        drawSource = await loadImageElement(file);
        sourceWidth = (drawSource as HTMLImageElement).naturalWidth;
        sourceHeight = (drawSource as HTMLImageElement).naturalHeight;
      }
    } else {
      drawSource = await loadImageElement(file);
      sourceWidth = (drawSource as HTMLImageElement).naturalWidth;
      sourceHeight = (drawSource as HTMLImageElement).naturalHeight;
    }

    // Jika file sudah <= 1.5MB dan dimensi terpanjang <= maxDimension, file sudah aman
    if (originalSize <= 1.5 * 1024 * 1024 && Math.max(sourceWidth, sourceHeight) <= maxDimension) {
      return {
        file,
        isCompressed: false,
        originalSize,
        compressedSize: originalSize,
        ratioPercent: 0,
      };
    }

    // Hitung dimensi target dengan mempertahankan aspect ratio
    let targetWidth = sourceWidth;
    let targetHeight = sourceHeight;

    if (targetWidth > maxDimension || targetHeight > maxDimension) {
      if (targetWidth >= targetHeight) {
        targetHeight = Math.round((targetHeight * maxDimension) / targetWidth);
        targetWidth = maxDimension;
      } else {
        targetWidth = Math.round((targetWidth * maxDimension) / targetHeight);
        targetHeight = maxDimension;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      return {
        file,
        isCompressed: false,
        originalSize,
        compressedSize: originalSize,
        ratioPercent: 0,
      };
    }

    // Pengaturan smoothing tingkat tinggi agar teks/angka di KK tetap tajam
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(drawSource, 0, 0, targetWidth, targetHeight);

    // Iterasi kompresi JPEG sampai ukuran di bawah maxFileSizeBytes
    let currentQuality = initialQuality;
    let blob: Blob | null = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/jpeg', currentQuality);
      });

      if (!blob) break;

      // Jika ukuran blob sudah di bawah batas maksimal, berhenti
      if (blob.size <= maxFileSizeBytes) {
        break;
      }

      // Jika masih di atas batas, turunkan kualitas sedikit (tidak di bawah 0.70 agar teks tidak pecah)
      currentQuality = Math.max(0.70, currentQuality - 0.08);

      // Jika masih besar, kurangi dimensi sedikit
      if (currentQuality <= 0.70) {
        targetWidth = Math.round(targetWidth * 0.85);
        targetHeight = Math.round(targetHeight * 0.85);
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(drawSource, 0, 0, targetWidth, targetHeight);
      }
    }

    if (!blob) {
      return {
        file,
        isCompressed: false,
        originalSize,
        compressedSize: originalSize,
        ratioPercent: 0,
      };
    }

    // Jika hasil kompresi lebih kecil dari file asli atau file asli sebelumnya melebihi maxFileSizeBytes
    if (blob.size < originalSize || originalSize > maxFileSizeBytes) {
      const baseName = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      const cleanBaseName = baseName.replace(/[^a-zA-Z0-9_\-]/g, '_');
      const newFile = new File([blob], `${cleanBaseName}.jpg`, {
        type: 'image/jpeg',
        lastModified: Date.now(),
      });

      const ratio = Math.max(0, Math.round(((originalSize - blob.size) / originalSize) * 100));

      return {
        file: newFile,
        isCompressed: true,
        originalSize,
        compressedSize: blob.size,
        ratioPercent: ratio,
      };
    }

    return {
      file,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize,
      ratioPercent: 0,
    };
  } catch (error) {
    console.error('Error saat kompresi gambar:', error);
    return {
      file,
      isCompressed: false,
      originalSize,
      compressedSize: originalSize,
      ratioPercent: 0,
    };
  }
}

function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar'));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error('Gagal memuat elemen gambar'));
      img.onload = () => resolve(img);
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}
