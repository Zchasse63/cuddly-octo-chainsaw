/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          primary: '#FFFFFF',
          secondary: '#F8F9FA',
          tertiary: '#E9ECEF',
        },
        text: {
          primary: '#000000',
          secondary: '#495057',
          tertiary: '#6C757D',
          disabled: '#ADB5BD',
        },
        accent: {
          blue: '#007AFF',
          coral: '#FF6B6B',
          orange: '#FF9500',
          green: '#34C759',
          purple: '#AF52DE',
          red: '#FF3B30',
          teal: '#5AC8FA',
          yellow: '#FFCC00',
        },
        border: {
          primary: '#DEE2E6',
          subtle: '#E9ECEF',
          medium: '#6C757D',
        },
        semantic: {
          success: '#34C759',
          warning: '#FF9500',
          error: '#FF3B30',
          info: '#5AC8FA',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
