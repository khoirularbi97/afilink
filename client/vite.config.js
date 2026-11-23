import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Saat development, /api dan /go diteruskan ke backend Express di port 4000,
// jadi cookie login tetap satu origin dan tidak perlu urusan CORS.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://localhost:4000',
      '/go': 'http://localhost:4000',
    },
  },
})
