import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/analytics',
            'firebase/performance',
            'firebase/remote-config'
          ],
          'vendor-motion': ['framer-motion'],
          'vendor-flow': ['reactflow'],
          'vendor-charts': ['recharts'],
          'vendor-d3': [
            'd3-color',
            'd3-dispatch',
            'd3-drag',
            'd3-ease',
            'd3-format',
            'd3-path',
            'd3-scale',
            'd3-time',
            'd3-time-format',
            'd3-timer',
            'd3-zoom'
          ],
          'vendor-maps': ['@react-google-maps/api'],
          'vendor-anthropic': ['@anthropic-ai/sdk'],
          'vendor-zod': ['zod'],
        }
      }
    },
    chunkSizeWarningLimit: 500,
  }
})
