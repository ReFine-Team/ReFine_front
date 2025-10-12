import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve, dirname } from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

// ESM 환경에서 __dirname 대체
const __dirname = dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const baseUrl = env.VITE_API_BASEURL

  return {
    plugins: [
      react(),
      updateManifestHostPermissions(baseUrl),
    ],
    build: {
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'public/popup.html'),
          content: resolve(__dirname, 'src/content/content.js'),
          background: resolve(__dirname, 'src/background/background.js'),
          'content-style': resolve(__dirname, 'src/content/content.css'),
        },
        output: {
          entryFileNames: (chunkInfo) => {
            if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
              return '[name].js'
            }
            return 'assets/[name].js'
          },
          chunkFileNames: 'assets/[name].js',
          assetFileNames: (assetInfo) => {
            const names = assetInfo.names || []
            if (names.some(name => name.endsWith('content-style.css'))) {
              return 'content.css'
            }
            return 'assets/[name].[ext]'
          },
        },
      },
      outDir: 'dist',
      emptyOutDir: true,
      copyPublicDir: true, // public 폴더 자동 복사
    },
  }
})

function updateManifestHostPermissions(baseUrl) {
  return {
    name: 'update-manifest-host-permissions',
    writeBundle: (options) => {
      try {
        const manifestPath = resolve(options.dir, 'manifest.json')

        if (!fs.existsSync(manifestPath)) {
          console.warn('⚠️ dist/manifest.json이 존재하지 않습니다. public 폴더가 복사되지 않았을 수 있습니다.')
          return
        }

        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
        manifest.host_permissions = manifest.host_permissions || []

        if (baseUrl) {
          const newPermission = `${baseUrl}/*`
          if (!manifest.host_permissions.includes(newPermission)) {
            manifest.host_permissions.push(newPermission)
          }
        }

        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
        console.log('✅ manifest.json에 host_permissions이 성공적으로 추가되었습니다.')
      } catch (err) {
        console.error('❌ manifest.json 수정 중 오류 발생:', err)
      }
    },
  }
}
