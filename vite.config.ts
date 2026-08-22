import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // DEMO BUILD: the Firebase SDK is replaced with in-memory stand-ins, so
      // this app has no backend, no credentials and no network dependency.
      // Every `from 'firebase/...'` import in the app resolves here instead.
      // See src/demo/.
      'firebase/firestore': path.resolve(__dirname, './src/demo/firestore.ts'),
      'firebase/auth': path.resolve(__dirname, './src/demo/auth.ts'),
      'firebase/storage': path.resolve(__dirname, './src/demo/storage.ts'),
    },
  },
})
