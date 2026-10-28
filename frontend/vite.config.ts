import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    // Proxy /api calls to the FastAPI backend during local dev
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
