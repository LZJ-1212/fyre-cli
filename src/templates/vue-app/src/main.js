import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router' // 直接使用引入的 router
import App from './App.vue'
import './style.css'

// 錯誤處理函數
const errorHandler = (err, vm, info) => {
  console.error('Vue 錯誤:', err, info)
}

const initApp = () => {
  try {
    const pinia = createPinia()
    const app = createApp(App)
    
    // 配置應用
    app.config.errorHandler = errorHandler
    app.config.performance = import.meta.env.DEV 
    
    // 全局工具函數
    app.config.globalProperties.$formatDate = (date) => new Date(date).toLocaleDateString()
    
    // 使用外掛
    app.use(pinia)
    app.use(router) // 直接掛載從 './router' 引入的 router
    
    // 全局指令示例
    app.directive('focus', {
      mounted(el) { el.focus() }
    })
    
    // 掛載應用
    app.mount('#app')
    console.log('Vue 應用初始化成功')
  } catch (error) {
    console.error('Vue 應用初始化失敗:', error)
    document.body.innerHTML = `<div style="padding: 20px; color: red;"><h1>應用初始化失敗</h1><p>${error.message}</p></div>`
  }
}

initApp()