import { spawn } from 'node:child_process'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// No "npm run dev" liga também o back-end (pasta server), que reinicia sozinho ao salvar
function backEnd() {
  return {
    name: 'back-end',
    apply: 'serve',
    configureServer(server) {
      const api = spawn(process.execPath, ['--watch', 'server/server.js'], { stdio: 'inherit' })
      server.httpServer?.on('close', () => api.kill())
      process.on('exit', () => api.kill())
    },
  }
}

export default defineConfig(({ mode }) => {
  const porta = loadEnv(mode, process.cwd(), '').PORT || 3001
  return {
    plugins: [react(), tailwindcss(), backEnd()],
    // O front chama /api no mesmo endereço; o Vite repassa para o back-end
    server: { proxy: { '/api': `http://localhost:${porta}` } },
  }
})
