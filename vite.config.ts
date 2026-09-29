import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // GitHub Pages project sites are served below /<repository>/.
  // Keep Vercel/local builds at the root path.
  base: process.env.GITHUB_ACTIONS === 'true' ? '/studyrise/' : '/',
  plugins: [react()],
});
