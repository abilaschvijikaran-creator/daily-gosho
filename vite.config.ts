import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite builds the React app into dist/. The Cloudflare Pages Function lives in
// functions/ and is handled by Cloudflare, not by this build.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.{ts,tsx}'],
    setupFiles: ['tests/setup.ts'],
    // Run test files one at a time: parallel workers failed to start on this Windows machine.
    fileParallelism: false,
  },
});
