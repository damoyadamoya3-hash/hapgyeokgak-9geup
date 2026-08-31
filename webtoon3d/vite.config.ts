import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    host: '127.0.0.1',
    port: 5173,
    open: false,
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  // MediaPipe 의 wasm 로더는 사전 번들링과 궁합이 좋지 않아 제외한다.
  optimizeDeps: {
    exclude: ['@mediapipe/tasks-vision'],
  },
});
