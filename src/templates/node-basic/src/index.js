require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const createError = require('http-errors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// 安全中间件 - Helmet
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ['\'self\''],
      scriptSrc: ['\'self\'', '\'unsafe-inline\''],
      styleSrc: ['\'self\'', '\'unsafe-inline\''],
      imgSrc: ['\'self\'', 'data:', 'https:'],
    },
  },
}));

// 跨域支持
app.use(cors({
  origin: process.env.CORS_ORIGIN || (isProduction ? false : true),
  credentials: true,
}));

// 请求日志
app.use(morgan(isProduction ? 'combined' : 'dev'));

// Gzip压缩
app.use(compression());

// 速率限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: process.env.RATE_LIMIT_MAX || 100, // 限制每个IP的请求数
  message: '请求过于频繁，请稍后再试',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 解析请求体
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try {
      JSON.parse(buf);
    } catch (e) {
      throw createError(400, '无效的JSON格式');
    }
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 静态文件服务
app.use(express.static('public', {
  maxAge: isProduction ? '7d' : 0, // 生产环境缓存7天
}));

// 基本路由
app.get('/', (req, res) => {
  res.json({
    message: '欢迎使用Node.js服务器!',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  });
});

// 健康检查端点
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// API路由 - 添加存在检查
const apiRoutePath = path.join(__dirname, 'routes', 'api.js');
if (fs.existsSync(apiRoutePath)) {
  app.use('/api', require('./routes/api'));
  console.log('API路由已加载');
} else {
  console.warn('API路由文件不存在，跳过加载API路由');

  // 提供一个基本的路由作为替代
  app.get('/api', (req, res) => {
    res.status(501).json({
      error: 'API路由未实现',
      message: 'API路由文件不存在，请创建 src/routes/api.js',
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/api/health', (req, res) => {
    res.status(200).json({
      status: 'OK',
      message: '基础API健康检查',
      timestamp: new Date().toISOString(),
    });
  });
}

// 404处理
app.use((req, res, next) => {
  next(createError(404, '请求的资源不存在'));
});

// 全局错误处理中间件
app.use((err, req, res, _next) => {
  // 设置局部变量，仅提供开发环境的错误信息
  const error = isProduction ? {} : err;

  // 记录错误（不在测试环境中记录）
  if (process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  // 发送错误响应
  res.status(err.status || 500);
  res.json({
    error: {
      message: err.message,
      status: err.status,
      ...error,
    },
  });
});

// 启动服务器 - 只在非测试环境下启动
if (process.env.NODE_ENV !== 'test') {
  const server = app.listen(PORT, () => {
    console.log(`服务器运行在端口 ${PORT}`);
    console.log(`环境: ${process.env.NODE_ENV || 'development'}`);
    console.log(`访问 http://localhost:${PORT} 查看应用`);
  });

  // 处理未捕获的异常
  process.on('uncaughtException', (error) => {
    console.error('未捕获的异常:', error);
    server.close(() => process.exit(1));
  });

  process.on('unhandledRejection', (reason, _promise) => {
    console.error('未处理的Promise拒绝:', reason);
    process.exit(1);
  });

  // 优雅关闭
  process.on('SIGINT', () => {
    console.log('\n正在关闭服务器...');
    server.close(() => process.exit(0));
  });

  process.on('SIGTERM', () => {
    console.log('\n收到SIGTERM信号，正在关闭服务器...');
    server.close(() => process.exit(0));
  });
}

module.exports = app; // 只导出 app，不导出 server