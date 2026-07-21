import React, { useState } from 'react';
import { Plus, Trash2, ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Controlled editor for an ordered list of subject titles.
 * Used by admins (editing a program template's `subjects`) and by trainers
 * (customizing the modules of a class they're about to create).
 *
 * Props:
 *   subjects  string[]                 current list
 *   onChange  (next: string[]) => void called with the new list on any edit
 *   disabled  boolean                  disables all controls while saving
 *   label     string                   field label
 *   hint      string                   optional helper text under the label
 */
const SubjectListEditor = ({
  subjects = [],
  onChange,
  disabled = false,
  label = 'Subjects (become class modules)',
  hint = '',
}) => {
  const [draft, setDraft] = useState('');

  const update = (next) => onChange?.(next);
  const rename = (i, val) => update(subjects.map((s, idx) => (idx === i ? val : s)));
  const remove = (i) => update(subjects.filter((_, idx) => idx !== i));
  const move = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= subjects.length) return;
    const next = [...subjects];
    [next[i], next[j]] = [next[j], next[i]];
    update(next);
  };
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    update([...subjects, v]);
    setDraft('');
  };

  return (
    <div>
      {label && <label className="block text-sm font-semibold text-gray-900 mb-1">{label}</label>}
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}

      <div className="space-y-2">
        {subjects.length === 0 && (
          <p className="text-sm text-gray-400 italic">No subjects yet — add one below.</p>
        )}
        {subjects.map((subject, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-5 text-right text-xs text-gray-400">{i + 1}.</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => rename(i, e.target.value)}
              disabled={disabled}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
            />
            <button
              type="button"
              onClick={() => move(i, -1)}
              disabled={disabled || i === 0}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="Move up"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => move(i, 1)}
              disabled={disabled || i === subjects.length - 1}
              className="p-1.5 text-gray-500 hover:bg-gray-100 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="Move down"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => remove(i)}
              disabled={disabled}
              className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:hover:bg-transparent"
              title="Remove"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex gap-2 mt-3">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add();
            }
          }}
          disabled={disabled}
          placeholder="Add a subject…"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={disabled || !draft.trim()}
          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add
        </button>
      </div>
    </div>
  );
};

export default SubjectListEditor;
