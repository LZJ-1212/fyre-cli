import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 错误边界组件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      error: error,
      errorInfo: errorInfo
    })
    
    // 可以将错误日志发送到错误报告服务
    console.error('React 错误边界捕获的错误:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h1>出了点问题</h1>
          <p>应用程序遇到了意外错误。请刷新页面重试。</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo.componentStack}
          </details>
        </div>
      )
    }

    return this.props.children
  }
}

// 性能监测
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry)
      getFID(onPerfEntry)
      getFCP(onPerfEntry)
      getLCP(onPerfEntry)
      getTTFB(onPerfEntry)
    })
  }
}

// 全局错误处理
const setupErrorHandling = () => {
  // 捕获未处理的 Promise 拒绝
  window.addEventListener('unhandledrejection', (event) => {
    console.error('未处理的 Promise 拒绝:', event.reason)
    event.preventDefault()
  })

  // 捕获全局 JavaScript 错误
  window.addEventListener('error', (event) => {
    console.error('全局错误:', event.error)
  })
}

// 初始化应用
const initApp = () => {
  try {
    const root = ReactDOM.createRoot(document.getElementById('root'))
    
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    )
    
    // 隐藏加载动画，显示应用内容
    const loadingElement = document.getElementById('loading')
    const rootElement = document.getElementById('root')
    
    if (loadingElement && rootElement) {
      loadingElement.style.display = 'none'
      rootElement.style.display = 'block'
    }
    
    // 设置性能监测
    if (process.env.NODE_ENV === 'development') {
      reportWebVitals(console.log)
    }
    
    console.log('应用初始化成功')
  } catch (error) {
    console.error('应用初始化失败:', error)
    
    // 显示错误信息
    const rootElement = document.getElementById('root')
    if (rootElement) {
      rootElement.innerHTML = `
        <div style="padding: 20px; font-family: sans-serif;">
          <h1>应用初始化失败</h1>
          <p>${error.message}</p>
          <button onclick="window.location.reload()">重新加载</button>
        </div>
      `
    }
  }
}

// 设置错误处理
setupErrorHandling()

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