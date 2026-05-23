import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  // ใส่บรรทัดนี้เพื่อป้องกันไม่ให้ Vite พังเวลาอ่านไฟล์ AI ของ MediaPipe
  optimizeDeps: {
    exclude: [
      '@mediapipe/pose', 
      '@mediapipe/hands', 
      '@mediapipe/camera_utils', 
      '@mediapipe/drawing_utils'
    ]
  }
})