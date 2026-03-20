import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
import './App.css'

// 示例组件
const Home = () => {
  const [count, setCount] = useState(0)

  return (
    <div className="home">
      <div className="logo-section">
        <a href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://reactjs.org" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>{% projectName %}</h1>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          计数: {count}
        </button>
        <p>
          编辑 <code>src/App.jsx</code> 并保存以测试热重载
        </p>
      </div>
      <p className="read-the-docs">
        点击 Vite 和 React 徽标了解更多信息
      </p>
    </div>
  )
}

const About = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 模拟 API 调用
    const fetchData = async () => {
      try {
        // 在实际项目中，这里可以替换为真实的 API 调用
        await new Promise(resolve => setTimeout(resolve, 1000))
        setData({
          message: '这是关于页面',
          version: '1.0.0',
          features: ['React 18', 'Vite', '热重载', '路由']
        })
      } catch (error) {
        console.error('获取数据失败:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  return (
    <div className="about">
      <h2>关于</h2>
      <p>{data.message}</p>
      <p>版本: {data.version}</p>
      <h3>功能特性:</h3>
      <ul>
        {data.features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
    </div>
  )
}

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // 在这里处理表单提交
    console.log('表单数据:', formData)
    alert('表单已提交! (查看控制台输出)')
  }

  return (
    <div className="contact">
      <h2>联系我们</h2>
      <form onSubmit={handleSubmit} className="contact-form">
        <div className="form-group">
          <label htmlFor="name">姓名:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="email">邮箱:</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="message">消息:</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows="4"
            required
          ></textarea>
        </div>
        <button type="submit">发送</button>
      </form>
    </div>
  )
}

const NotFound = () => {
  return (
    <div className="not-found">
      <h2>404 - 页面未找到</h2>
      <p>抱歉，您访问的页面不存在。</p>
      <Link to="/" className="home-link">返回首页</Link>
    </div>
  )
}

// 导航组件
const Navigation = () => {
  return (
    <nav className="navigation">
      <ul>
        <li>
          <Link to="/">首页</Link>
        </li>
        <li>
          <Link to="/about">关于</Link>
        </li>
        <li>
          <Link to="/contact">联系我们</Link>
        </li>
      </ul>
    </nav>
  )
}

// 页脚组件
const Footer = () => {
  return (
    <footer className="footer">
      <p>&copy; {new Date().getFullYear()} {% projectName %}. 保留所有权利.</p>
      <p>使用 React 和 Vite 构建</p>
    </footer>
  )
}

// 主应用组件
function App() {
  return (
    <Router>
      <div className="App">
        <header className="app-header">
          <h1>{% projectName %}</h1>
          <Navigation />
        </header>
        
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
        
        <Footer />
      </div>
    </Router>
  )
}

export default App