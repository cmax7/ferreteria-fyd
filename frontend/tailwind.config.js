export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#16a34a', light: '#4ade80', dark: '#15803d' },
        dark: { DEFAULT: '#1e293b', light: '#334155' }
      }
    }
  },
  plugins: []
};
