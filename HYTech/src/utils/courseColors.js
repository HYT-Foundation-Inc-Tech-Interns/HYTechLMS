// Deterministic placeholder colors for course/class cards that have no image.

export const COLOR_PALETTE = [
  { bg: 'from-blue-500 to-blue-700', light: 'from-blue-400 to-blue-600' },
  { bg: 'from-purple-500 to-purple-700', light: 'from-purple-400 to-purple-600' },
  { bg: 'from-pink-500 to-pink-700', light: 'from-pink-400 to-pink-600' },
  { bg: 'from-red-500 to-red-700', light: 'from-red-400 to-red-600' },
  { bg: 'from-orange-500 to-orange-700', light: 'from-orange-400 to-orange-600' },
  { bg: 'from-yellow-500 to-yellow-700', light: 'from-yellow-400 to-yellow-600' },
  { bg: 'from-green-500 to-green-700', light: 'from-green-400 to-green-600' },
  { bg: 'from-teal-500 to-teal-700', light: 'from-teal-400 to-teal-600' },
  { bg: 'from-cyan-500 to-cyan-700', light: 'from-cyan-400 to-cyan-600' },
  { bg: 'from-indigo-500 to-indigo-700', light: 'from-indigo-400 to-indigo-600' },
];

// Pick a stable palette entry from an id string.
export const getPlaceholderColor = (courseId) => {
  if (!courseId) return COLOR_PALETTE[0];
  let hash = 0;
  for (let i = 0; i < courseId.length; i++) {
    const char = courseId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return COLOR_PALETTE[Math.abs(hash) % COLOR_PALETTE.length];
};

// Convert a Tailwind gradient name to a CSS linear-gradient.
export const getGradientStyle = (color) => {
  const colorMap = {
    'from-blue-500 to-blue-700': 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
    'from-purple-500 to-purple-700': 'linear-gradient(135deg, #a855f7 0%, #6d28d9 100%)',
    'from-pink-500 to-pink-700': 'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'from-red-500 to-red-700': 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    'from-orange-500 to-orange-700': 'linear-gradient(135deg, #f97316 0%, #c2410c 100%)',
    'from-yellow-500 to-yellow-700': 'linear-gradient(135deg, #eab308 0%, #a16207 100%)',
    'from-green-500 to-green-700': 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)',
    'from-teal-500 to-teal-700': 'linear-gradient(135deg, #14b8a6 0%, #0d9488 100%)',
    'from-cyan-500 to-cyan-700': 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    'from-indigo-500 to-indigo-700': 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)',
  };
  return colorMap[color] || 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
};
