import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: [
      'keepon-inventory.com'
    ],
    host: true,
    port: 5173,
  },
})
