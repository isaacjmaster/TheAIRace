import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
export default defineConfig({ root: 'raid', plugins: [react()], envDir: 'raid', build: { outDir: '../dist-raid', emptyOutDir: true }, server: { host: '0.0.0.0', port: 5188, strictPort: true }, preview: { host: '0.0.0.0', port: 4188, strictPort: true } });
