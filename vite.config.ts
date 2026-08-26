import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Rutas relativas: el build funciona igual servido desde la raíz del dominio
  // o desde un subdirectorio (por ejemplo /control-desviaciones/).
  base: './',

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },

  build: {
    outDir: 'dist',
    // Un solo archivo JS y uno CSS: simplifica la publicación y es requisito
    // del build de archivo único (scripts/build-standalone.mjs).
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
        entryFileNames: 'assets/app.js',
        assetFileNames: 'assets/app[extname]',
      },
    },
    chunkSizeWarningLimit: 1200,
  },

  server: {
    port: 3000,
  },
});
