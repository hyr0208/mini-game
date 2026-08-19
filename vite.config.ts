import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // 방 코드로 접속하는 다른 기기(폰 등)가 LAN에서 접근할 수 있도록 개방
    host: true,
    watch: {
      ignored: ['**/server/**'],
    },
  },
})
