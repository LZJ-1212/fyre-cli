import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import './style.css'

// 导入路由配置
import routes from './router'

// 错误处理函数
const errorHandler = (err, vm, info) => {
  console.error('Vue 错误:', err, info)
  
  // 在实际项目中，这里可以将错误发送到错误报告服务
  if (import.meta.env.PROD) {
    // 生产环境错误报告
    // reportErrorToService(err, info, vm)
  }
}

// 全局配置
const globalProperties = {
  // 全局工具函数
  $formatDate: (date) => {
    return new Date(date).toLocaleDateString()
  },
  $formatCurrency: (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount)
  }
}

// 全局组件
const globalComponents = {
  // 可以在这里导入全局组件
}

// 创建应用实例
const initApp = () => {
  try {
    // 创建 Pinia 状态管理
    const pinia = createPinia()
    
    // 创建路由
    const router = createRouter({
      history: createWebHistory(),
      routes,
      scrollBehavior(to, from, savedPosition) {
        // 滚动行为控制
        if (savedPosition) {
          return savedPosition
        } else if (to.hash) {
          return {
            el: to.hash,
            behavior: 'smooth'
          }
        } else {
          return { top: 0, left: 0 }
        }
      }
    })
    
    // 创建应用
    const app = createApp(App)
    
    // 配置应用
    app.config.errorHandler = errorHandler
    app.config.performance = import.meta.env.DEV // 开发模式下启用性能追踪
    
    // 注册全局属性
    Object.keys(globalProperties).forEach(key => {
      app.config.globalProperties[key] = globalProperties[key]
    })
    
    // 注册全局组件
    Object.keys(globalComponents).forEach(key => {
      app.component(key, globalComponents[key])
    })
    
    // 使用插件
    app.use(pinia)
    app.use(router)
    
    // 全局指令示例
    app.directive('focus', {
      mounted(el) {
        el.focus()
      }
    })
    
    // 全局混入示例
    app.mixin({
      created() {
        // 每个组件创建时都会执行
      }
    })
    
    // 挂载应用
    app.mount('#app')
    
    // 隐藏加载动画，显示应用内容
    const loadingElement = document.getElementById('loading')
    const appElement = document.getElementById('app')
    
    if (loadingElement && appElement) {
      loadingElement.style.display = 'none'
      appElement.style.display = 'block'
    }
    
    console.log('Vue 应用初始化成功')
  } catch (error) {
    console.error('Vue 应用初始化失败:', error)
    
    // 显示错误信息
    const appElement = document.getElementById('app')
    if (appElement) {
      appElement.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif;">
          <h1>应用初始化失败</h1>
          <p>${error.message}</p>
          <button onclick="window.location.reload()">重新加载</button>
        </div>
      `
      appElement.style.display = 'block'
    }
  }
}

// 设置全局错误处理
window.addEventListener('error', (event) => {
  console.error('全局错误:', event.error)
})

window.addEventListener('unhandledrejection', (event) => {
  console.error('未处理的 Promise 拒绝:', event.reason)
  event.preventDefault()
})

// 延迟初始化，确保DOM已完全加载
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp)
} else {
  initApp()
}

// 热模块替换 (HMR) 支持
if (import.meta.hot) {
  import.meta.hot.accept()
}