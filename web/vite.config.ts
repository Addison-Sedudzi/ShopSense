import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  // @shopsense/shared is an npm workspace symlink built as CommonJS. Vite
  // resolves the symlink to its real path and, by default, only pre-bundles
  // (esbuild's CJS->ESM interop) dependencies inside node_modules -- a
  // symlinked-out workspace package is otherwise served as raw source, and a
  // browser can't execute its require()/exports.X CommonJS directly. Forcing
  // it into optimizeDeps routes it through the same esbuild conversion any
  // normal node_modules CJS dependency gets.
  optimizeDeps: {
    include: ['@shopsense/shared'],
  },
})
