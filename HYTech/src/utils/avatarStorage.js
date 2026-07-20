const MAX_DIMENSION = 512;
const IMAGE_QUALITY = 0.78;

const loadImageFromFile = (file) =>
  new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to load image.'));
    };

    image.src = objectUrl;
  });

const toBlob = (canvas, type, quality) =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to create compressed image.'));
          return;
        }
        resolve(blob);
      },
      type,
      quality
    );
  });

export const compressAvatarImageToBase64 = async (file) => {
  const image = await loadImageFromFile(file);
  const longestSide = Math.max(image.width, image.height);
  const scale = longestSide > MAX_DIMENSION ? MAX_DIMENSION / longestSide : 1;

  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Unable to prepare image canvas.');
  }

  context.drawImage(image, 0, 0, width, height);

  // Preserve transparency for PNG/GIF/WebP by selecting output mime type
  const inputType = (file && file.type) || '';
  const preserveAlpha = inputType.includes('png') || inputType.includes('gif') || inputType.includes('webp');
  const mimeType = preserveAlpha ? 'image/png' : 'image/jpeg';
  // Convert to base64 string
  const base64 = mimeType === 'image/jpeg' ? canvas.toDataURL(mimeType, IMAGE_QUALITY) : canvas.toDataURL(mimeType);
  return {
    base64,
    width,
    height,
    originalSize: file.size,
  };
};
