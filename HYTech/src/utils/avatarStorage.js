import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import { auth, storage } from '../firebase';

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

/**
 * Downscale an image and upload it under userAvatars/{uid}/{folder}/{name}.
 * That path shape is what storage.rules already allows the owner to write, so
 * new folders need no rules change.
 */
const compressAndUpload = async (file, { folder, baseName }) => {
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
  if (!storage || !auth?.currentUser?.uid) {
    throw new Error('You must be signed in to upload a photo.');
  }
  const blob = await toBlob(canvas, mimeType, mimeType === 'image/jpeg' ? IMAGE_QUALITY : undefined);
  const extension = mimeType === 'image/png' ? 'png' : 'jpg';
  const path = `userAvatars/${auth.currentUser.uid}/${folder}/${baseName}.${extension}`;
  const fileRef = ref(storage, path);
  await uploadBytes(fileRef, blob, { contentType: mimeType });
  const url = await getDownloadURL(fileRef);
  return {
    // Kept for call-site compatibility; this is now a compact Storage URL,
    // not an embedded Base64 payload.
    base64: url,
    url,
    width,
    height,
    originalSize: file.size,
  };
};

export const compressAvatarImageToBase64 = async (file) =>
  compressAndUpload(file, { folder: 'profile', baseName: 'avatar' });

/**
 * ID photos are uploaded under a unique name rather than overwriting a single
 * file: an already-approved request must keep the photo it was approved with,
 * even after the trainee submits a later request with a different one.
 */
export const uploadIdPhoto = async (file) =>
  compressAndUpload(file, { folder: 'idPhoto', baseName: `id-${Date.now()}` });
