/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        headline: ['Manrope', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: '#006565',
        'primary-container': '#008080',
        surface: '#f8f9fa',
        'surface-low': '#f3f4f5',
        'surface-container-low': '#f3f4f5',
        'surface-lowest': '#ffffff',
        'surface-container-lowest': '#ffffff',
        'surface-high': '#e7e8e9',
        'surface-container-high': '#e7e8e9',
        'on-surface': '#191c1d',
        'on-surface-variant': '#3e4949',
        outline: '#6e7979',
        'outline-variant': '#bdc9c8',
        'secondary-container': '#c2e7e6',
        error: '#ba1a1a',
      },
    },
  },
  plugins: [],
}
