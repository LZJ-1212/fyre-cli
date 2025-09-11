import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // 加载环境变量
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    
    // 服务器配置
    server: {
      port: 3000,
      open: true, // 自动在浏览器中打开
      host: true, // 监听所有地址
      cors: true, // 启用 CORS
      strictPort: false, // 如果端口被占用，尝试下一个可用端口
      
      // 代理配置，用于开发环境 API 请求
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:8080',
          changeOrigin: true,
          secure: false,
          rewrite: (path) => path.replace(/^\/api/, '')
        }
      }
    },
    
    // 预览服务器配置
    preview: {
      port: 3001,
      host: true,
      open: false
    },
    
    // 构建配置
    build: {
      outDir: 'dist',
      sourcemap: mode !== 'production', // 生产环境不生成 sourcemap
      minify: 'esbuild', // 使用 esbuild 进行压缩
      cssMinify: true, // 压缩 CSS
      chunkSizeWarningLimit: 1000, // 块大小警告限制
      
      //  rollup 配置
      rollupOptions: {
        output: {
          manualChunks: {
            // 将第三方库拆分到单独的 chunk
            vendor: ['react', 'react-dom'],
            // 可以根据需要添加更多的手动分块
          }
        }
      }
    },
    
    // 解析配置
    resolve: {
      alias: {
        // 设置路径别名
        '@': resolve(__dirname, 'src'),
        '@components': resolve(__dirname, 'src/components'),
        '@pages': resolve(__dirname, 'src/pages'),
        '@utils': resolve(__dirname, 'src/utils'),
        '@hooks': resolve(__dirname, 'src/hooks'),
        '@assets': resolve(__dirname, 'src/assets')
      }
    },
    
    // CSS 配置
    css: {
      devSourcemap: true, // 开发环境下生成 CSS sourcemap
      modules: {
        // CSS Modules 配置
        localsConvention: 'camelCase'
      },
      preprocessorOptions: {
        // 如果使用 SCSS/Less 等预处理器，可以在这里配置
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      }
    },
    
    // 环境变量配置
    define: {
      // 定义全局常量
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },
    
    // 测试配置（如果使用 Vitest）
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      coverage: {
        provider: 'v8',
        reporter: ['text', 'json', 'html']
      }
    }
  }
})