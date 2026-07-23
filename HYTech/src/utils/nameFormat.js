const capitalizeToken = (token) =>
  token
    .split(/([-'])/)
    .map((part) => {
      if (part === '-' || part === "'") return part;
      if (!part) return part;
      return `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`;
    })
    .join('');

/**
 * Normalize names entered by account owners. Administrators intentionally do
 * not use this helper when editing a user, so exceptional casing such as
 * "de la Cruz" can still be entered exactly as required.
 */
export const formatPersonName = (value = '') =>
  String(value)
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .map(capitalizeToken)
    .join(' ');

export const formatNameExtension = (value = '') => {
  const normalized = String(value).trim().replace(/\s+/g, ' ');
  if (!normalized) return '';

  const withoutPeriod = normalized.replace(/\./g, '');
  if (/^(jr|sr)$/i.test(withoutPeriod)) {
    return `${withoutPeriod.charAt(0).toUpperCase()}${withoutPeriod.slice(1).toLowerCase()}.`;
  }
  if (/^[ivxlcdm]+$/i.test(withoutPeriod)) {
    return withoutPeriod.toUpperCase();
  }
  return formatPersonName(normalized);
};

export const normalizeNameFields = ({
  firstName = '',
  middleName = '',
  lastName = '',
  nameExtension = '',
} = {}) => ({
  firstName: formatPersonName(firstName),
  middleName: formatPersonName(middleName),
  lastName: formatPersonName(lastName),
  nameExtension: formatNameExtension(nameExtension),
});

export const normalizeEditedNameFields = (fields = {}, editedFields = {}) => ({
  firstName: editedFields.firstName
    ? formatPersonName(fields.firstName)
    : String(fields.firstName || '').trim(),
  middleName: editedFields.middleName
    ? formatPersonName(fields.middleName)
    : String(fields.middleName || '').trim(),
  lastName: editedFields.lastName
    ? formatPersonName(fields.lastName)
    : String(fields.lastName || '').trim(),
  nameExtension: editedFields.nameExtension
    ? formatNameExtension(fields.nameExtension)
    : String(fields.nameExtension || '').trim(),
});

export const joinNameFields = ({
  firstName = '',
  middleName = '',
  lastName = '',
  nameExtension = '',
} = {}) =>
  [firstName, middleName, lastName, nameExtension]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .join(' ');

export const buildFullName = (fields = {}) => {
  return joinNameFields(normalizeNameFields(fields));
};
