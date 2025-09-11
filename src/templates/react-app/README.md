# {% projectName %}

![React](https://img.shields.io/badge/React-18.x-blue?style=flat-square&logo=react)
![Vite](https://img.shields.io/badge/Vite-4.x-purple?style=flat-square&logo=vite)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

这是一个使用 [Fyre CLI](https://github.com/LZJ-1212/fyre-cli) 和 Vite 创建的现代化 React 项目模板，专为快速启动开发环境而设计。

## ✨ 特性

- ⚡️ **极速启动** - 基于 Vite 的快速冷启动和热模块替换
- 🎨 **现代化设计** - 包含深色/浅色主题支持
- 📱 **响应式设计** - 完美适配移动端和桌面端
- 🛡️ **类型安全** - 支持 TypeScript (可选)
- ✅ **代码质量** - 预配置 ESLint 和 Prettier
- 🧪 **测试就绪** - 集成 Vitest 和 Testing Library
- 📦 **生产就绪** - 优化的构建配置和代码分割
- 🚀 **开发体验** - 热重载、错误边界和性能监控

## 🚀 开始使用

### 前置要求

- Node.js 16.0.0 或更高版本
- npm 7.0.0 或更高版本 或 yarn 或 pnpm
- Git

### 安装步骤

1. 安装依赖：

```bash
npm install
```

2. 启动开发服务器：

```bash
npm run dev
```

3. 在浏览器中访问 http://localhost:3000

### 构建生产版本

```bash
npm run build
```

构建完成后，可以在 `dist` 目录中找到生产就绪的文件。

### 预览生产构建

```bash
npm run preview
```

## 📖 可用脚本

| 命令 | 描述 |
|------|------|
| `npm run dev` | 启动开发服务器（带热重载） |
| `npm run build` | 构建生产版本 |
| `npm run preview` | 预览生产构建 |
| `npm run lint` | 运行代码检查 |
| `npm run lint:fix` | 自动修复代码规范问题 |
| `npm test` | 运行测试套件 |
| `npm run test:ui` | 启动 Vitest UI 界面 |
| `npm run test:coverage` | 运行测试并生成覆盖率报告 |

## 🗂 项目结构

```
{% projectName %}/
├── public/                 # 公共静态资源
│   └── vite.svg           # Vite 徽标
├── src/
│   ├── assets/            # 静态资源（图片、字体等）
│   │   └── react.svg      # React 徽标
│   ├── components/        # 可复用组件
│   ├── pages/             # 页面组件
│   ├── hooks/             # 自定义 React Hooks
│   ├── utils/             # 工具函数
│   ├── App.jsx            # 主应用组件
│   ├── App.css            # 应用样式
│   ├── main.jsx           # 应用入口点
│   └── index.css          # 全局样式
├── index.html             # HTML 入口点
├── vite.config.js         # Vite 配置
├── package.json           # 项目配置和依赖
├── .gitignore            # Git 忽略规则
└── README.md             # 项目说明
```

## 🎨 自定义配置

### 环境变量

项目支持环境变量配置。复制 `.env.example` 文件创建 `.env` 文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，根据您的需求调整配置：

```env
VITE_APP_TITLE={% projectName %}
VITE_API_URL=http://localhost:8080
VITE_APP_ENV=development
```

### 路径别名

项目配置了路径别名，使导入更加简洁：

```jsx
// 代替相对路径
import Button from '../../../components/Button'

// 使用路径别名
import Button from '@components/Button'
```

可用别名：
- `@` → `src`
- `@components` → `src/components`
- `@pages` → `src/pages`
- `@hooks` → `src/hooks`
- `@utils` → `src/utils`
- `@assets` → `src/assets`

## 📦 部署

### Vercel 部署

1. 安装 Vercel CLI：

```bash
npm i -g vercel
```

2. 部署项目：

```bash
vercel
```

### Netlify 部署

1. 构建项目：

```bash
npm run build
```

2. 将 `dist` 目录拖放到 Netlify 部署界面。

### 传统部署

1. 构建项目：

```bash
npm run build
```

2. 将 `dist` 目录中的文件上传到您的 Web 服务器。

## 🧪 测试

本项目使用 Vitest 作为测试框架：

```bash
# 运行所有测试
npm test

# 运行测试并生成覆盖率报告
npm run test:coverage

# 启动测试 UI 界面
npm run test:ui
```

## 🔧 开发指南

### 添加新页面

1. 在 `src/pages/` 目录中创建新组件
2. 在 `src/App.jsx` 中添加路由配置

### 添加新组件

1. 在 `src/components/` 目录中创建新组件
2. 使用路径别名导入组件

### 添加样式

- 全局样式：编辑 `src/index.css`
- 组件样式：创建与组件同名的 CSS 文件
- 使用 CSS 变量实现主题支持

## 🤝 贡献指南

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目基于 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🆘 获取帮助

- 查看 [React 文档](https://reactjs.org/)
- 查看 [Vite 文档](https://vitejs.dev/)
- 提交 [Issue](https://github.com/LZJ-1212/fyre-cli/issues)

## 🙏 致谢

- [React](https://reactjs.org/) - 用户界面库
- [Vite](https://vitejs.dev/) - 构建工具
- [Fyre CLI](https://github.com/LZJ-1212/fyre-cli) - 项目脚手架工具
- 所有贡献者和用户

---

如有问题或建议，请通过 [Issue](https://github.com/LZJ-1212/fyre-cli/issues) 联系我们。