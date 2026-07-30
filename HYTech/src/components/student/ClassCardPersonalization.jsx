import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Loader, Pencil, RotateCcw, X } from 'lucide-react';
import { setClassPref } from '../../utils/firestoreService';
import { COLOR_PALETTE, getGradientStyle } from '../../utils/courseColors';
import { useToast } from '../../context/ToastContext';

const ClassCardPersonalization = ({ userId, classId, preference = {}, className = '' }) => {
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [color, setColor] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNickname(preference.nickname || '');
    setColor(preference.color || '');
  }, [open, preference.nickname, preference.color]);

  useEffect(() => {
    if (!open) return undefined;

    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };

    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  const save = async () => {
    try {
      setSaving(true);
      await setClassPref(userId, classId, { nickname, color });
      addToast('Class card personalization saved.', 'success');
      setOpen(false);
    } catch (error) {
      addToast(error?.message || 'Unable to save class personalization.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    try {
      setSaving(true);
      await setClassPref(userId, classId, { nickname: '', color: '' });
      addToast('Class card personalization reset.', 'success');
      setOpen(false);
    } catch (error) {
      addToast(error?.message || 'Unable to reset class personalization.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!userId || !classId) return null;

  // Callers place this control themselves (e.g. "absolute right-3 top-3").
  // Tailwind emits .relative *after* .absolute, so hardcoding `relative` here
  // won the specificity tie and silently dropped the button back into normal
  // flow at the card's top-left. Only fall back to `relative` — which the
  // dropdown below needs as its positioning context — when the caller has not
  // positioned us. An absolute wrapper is just as valid a containing block.
  const isPositioned = /(?:^|\s)(?:absolute|fixed|sticky)(?:\s|$)/.test(className);

  return (
    <div
      className={`${isPositioned ? '' : 'relative'} ${className}`.trim()}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="inline-flex items-center justify-center rounded-full text-gray-700"
        aria-expanded={open}
        aria-label="Personalize this class card"
        title="Personalize class card"
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/70 bg-white/95 shadow-md transition-transform hover:scale-105 hover:bg-white">
          <Pencil className="h-3.5 w-3.5" />
        </span>
      </button>

      {open && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="presentation"
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default bg-black/30"
            onClick={() => setOpen(false)}
            aria-label="Close personalization"
          />
          <div
            className="relative z-10 w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 text-left shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`personalize-class-title-${classId}`}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h4 id={`personalize-class-title-${classId}`} className="font-bold text-gray-900">
                  Personalize class
                </h4>
                <p className="mt-1 text-xs text-gray-500">Only you can see these changes.</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100"
                aria-label="Close personalization"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="block text-sm font-semibold text-gray-800" htmlFor={`class-nickname-${classId}`}>
              Private nickname
            </label>
            <input
              id={`class-nickname-${classId}`}
              type="text"
              value={nickname}
              onChange={(event) => setNickname(event.target.value)}
              maxLength={100}
              placeholder="Keep the shared class name"
              className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-right text-xs text-gray-400">{nickname.trim().length}/100</p>

            <fieldset className="mt-4">
              <legend className="mb-2 text-sm font-semibold text-gray-800">Private card color</legend>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((option) => {
                  const selected = color === option.bg;
                  return (
                    <button
                      key={option.bg}
                      type="button"
                      onClick={() => setColor(option.bg)}
                      aria-label={`Use ${option.name} card color`}
                      aria-pressed={selected}
                      title={option.name}
                      className={`h-9 w-9 rounded-full border-2 ${
                        selected ? 'border-gray-900 ring-2 ring-blue-200' : 'border-white ring-1 ring-gray-300'
                      }`}
                      style={{ background: getGradientStyle(option.bg) }}
                    />
                  );
                })}
              </div>
            </fieldset>

            <div className="mt-5 flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={reset}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                <RotateCcw className="h-4 w-4" />
                Reset
              </button>
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
};

export default ClassCardPersonalization;
