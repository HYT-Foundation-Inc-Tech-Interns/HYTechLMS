// Convert a TESDA qualification level (e.g. "NC II") into its full
// certification name (e.g. "National Certificate II").
// Falls back to the original text when the level isn't a recognized NC level.
export const formatCertification = (level) => {
  const raw = String(level || '').trim();
  const match = raw.match(/^NC\s*(I{1,3}V?|IV)$/i);
  if (match) return `National Certificate ${match[1].toUpperCase()}`;
  return raw;
};
