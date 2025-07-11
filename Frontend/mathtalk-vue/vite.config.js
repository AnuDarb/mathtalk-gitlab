import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:5000',
      '/static': 'http://127.0.0.1:5000' // Proxy static files (images)
    }
  }
})