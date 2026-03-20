# {% projectName %}

![Node.js](https://img.shields.io/badge/Node.js-18.x-green?style=flat-square)
![Express](https://img.shields.io/badge/Express-4.x-lightgrey?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

这是一个使用 [Fyre CLI](https://github.com/LZJ-1212/fyre-cli) 创建的现代化 Node.js 项目模板，专为快速启动开发环境而设计。

## ✨ 特性

- ⚡️ 极速启动 - 几秒钟内搭建完整的开发环境
- 🔒 安全优先 - 内置 Helmet、CORS 和速率限制
- 📊 性能优化 - 包含压缩和缓存策略
- 🐛 开发友好 - 集成热重载和调试支持
- ✅ 代码质量 - 预配置 ESLint 和 Prettier
- 🧪 测试就绪 - 内置 Jest 测试框架
- 📦 生产就绪 - 包含 Docker 和部署配置

## 🚀 开始使用

### 前置要求

- Node.js 16.0.0 或更高版本
- npm 7.0.0 或更高版本
- Git

### 安装步骤

1. 安装依赖：

```bash
npm install
```

2. 设置环境变量：

```bash
cp .env.example .env
```

编辑 `.env` 文件，根据您的需求调整配置：

```env
NODE_ENV=development
PORT=3000
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_MAX=100
```

3. 启动开发服务器：

```bash
npm run dev
```

4. 在浏览器中访问 http://localhost:3000

## 📖 可用脚本

| 命令 | 描述 |
|------|------|
| `npm start` | 启动生产服务器 |
| `npm run dev` | 启动开发服务器（带热重载） |
| `npm run debug` | 启动调试模式 |
| `npm test` | 运行测试套件 |
| `npm run test:watch` | 运行测试监视模式 |
| `npm run lint` | 检查代码规范 |
| `npm run lint:fix` | 自动修复代码规范问题 |
| `npm run security` | 检查安全漏洞 |
| `npm run build` | 构建项目（检查代码并运行测试） |

## 🗂 项目结构

```
{% projectName %}/
├── src/
│   ├── controllers/     # 控制器层
│   ├── middleware/      # 自定义中间件
│   ├── models/          # 数据模型
│   ├── routes/          # 路由定义
│   ├── utils/           # 工具函数
│   └── index.js         # 应用入口点
├── tests/               # 测试文件
├── public/              # 静态资源
├── .env.example         # 环境变量示例
├── .eslintrc.js         # ESLint 配置
├── .gitignore           # Git 忽略规则
├── package.json         # 项目依赖和脚本
└── README.md           # 项目说明
```

## 🌐 API 端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/` | GET | 欢迎页面和服务器信息 |
| `/health` | GET | 健康检查端点 |
| `/api/users` | GET | 获取用户列表 |
| `/api/users/:id` | GET | 获取特定用户 |
| `/api/users` | POST | 创建新用户 |

## 🔧 配置

### 环境变量

| 变量名 | 默认值 | 描述 |
|--------|--------|------|
| `NODE_ENV` | `development` | 运行环境 (development/production) |
| `PORT` | `3000` | 服务器端口 |
| `CORS_ORIGIN` | `http://localhost:3000` | 允许的跨域源 |
| `RATE_LIMIT_MAX` | `100` | 每15分钟最大请求数 |

### 自定义配置

您可以在 `src/config/` 目录中添加自定义配置文件，用于管理不同环境的设置。

## 🐳 Docker 支持

本项目包含 Docker 配置，可以快速容器化部署：

1. 构建 Docker 镜像：
```bash
docker build -t {% projectName %} .
```

2. 运行容器：
```bash
docker run -p 3000:3000 --env-file .env {% projectName %}
```

## 🧪 测试

本项目使用 Jest 作为测试框架：

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm test -- --coverage

# 监视模式运行测试
npm run test:watch
```

## 📦 部署

### 传统部署

1. 构建项目：
```bash
npm run build
```

2. 启动生产服务器：
```bash
npm start
```

### PM2 部署（推荐）

1. 全局安装 PM2：
```bash
npm install -g pm2
```

2. 使用 PM2 启动应用：
```bash
pm2 start ecosystem.config.js
```

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 获取帮助

- 查看 [Express.js 文档](https://expressjs.com/)
- 查看 [Fyre CLI 文档](https://github.com/LZJ-1212/fyre-cli)
- 提交 [Issue](https://github.com/LZJ-1212/fyre-cli/issues)

## 🙏 致谢

- [Express.js](https://expressjs.com/) - Web 框架
- [Fyre CLI](https://github.com/LZJ-1212/fyre-cli) - 项目脚手架工具
- 所有贡献者和用户

---

如有问题或建议，请通过 [Issue](https://github.com/LZJ-1212/fyre-cli/issues) 联系我们。