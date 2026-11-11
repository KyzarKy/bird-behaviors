import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative asset paths, so the build works under any GitHub Pages sub-path.
  base: './',
  plugins: [react(), tailwindcss()],
  server: { port: 5183 },
});
