import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  // GitHub Pages project sites are served below /<repository>/.
  // The Pages workflow builds with --mode github-pages; Vercel/local stay at root.
  base: mode === 'github-pages' ? '/studyrise/' : '/',
  plugins: [react()],
}));
