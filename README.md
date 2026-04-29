# 🚀 CodeCraft: Agentic Workflow IDE

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-LTS-green.svg)
![Architecture](https://img.shields.io/badge/Architecture-SOA%20%7C%20Agentic-orange.svg)
![Status](https://img.shields.io/badge/Status-Deployment%20Ready-brightgreen.svg)

CodeCraft is a sophisticated, AI-driven development environment and project generation tool designed to bridge the gap between natural language requirements and enterprise-grade software architecture. Powered by Large Language Models (LLMs) and advanced Abstract Syntax Tree (AST) manipulation, it acts as your autonomous engineering team.

## ✨ Core Innovations (Research Elements)

- **🤖 Multi-Agent Collaboration (Agentic Workflow)**: Utilizes a specialized hierarchy of AI Agents (Architect, Coder, and QA) to plan, execute, and self-heal codebases autonomously.
- **🌲 AST-Based Smart Patching**: Resolves LLM context-window limitations by extracting method skeletons for large files, allowing precise code grafting without overwriting entire modules.
- **🛡️ Robust Security & Self-Healing**: Features Strict Path Traversal Mitigation to prevent malicious file overrides, coupled with an automated QA loop (`npm run build`) that triggers self-correction upon failure.
- **⚡ Zero-Configuration Deployment**: Bootstraps the entire environment seamlessly across operating systems via an unattended installation script.

## 🏗️ System Architecture (SOA)

The system is refactored using the **Service-Oriented Architecture (SOA)**, strictly adhering to the Single Responsibility Principle (SRP):
- `bin/cli.js`: The lightweight command dispatcher.
- `src/services/aiService.js`: Orchestrates the DeepSeek Agentic Workflow and enforces English-First Dynamic Contextual Constraints.
- `src/services/fileService.js`: Handles infrastructure IO, Path Traversal Defense, and AST parsing.
- `src/server.js` & `public/index.html`: Provides a real-time, terminal-streamed Web GUI with interactive QA resolution modals.

## 🚀 Quick Start (Zero-Config)

CodeCraft is designed to be **Deployment Ready**. No manual setup of Node.js or `npm` is required if you are on Windows.

1. Clone or download this repository.
2. Double-click the **`OpenCodeCraft.bat`** file.
3. The script will automatically:
   - Detect and install Node.js (via `winget`) if missing.
   - Resolve and install all `npm` dependencies.
   - Boot up the CodeCraft Web GUI.
4. Open the provided `localhost` URL in your browser, enter your API Key, and start crafting!

## 🌐 English-First Policy

To maintain professional software engineering standards, CodeCraft enforces an **English-First** policy. All AI-generated code comments, variable naming conventions, database schemas, and User Interfaces are generated in professional-grade English by default, ensuring immediate enterprise readiness.

---
*Developed as part of the ITP4913M Final Year Project. Designed for Excellence.*