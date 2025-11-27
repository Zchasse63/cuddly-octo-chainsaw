/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // Light theme
        background: {
          primary: '#FFFFFF',
          secondary: '#F8F9FA',
          tertiary: '#E9ECEF',
        },
        // Accent colors (iOS style)
        accent: {
          blue: '#007AFF',
          coral: '#FF6B6B',
          orange: '#FF9500',
          green: '#34C759',
          purple: '#AF52DE',
          teal: '#5AC8FA',
          yellow: '#FFCC00',
          red: '#FF3B30',
        },
        // Semantic
        semantic: {
          primary: '#007AFF',
          success: '#34C759',
          warning: '#FF9500',
          error: '#FF3B30',
          info: '#5AC8FA',
        },
        // Border
        border: {
          light: '#E9ECEF',
          medium: '#DEE2E6',
        },
      },
      fontFamily: {
        system: ['System'],
        inter: ['Inter'],
      },
      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        full: '9999px',
      },
    },
  },
  plugins: [],
};
