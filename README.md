# 🚀 CodeCraft Agent

> **基于 LLM 的本地自动化软件开发代理系统**
> An Autonomous Local Software Development Agent Based on LLMs

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-%3E%3D%2018.0-brightgreen.svg)
![Architecture](https://img.shields.io/badge/Architecture-Multi--Agent-orange)

CodeCraft 是一款专为「非技术背景用户（小白）」以及「追求效率的开发者」设计的 AI 编程代理工具。它不仅能通过自然语言一键生成完整的项目结构（React, Vue, Node.js 等），还首创了 **Continuous AI Patching（持续 AI 修补）** 技术，允许用户在可视化的 Web 界面中与 AI 像聊天一样持续交互，实时修改本地代码，实现“所见即所得”的软件开发体验。

## ✨ 核心特性 (Key Features)

- 🪄 **开箱即用 (Zero-Click Setup)**：专为 Windows 用户设计的全自动引导脚本。自动检测环境，后台静默下载 Node.js 与核心依赖，小白用户只需“双击”即可启动。
- 🖥️ **现代可视化交互 (Local Web GUI)**：告别枯燥的命令行。内置基于 Express + Tailwind CSS 驱动的深色模式 Web 仪表盘。
- 🔄 **跨进程实时日志 (Real-time IPC Streaming)**：底层采用 HTTP 分块传输 (`Transfer-Encoding: chunked`)，将 Node.js 子进程的编译与安装进度实时渲染到 Web 虚拟终端中。
- 🧠 **具备记忆的 AI 代理 (Context-Aware Agent)**：自动扫描本地项目目录结构，过滤冗余文件（如 `node_modules`, `package-lock.json`），精准读取核心源码，让 AI 拥有上下文记忆，拒绝“金鱼脑”。
- 🛠️ **防呆与安全机制 (Defensive Programming)**：严格过滤路径穿越攻击（Path Traversal），API Key 内存级驻留（不落盘），确保系统底层安全。

## 🏗️ 系统架构 (Architecture)

CodeCraft 采用 **CLI-First（命令行优先）** 与 **Local Server-Client（本地主从架构）** 相结合的设计模式：
1. **Core CLI (`bin/cli.js`)**：系统的核心大脑，负责与 DeepSeek API 交互、解析 JSON 响应、操作本地文件系统（增删改查）。
2. **Local Server (`src/server.js`)**：充当网关，通过 `process.execPath` 与 `spawn` 唤起 CLI 核心，规避 Windows 底层路径空格问题。
3. **Web Client (`src/public`)**：双态界面（Two-state UI）。状态一负责项目初始化收集；状态二化身 AI 聊天室，结合 RAG（检索增强生成）雏形，将历史聊天记录与本地代码打包发送给 AI 决策。

## 📦 快速启动 (Quick Start - For Users)

我们为非技术人员提供了最简单的启动方式：

1. 在本仓库点击 `Code` -> `Download ZIP` 并解压到您的电脑。
2. 双击运行目录下的 **`启动 CodeCraft.bat`**。
3. 脚本会自动为您检测并安装所有环境（Node.js 与 npm 包）。
4. 几秒钟后，您的浏览器会自动弹出 CodeCraft 交互界面，即可开始您的创作！

## 💻 开发者指南 (Developer Setup)

如果您是开发者，希望通过命令行使用 CodeCraft：

```bash
# 1. 克隆仓库
git clone [https://github.com/YourUsername/codecraft.git](https://github.com/YourUsername/codecraft.git)
cd codecraft

# 2. 安装依赖并全局链接
npm install
npm install -g .

# 3. 启动 Web GUI（推荐）
codecraft ui

# 4. 或者直接使用 CLI 生成项目
codecraft ai-create "一个包含深色模式的 React 待办事项列表" -o my-todo-app -k YOUR_API_KEY

🤖 提示词技巧 (Prompting Tips)
在与 CodeCraft Agent 对话时，尝试使用以下结构以获得最佳效果：

明确技术栈：「使用 React + Tailwind CSS 制作...」

细节描述：「...要求包含卡片阴影效果、圆角边框以及 Hover 动画」

持续修改：「帮我把刚刚生成的按钮改成红色，并加上一个设置图标（请使用 SVG 标签）」

📄 开源协议
本项目基于 MIT License 授权。