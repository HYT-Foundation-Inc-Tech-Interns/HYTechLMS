// Philippine mobile number helpers.
// Canonical stored form: "+63" + 10 national digits starting with 9
// (e.g. "+639171234567"). The +63 country code is shown as a fixed UI prefix.

/**
 * Normalize any Philippine mobile input to the 10-digit national number.
 * Accepts "9XXXXXXXXX", "09XXXXXXXXX", "63XXXXXXXXXX", "+63 9XX XXX XXXX", etc.
 * Returns at most 10 digits (starting with 9 when valid).
 */
export const normalizePhMobile = (raw) => {
  let digits = String(raw || '').replace(/\D/g, '');
  if (digits.startsWith('63')) {
    digits = digits.slice(2); // drop country code
  } else if (digits.startsWith('0')) {
    digits = digits.replace(/^0+/, ''); // drop trunk prefix (09... -> 9...)
  }
  return digits.slice(0, 10);
};

/** True when the value is a valid 10-digit PH mobile national number. */
export const isValidPhMobile = (nationalDigits) => /^9\d{9}$/.test(nationalDigits);

/** Prefix a normalized national number with the +63 country code for storage. */
export const toStoredPhMobile = (nationalDigits) => {
  const national = normalizePhMobile(nationalDigits);
  return national ? `+63${national}` : '';
};
