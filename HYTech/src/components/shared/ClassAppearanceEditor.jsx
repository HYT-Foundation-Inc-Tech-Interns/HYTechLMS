import React, { useEffect, useState } from 'react';
import { Image as ImageIcon, Trash2, Upload } from 'lucide-react';
import { COLOR_PALETTE, getGradientStyle } from '../../utils/courseColors';

const ClassAppearanceEditor = ({
  color = '',
  imageUrl = '',
  imageFile = null,
  onColorChange,
  onImageChange,
  onRemoveImage,
  disabled = false,
}) => {
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!imageFile) {
      setPreviewUrl('');
      return undefined;
    }
    const nextPreviewUrl = URL.createObjectURL(imageFile);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [imageFile]);

  const effectiveImage = previewUrl || imageUrl;

  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-800">Class card image</p>
        <div
          className="relative flex h-36 items-center justify-center overflow-hidden rounded-xl border border-gray-200"
          style={effectiveImage
            ? {
                backgroundImage: `url(${effectiveImage})`,
                backgroundPosition: 'center',
                backgroundSize: 'cover',
              }
            : { background: getGradientStyle(color || COLOR_PALETTE[0].bg) }}
        >
          {effectiveImage && (
            <div
              className="absolute inset-0 opacity-40"
              style={{ background: getGradientStyle(color || COLOR_PALETTE[0].bg) }}
            />
          )}
          {!effectiveImage && <ImageIcon className="h-10 w-10 text-white/80" />}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <label className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${disabled ? 'pointer-events-none opacity-50' : ''}`}>
            <Upload className="h-4 w-4" />
            {effectiveImage ? 'Replace image' : 'Upload image'}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              disabled={disabled}
              onChange={(event) => onImageChange?.(event.target.files?.[0] || null)}
            />
          </label>
          {effectiveImage && (
            <button
              type="button"
              onClick={onRemoveImage}
              disabled={disabled}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove image
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-gray-500">Use an image file up to 25 MB. It is stored securely in Firebase Storage.</p>
      </div>

      <fieldset disabled={disabled}>
        <legend className="mb-2 text-sm font-semibold text-gray-800">Card color overlay</legend>
        <div className="flex flex-wrap gap-2">
          {COLOR_PALETTE.map((option) => {
            const selected = color === option.bg;
            return (
              <button
                key={option.bg}
                type="button"
                onClick={() => onColorChange?.(option.bg)}
                aria-label={`Use ${option.name} class color`}
                aria-pressed={selected}
                title={option.name}
                className={`h-9 w-9 rounded-full border-2 transition-transform hover:scale-105 ${
                  selected ? 'border-gray-900 ring-2 ring-blue-200' : 'border-white ring-1 ring-gray-300'
                }`}
                style={{ background: getGradientStyle(option.bg) }}
              />
            );
          })}
        </div>
        <p className="mt-2 text-xs text-gray-500">The color stays visible as a translucent overlay when an image is used.</p>
      </fieldset>
    </div>
  );
};

export default ClassAppearanceEditor;
