import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Base path configuration for GitHub Pages deployments.
// Repository hosted at username.github.io/catbench-leaderboard → '/catbench-leaderboard/'.
// Custom domain such as catbench.org → '/'.
// Can be overridden via the VITE_BASE_PATH environment variable.
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: '0.0.0.0',  // allow access from the network (useful on remote servers)
    port: 5173,
    open: false  // disable automatic browser launch
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  publicDir: 'public'
})

