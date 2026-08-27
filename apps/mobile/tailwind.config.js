const { colors } = require('./src/lib/theme.js');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './src/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: { extend: { colors, borderRadius: { card: '24px', field: '16px' } } },
  plugins: [],
};
