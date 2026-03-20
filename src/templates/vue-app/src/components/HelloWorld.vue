<template>
  <div class="hello-world">
    <!-- 标题区域 -->
    <div class="header">
      <h1 class="title">{{ msg }}</h1>
      <p class="subtitle">欢迎使用 Vue 3 + Vite 构建的现代化应用</p>
    </div>

    <!-- 功能卡片区域 -->
    <div class="features">
      <div class="feature-card">
        <div class="feature-icon">⚡</div>
        <h3>快速开发</h3>
        <p>基于 Vite 的快速冷启动和热模块替换</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">🎨</div>
        <h3>现代化 UI</h3>
        <p>使用 Vue 3 Composition API 和最新特性</p>
      </div>
      
      <div class="feature-card">
        <div class="feature-icon">📱</div>
        <h3>响应式设计</h3>
        <p>完美适配移动端和桌面端</p>
      </div>
    </div>

    <!-- 计数器演示 -->
    <div class="demo-section">
      <h2>Vue 响应式演示</h2>
      <div class="card">
        <button type="button" class="counter-btn" @click="incrementCount">
          计数: {{ count }}
        </button>
        <p>已点击 {{ count }} 次</p>
        
        <div class="counter-controls">
          <button @click="decrementCount" :disabled="count <= 0">减少</button>
          <button @click="resetCount">重置</button>
          <button @click="doubleCount">加倍</button>
        </div>
      </div>
    </div>

    <!-- 输入绑定演示 -->
    <div class="demo-section">
      <h2>双向绑定演示</h2>
      <div class="card">
        <input 
          v-model="userInput" 
          placeholder="输入一些内容..." 
          class="input-demo"
        />
        <p>您输入的内容: {{ userInput || '尚未输入' }}</p>
        <p>字符数: {{ userInput.length }}</p>
      </div>
    </div>

    <!-- 条件渲染演示 -->
    <div class="demo-section">
      <h2>条件渲染演示</h2>
      <div class="card">
        <label class="toggle-label">
          <input type="checkbox" v-model="showExtraContent" />
          显示额外内容
        </label>
        
        <p v-if="showExtraContent" class="extra-content">
          这是条件渲染的内容！Vue 的条件指令非常强大。
        </p>
        <p v-else>
          尝试勾选复选框来显示额外内容。
        </p>
      </div>
    </div>

    <!-- 资源链接 -->
    <div class="resources">
      <h2>学习资源</h2>
      <div class="resource-links">
        <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank" rel="noopener">
          Vue.js 官方文档
        </a>
        <a href="https://vitejs.dev/guide/" target="_blank" rel="noopener">
          Vite 官方文档
        </a>
        <a href="https://github.com/vuejs/language-tools" target="_blank" rel="noopener">
          Volar IDE 扩展
        </a>
        <a href="https://pinia.vuejs.org/" target="_blank" rel="noopener">
          Pinia 状态管理
        </a>
        <a href="https://router.vuejs.org/" target="_blank" rel="noopener">
          Vue Router
        </a>
      </div>
      
      <p class="read-the-docs">
        点击上方的 Vite 和 Vue 徽标了解更多信息
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'

// 定义 props
defineProps({
  msg: String
})

// 响应式数据
const count = ref(0)
const userInput = ref('')
const showExtraContent = ref(false)

// 计算属性
const counterMessage = computed(() => {
  if (count.value === 0) return '还没有点击过'
  if (count.value === 1) return '点击了 1 次'
  return `点击了 ${count.value} 次`
})

// 方法
const incrementCount = () => {
  count.value++
}

const decrementCount = () => {
  if (count.value > 0) {
    count.value--
  }
}

const resetCount = () => {
  count.value = 0
}

const doubleCount = () => {
  count.value *= 2
}

// 生命周期钩子
onMounted(() => {
  console.log('HelloWorld 组件已挂载')
})
</script>

<style scoped>
.hello-world {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.header {
  text-align: center;
  margin-bottom: 3rem;
}

.title {
  font-size: 2.5rem;
  margin-bottom: 0.5rem;
  background: linear-gradient(90deg, #646cff, #42b883);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.subtitle {
  font-size: 1.2rem;
  color: var(--color-text-secondary);
}

/* 特性卡片样式 */
.features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.feature-card {
  background-color: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 12px;
  text-align: center;
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
}

.feature-icon {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  margin-bottom: 0.5rem;
  font-size: 1.25rem;
}

.feature-card p {
  color: var(--color-text-secondary);
}

/* 演示区域样式 */
.demo-section {
  margin-bottom: 2.5rem;
}

.demo-section h2 {
  margin-bottom: 1rem;
  font-size: 1.5rem;
  color: var(--color-text);
}

.card {
  background-color: var(--color-background-soft);
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.counter-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1.1rem;
  background-color: #646cff;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  margin-bottom: 1rem;
}

.counter-btn:hover {
  background-color: #535bf2;
}

.counter-controls {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.counter-controls button {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  background-color: var(--color-background);
  color: var(--color-text);
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.counter-controls button:hover:not(:disabled) {
  background-color: var(--color-background-soft);
}

.counter-controls button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.input-demo {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  margin-bottom: 1rem;
  font-size: 1rem;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 1rem;
  cursor: pointer;
}

.extra-content {
  padding: 1rem;
  background-color: rgba(66, 184, 131, 0.1);
  border-radius: 6px;
  border-left: 4px solid #42b883;
}

/* 资源链接样式 */
.resources {
  text-align: center;
  margin-top: 3rem;
  padding-top: 2rem;
  border-top: 1px solid var(--color-border);
}

.resource-links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.resource-links a {
  color: #646cff;
  text-decoration: none;
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  transition: all 0.3s ease;
}

.resource-links a:hover {
  background-color: #646cff;
  color: white;
}

.read-the-docs {
  color: var(--color-text-secondary);
  font-size: 0.9rem;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .hello-world {
    padding: 1rem;
  }
  
  .title {
    font-size: 2rem;
  }
  
  .features {
    grid-template-columns: 1fr;
  }
  
  .resource-links {
    flex-direction: column;
    align-items: center;
  }
  
  .resource-links a {
    width: 100%;
    text-align: center;
  }
  
  .counter-controls {
    flex-wrap: wrap;
  }
}
</style>

<style>
/* 全局样式（如果需要） */
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
</style>