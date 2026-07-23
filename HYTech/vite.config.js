import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    strictPort: false,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/@firebase/firestore') || id.includes('node_modules/firebase/firestore')) {
            return 'firebase-firestore'
          }
          if (id.includes('node_modules/@firebase/auth') || id.includes('node_modules/firebase/auth')) {
            return 'firebase-auth'
          }
          if (id.includes('node_modules/@firebase/storage') || id.includes('node_modules/firebase/storage')) {
            return 'firebase-storage'
          }
          if (id.includes('node_modules/@firebase') || id.includes('node_modules/firebase/')) {
            return 'firebase-core'
          }
          if (id.includes('node_modules/react') || id.includes('node_modules/react-router')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/lucide-react')) {
            return 'icons'
          }
          return undefined
        },
      },
    },
  }
})
