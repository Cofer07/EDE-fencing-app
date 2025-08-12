import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
  },
  optimizeDeps: {
    include: [
      '@g-loot/react-tournament-brackets',
      'react-svg-pan-zoom',
      'styled-components'
    ],
  },
});
