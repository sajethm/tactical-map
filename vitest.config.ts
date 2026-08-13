import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'app/frontend') } },
  test: { environment: 'jsdom', setupFiles: ['app/frontend/test/setup.ts'], globals: true },
})
