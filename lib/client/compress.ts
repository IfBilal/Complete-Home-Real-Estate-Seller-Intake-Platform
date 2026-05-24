"use client";

const MAX_VIDEO_BYTES    = 150 * 1024 * 1024; // 150 MB hard limit
const VIDEO_WARNING_MB   = 100;
const IMAGE_MAX_PX       = 1600;
const IMAGE_QUALITY      = 0.82;

export interface VideoSizeCheck {
  oversized: boolean;
  sizeMB:    number;
}

export function checkVideoSize(file: File): VideoSizeCheck {
  const sizeMB = Math.round(file.size / 1024 / 1024);
  return {
    oversized: file.size > MAX_VIDEO_BYTES,
    sizeMB,
  };
}

export async function compressImage(file: File): Promise<File> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img  = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      let { width, height } = img;
      if (width > IMAGE_MAX_PX || height > IMAGE_MAX_PX) {
        const ratio = Math.min(IMAGE_MAX_PX / width, IMAGE_MAX_PX / height);
        width  = Math.round(width  * ratio);
        height = Math.round(height * ratio);
      }

      const canvas = document.createElement("canvas");
      canvas.width  = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(file);

      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        blob => {
          if (!blob) return resolve(file);
          const compressed = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
          resolve(compressed.size < file.size ? compressed : file);
        },
        "image/jpeg",
        IMAGE_QUALITY
      );
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
}
