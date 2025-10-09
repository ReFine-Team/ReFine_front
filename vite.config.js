import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    updateManifestHostPermissions(), //플러그인 추가
  ],
  build: {
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'public/popup.html'),
        content: resolve(__dirname, 'src/content/content.js'),
        background: resolve(__dirname, 'src/background/background.js')
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // content.js와 background.js는 dist 폴더 최상위에 생성
          if (chunkInfo.name === 'content' || chunkInfo.name === 'background') {
            return '[name].js';
          }
          // popup.html과 연결된 스크립트 등은 assets 폴더에 생성
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      }
    },
    outDir: 'dist',
    emptyOutDir: true,
  }
})

// 빌드 후 manifest.json을 수정하는 커스텀 플러그인
function updateManifestHostPermissions() {
  return {
    name: 'update-manifest-host-permissions',
    // writeBundle + 모든 파일이 dist 폴더 생성 후 실행
    writeBundle: (options) => {
      // .env 파일에서 VITE_API_BASEURL 값 호출
      const env = loadEnv('', process.cwd(), '');
      const baseUrl = env.VITE_API_BASEURL;

      if (!baseUrl) {
        console.warn('VITE_API_BASEURL이 .env 파일에 없습니다. manifest.json 수정이 건너뛰어집니다.');
        return;
      }

      // 빌드된 manifest.json 파일 경로
      const manifestPath = resolve(options.dir, 'manifest.json');

      try {
        // manifest.json 파일 JSON 객체로 변환
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

        if (!manifest.host_permissions) {
          manifest.host_permissions = [];
        }

        // API 주소 host_permissions에 추가
        const newPermission = `${baseUrl}/*`;
        if (!manifest.host_permissions.includes(newPermission)) {
            manifest.host_permissions.push(newPermission);
        }

        // 수정된 manifest 객체 사용
        fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        console.log('✅ manifest.json에 host_permissions이 성공적으로 추가되었습니다.');

      } catch (e) {
        console.error('manifest.json 수정 중 오류 발생:', e);
      }
    },
  };
}