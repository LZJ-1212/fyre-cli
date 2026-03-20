<template>
  <div id="app">
    <!-- 导航栏 -->
    <nav class="navbar">
      <div class="nav-container">
        <div class="nav-brand">
          <router-link to="/" class="brand-link">
            <img src="/vite.svg" class="logo" alt="Vite logo" />
            <span class="brand-text">{% projectName %}</span>
          </router-link>
        </div>
        
        <div class="nav-menu">
          <router-link to="/" class="nav-link">首页</router-link>
          <router-link to="/about" class="nav-link">关于</router-link>
          <router-link to="/contact" class="nav-link">联系</router-link>
        </div>
        
        <div class="nav-actions">
          <button class="theme-toggle" @click="toggleTheme">
            {{ isDarkMode ? '🌙' : '☀️' }}
          </button>
        </div>
      </div>
    </nav>

    <!-- 主内容区域 -->
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>

    <!-- 页脚 -->
    <footer class="footer">
      <div class="footer-content">
        <div class="footer-links">
          <a href="https://vitejs.dev" target="_blank" rel="noopener">
            <img src="/vite.svg" class="footer-logo" alt="Vite logo" />
          </a>
          <a href="https://vuejs.org/" target="_blank" rel="noopener">
            <img src="./assets/vue.svg" class="footer-logo vue" alt="Vue logo" />
          </a>
        </div>
        
        <div class="footer-info">
          <p>&copy; {{ new Date().getFullYear() }} {% projectName %}. 使用 Vite 和 Vue 3 构建</p>
          <p class="footer-author">作者: {% author %}</p>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

// 路由实例
const router = useRouter()

// 主题状态
const isDarkMode = ref(false)

// 切换主题
const toggleTheme = () => {
  isDarkMode.value = !isDarkMode.value
  localStorage.setItem('darkMode', isDarkMode.value)
  updateTheme()
}

// 更新主题
const updateTheme = () => {
  if (isDarkMode.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// 初始化主题
onMounted(() => {
  // 从本地存储或系统偏好获取主题设置
  const savedTheme = localStorage.getItem('darkMode')
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  
  isDarkMode.value = savedTheme !== null ? savedTheme === 'true' : systemPrefersDark
  updateTheme()
  
  // 监听系统主题变化
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
    if (!localStorage.getItem('darkMode')) {
      isDarkMode.value = e.matches
      updateTheme()
    }
  })
})

// 监听路由变化
watch(() => router.currentRoute.value, (to) => {
  // 更新页面标题
  document.title = to.meta.title ? `${to.meta.title} - {% projectName %}` : '{% projectName %}'
  
  // 滚动到顶部
  window.scrollTo(0, 0)
}, { immediate: true })
</script>

<style scoped>
#app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

/* 导航栏样式 */
.navbar {
  background-color: var(--color-background);
  border-bottom: 1px solid var(--color-border);
  padding: 0.5rem 0;
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.brand-link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: inherit;
}

.logo {
  height: 2rem;
  margin-right: 0.5rem;
  transition: transform 0.3s ease;
}

.logo:hover {
  transform: rotate(15deg);
}

.brand-text {
  font-size: 1.25rem;
  font-weight: 600;
  background: linear-gradient(90deg, #646cff, #42b883);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.nav-menu {
  display: flex;
  gap: 1.5rem;
}

.nav-link {
  color: var(--color-text);
  text-decoration: none;
  padding: 0.5rem 0;
  position: relative;
  font-weight: 500;
  transition: color 0.3s ease;
}

.nav-link:hover {
  color: #42b883;
}

.nav-link::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 0;
  width: 0;
  height: 2px;
  background-color: #42b883;
  transition: width 0.3s ease;
}

.nav-link:hover::after {
  width: 100%;
}

.nav-link.router-link-active {
  color: #42b883;
}

.nav-link.router-link-active::after {
  width: 100%;
}

.theme-toggle {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 50%;
  transition: background-color 0.3s ease;
}

.theme-toggle:hover {
  background-color: var(--color-background-soft);
}

/* 主内容区域 */
.main-content {
  flex: 1;
  padding: 2rem 1rem;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

/* 页脚样式 */
.footer {
  background-color: var(--color-background-soft);
  border-top: 1px solid var(--color-border);
  padding: 2rem 0;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

.footer-links {
  display: flex;
  gap: 1.5rem;
}

.footer-logo {
  height: 2rem;
  opacity: 0.7;
  transition: opacity 0.3s ease;
}

.footer-logo:hover {
  opacity: 1;
}

.footer-logo.vue:hover {
  filter: drop-shadow(0 0 1em #42b883aa);
}

.footer-info {
  text-align: center;
  color: var(--color-text-secondary);
}

.footer-author {
  font-size: 0.9rem;
  margin-top: 0.5rem;
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-menu {
    gap: 1rem;
  }
  
  .main-content {
    padding: 1rem;
  }
  
  .footer-content {
    text-align: center;
  }
  
  .footer-links {
    flex-wrap: wrap;
    justify-content: center;
  }
}
</style>

<style>
/* 全局样式 */
:root {
  --color-background: #ffffff;
  --color-background-soft: #f8f8f8;
  --color-border: #e2e2e2;
  --color-text: #2c3e50;
  --color-text-secondary: #7f7f7f;
}

.dark {
  --color-background: #1a1a1a;
  --color-background-soft: #242424;
  --color-border: #383838;
  --color-text: #ffffff;
  --color-text-secondary: #a0a0a0;
}

body {
  background-color: var(--color-background);
  color: var(--color-text);
  transition: background-color 0.3s ease, color 0.3s ease;
}
</style>