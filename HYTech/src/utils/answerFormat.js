// Shared answer helpers for every trainer-builder question type.
//
// The trainee results view and the trainer response viewer both read submitted
// answers back through these helpers. They used to live only in StudentCourse,
// so the trainer's "View Details" modal had no grid branch and printed raw
// `{"0":[1]}` index maps instead of "Row 1: Column 2".
//
// Answer shapes by type:
//   multiple-choice | true-false | dropdown  -> option index (number)
//   checkbox | checkboxes                    -> array of option indexes
//   short-answer | paragraph                 -> string
//   linear-scale | rating                    -> number
//   multiple-grid                            -> { rowIndex: columnIndex }
//   checkbox-grid                            -> { rowIndex: [columnIndex, …] }
//   date | time                              -> string

export const isBlankAnswer = (v) =>
  v === undefined ||
  v === null ||
  (typeof v === 'string' && v.trim() === '') ||
  (Array.isArray(v) && v.length === 0) ||
  (typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0);

export const normalizeText = (v) => String(v ?? '').trim().toLowerCase();

const asArray = (v) => (Array.isArray(v) ? v : []);
const asMap = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {});
const sameIndexSet = (a, b) =>
  asArray(a).map(String).sort().join(',') === asArray(b).map(String).sort().join(',');

export const isRequiredAnswerMissing = (question, answer) => {
  if (!question?.required) return false;
  if (question.type === 'checkbox-grid') {
    const rowCount = asArray(question.rows).length;
    return rowCount === 0 || Array.from({ length: rowCount }, (_, index) => (
      !Array.isArray(answer?.[index]) || answer[index].length === 0
    )).some(Boolean);
  }
  if (question.type === 'multiple-grid') {
    const rowCount = asArray(question.rows).length;
    return rowCount === 0 || Array.from({ length: rowCount }, (_, index) => (
      answer?.[index] === undefined || answer?.[index] === null
    )).some(Boolean);
  }
  return isBlankAnswer(answer);
};

/**
 * True when the question carries an answer key that can actually decide
 * correctness. Grids default to an empty `{}` and the builders offer no UI to
 * fill it, so without this check they silently score every trainee 0 instead of
 * going to the trainer for review. Option index 0 is a valid key, not a blank.
 */
export const hasAnswerKey = (question) => {
  const type = question?.type || 'multiple-choice';
  const key = question?.correctAnswer;
  if (type === 'paragraph' || type === 'file-upload') return false;
  if (type === 'checkbox' || type === 'checkboxes') return asArray(key).length > 0;
  if (type === 'multiple-grid' || type === 'checkbox-grid') {
    return Object.keys(asMap(key)).length > 0;
  }
  if (type === 'short-answer') return String(key ?? '').trim() !== '';
  return key !== undefined && key !== null && key !== '';
};

/**
 * Grade one question for display. `autoGraded: false` means "a human has to
 * decide" — paragraphs, and anything the trainer never gave a key for.
 */
export const evaluateAnswer = (question, answer) => {
  const type = question?.type || 'multiple-choice';
  if (type === 'paragraph') return { isCorrect: false, autoGraded: false };
  if (!hasAnswerKey(question)) return { isCorrect: false, autoGraded: false };

  if (type === 'checkbox' || type === 'checkboxes') {
    return { isCorrect: sameIndexSet(answer, question.correctAnswer), autoGraded: true };
  }
  if (type === 'short-answer') {
    return {
      isCorrect: !isBlankAnswer(answer)
        && normalizeText(answer) === normalizeText(question.correctAnswer),
      autoGraded: true,
    };
  }
  if (type === 'linear-scale') {
    return {
      isCorrect: !isBlankAnswer(answer) && Number(answer) === Number(question.correctAnswer),
      autoGraded: true,
    };
  }
  if (type === 'multiple-grid') {
    const key = asMap(question.correctAnswer);
    const given = asMap(answer);
    return {
      isCorrect: Object.keys(key).every((row) => Number(given[row]) === Number(key[row])),
      autoGraded: true,
    };
  }
  if (type === 'checkbox-grid') {
    const key = asMap(question.correctAnswer);
    const given = asMap(answer);
    return {
      isCorrect: Object.keys(key).every((row) => sameIndexSet(given[row], key[row])),
      autoGraded: true,
    };
  }
  // single-choice: multiple-choice, true-false, dropdown
  return {
    isCorrect: !isBlankAnswer(answer) && answer === question.correctAnswer,
    autoGraded: true,
  };
};

/** Human-readable rendering of a trainee's answer. */
export const describeAnswer = (question, answer) => {
  const type = question?.type || 'multiple-choice';
  const opts = asArray(question?.options);
  if (isBlankAnswer(answer)) return 'Not answered';
  if (type === 'checkbox' || type === 'checkboxes') {
    return asArray(answer).map((i) => opts[i]).filter(Boolean).join(', ') || 'Not answered';
  }
  if (type === 'short-answer' || type === 'paragraph' || type === 'linear-scale') {
    return String(answer);
  }
  if (type === 'multiple-grid') {
    const rows = asArray(question.rows);
    const cols = asArray(question.columns);
    const given = asMap(answer);
    return rows.map((row, rIdx) => `${row}: ${cols[given[rIdx]] ?? '—'}`).join('; ');
  }
  if (type === 'checkbox-grid') {
    const rows = asArray(question.rows);
    const cols = asArray(question.columns);
    const given = asMap(answer);
    return rows.map((row, rIdx) => {
      const selected = asArray(given[rIdx]).map((i) => cols[i]).filter(Boolean);
      return `${row}: ${selected.join(', ') || '—'}`;
    }).join('; ');
  }
  // Types without an option list (date, time, rating) hold the value itself.
  if (opts.length === 0) {
    return typeof answer === 'object' ? JSON.stringify(answer) : String(answer);
  }
  return opts[answer] ?? 'Not answered';
};

/** Human-readable rendering of the trainer's answer key. */
export const describeCorrect = (question) => {
  const type = question?.type || 'multiple-choice';
  const opts = asArray(question?.options);
  if (!hasAnswerKey(question)) return '';
  if (type === 'checkbox' || type === 'checkboxes') {
    return asArray(question.correctAnswer).map((i) => opts[i]).filter(Boolean).join(', ');
  }
  if (type === 'short-answer' || type === 'linear-scale') return String(question.correctAnswer ?? '');
  if (type === 'multiple-grid') {
    const rows = asArray(question.rows);
    const cols = asArray(question.columns);
    const key = asMap(question.correctAnswer);
    return rows.map((row, rIdx) => `${row}: ${cols[key[rIdx]] ?? '—'}`).join('; ');
  }
  if (type === 'checkbox-grid') {
    const rows = asArray(question.rows);
    const cols = asArray(question.columns);
    const key = asMap(question.correctAnswer);
    return rows.map((row, rIdx) => {
      const selected = asArray(key[rIdx]).map((i) => cols[i]).filter(Boolean);
      return `${row}: ${selected.join(', ') || '—'}`;
    }).join('; ');
  }
  if (opts.length === 0) return String(question.correctAnswer ?? '');
  return opts[question.correctAnswer] ?? '';
};
