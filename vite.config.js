import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// GitHub Pages 배포를 위한 base 경로 설정
// 저장소 이름이 'catbench-leaderboard'인 경우: '/catbench-leaderboard/'
// 커스텀 도메인(catbench.org)을 사용하는 경우: '/'
// 환경 변수로 오버라이드 가능: VITE_BASE_PATH
const base = process.env.VITE_BASE_PATH || '/'

export default defineConfig({
  plugins: [react()],
  base: base,
  server: {
    host: '0.0.0.0',  // 네트워크 접근 허용 (원격 서버에서도 접근 가능)
    port: 5173,
    open: false  // 자동 브라우저 열기 비활성화
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true
  },
  publicDir: 'public'
})

