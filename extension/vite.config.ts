import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        content: 'src/content.ts',
        background: 'src/background.ts',
        options: 'src/options/index.ts'
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  }
})