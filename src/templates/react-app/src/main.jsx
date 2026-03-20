import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// 錯誤邊界組件
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    console.error('React 錯誤邊界捕獲的錯誤:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
          <h1>出了點問題</h1>
          <p>應用程式遇到了意外錯誤。請刷新頁面重試。</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '20px' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {/* 加上可選鏈 (?.) 防止 errorInfo 為 null 時崩潰 */}
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      )
    }
    return this.props.children
  }
}

// 效能監測
const reportWebVitals = (onPerfEntry) => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry); getFID(onPerfEntry); getFCP(onPerfEntry); getLCP(onPerfEntry); getTTFB(onPerfEntry);
    })
  }
}

try {
  const root = ReactDOM.createRoot(document.getElementById('root'))
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  )
  
  if (import.meta.env.DEV) {
    reportWebVitals(console.log)
  }
} catch (error) {
  console.error('應用初始化失敗:', error)
  document.getElementById('root').innerHTML = `
    <div style="padding: 20px; color: red;">
      <h1>應用初始化失敗</h1><p>${error.message}</p>
    </div>
  `
}