/**
 * Image compression utility to prevent browser LocalStorage QuotaExceededError.
 * Compresses raw camera captures and uploaded photos to lightweight JPEG thumbnails (~20-40 KB).
 */

export async function compressImage(
  input: File | string,
  maxWidth = 480,
  maxHeight = 480,
  quality = 0.65
): Promise<string> {
  return new Promise((resolve, reject) => {
    let sourceUrl = '';
    let isCreatedBlobUrl = false;

    if (typeof input === 'string') {
      if (!input.startsWith('data:image/')) {
        // Already a normal URL or empty
        return resolve(input);
      }
      sourceUrl = input;
    } else {
      sourceUrl = URL.createObjectURL(input);
      isCreatedBlobUrl = true;
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        let width = img.width || 480;
        let height = img.height || 480;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = Math.max(width, 1);
        canvas.height = Math.max(height, 1);

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          if (isCreatedBlobUrl) URL.revokeObjectURL(sourceUrl);
          return resolve(typeof input === 'string' ? input : '');
        }

        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL('image/jpeg', quality);

        if (isCreatedBlobUrl) URL.revokeObjectURL(sourceUrl);
        resolve(compressed);
      } catch (err) {
        if (isCreatedBlobUrl) URL.revokeObjectURL(sourceUrl);
        // Fallback: return original if canvas fails
        resolve(typeof input === 'string' ? input : '');
      }
    };

    img.onerror = () => {
      if (isCreatedBlobUrl) URL.revokeObjectURL(sourceUrl);
      resolve(typeof input === 'string' ? input : '');
    };

    img.src = sourceUrl;
  });
}

/**
 * Strips or downsamples heavy base64 images from farmer/voucher objects
 * if local storage quota is being exceeded.
 */
export function sanitizeRecordForStorage<T>(data: T): T {
  if (!data) return data;
  if (!Array.isArray(data)) return data;

  return data.map((item) => {
    if (!item || typeof item !== 'object') return item;
    const copy = { ...item } as any;

    // If photoUrl is an uncompressed base64 (> 60KB), prune or truncate it
    if (typeof copy.photoUrl === 'string' && copy.photoUrl.length > 70000) {
      copy.photoUrl = '';
    }
    if (typeof copy.aadhaarFrontUrl === 'string' && copy.aadhaarFrontUrl.length > 70000) {
      copy.aadhaarFrontUrl = '';
    }
    if (typeof copy.aadhaarBackUrl === 'string' && copy.aadhaarBackUrl.length > 70000) {
      copy.aadhaarBackUrl = '';
    }
    if (typeof copy.farmerPhotoUrl === 'string' && copy.farmerPhotoUrl.length > 70000) {
      copy.farmerPhotoUrl = '';
    }
    if (Array.isArray(copy.photos)) {
      copy.photos = copy.photos.filter((p: any) => typeof p === 'string' && p.length <= 70000);
    }
    return copy;
  }) as unknown as T;
}
