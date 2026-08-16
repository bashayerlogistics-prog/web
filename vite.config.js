import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5173,
    strictPort: true,
    host: true,
  },
  build: {
    modulePreload: { polyfill: false },
    target: 'es2020',
    cssCodeSplit: true,
    cssMinify: true,
    sourcemap: false,
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('firebase/auth')) return 'firebase-auth';
          if (id.includes('firebase/firestore') || id.includes('firebase/app')) return 'firebase-db';
          if (id.includes('firebase')) return 'firebase';
          if (id.includes('swiper')) return 'swiper';
          if (id.includes('lucide-react')) return 'icons';
          if (id.includes('i18next') || id.includes('react-i18next')) return 'i18n';
          if (
            id.includes('react-router')
            || id.includes('react-dom')
            || id.includes('/react/')
          ) {
            return 'vendor';
          }
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', 'i18next', 'react-i18next', 'lucide-react'],
  },
})
