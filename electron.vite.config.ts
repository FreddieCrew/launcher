import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  main: {
    build: {
      sourcemap: false,
      minify: true,
    },
  },
  preload: {
    build: {
      sourcemap: false,
      minify: true
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src')
      }
    },

    build: {
      sourcemap: false,
      minify: true
    },

    plugins: [
      tailwindcss() as any,
      react()
    ]
  }
})
