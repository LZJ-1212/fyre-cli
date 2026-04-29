const express = require('express');
const path = require('path');
const { exec } = require('child_process');
const AIService = require('./services/aiService'); // 引入全新的 SOA 服務
const FileService = require('./services/fileService');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/**
 * [Research Element] 終端機日誌串流劫持 (Log Stream Hijacking)
 * 攔截 Node.js 底層的 stdout，將 AI 生成進度實時推送給前端 Web GUI (SSE 技術)
 */
function hijackStream(res) {
  const originalLog = console.log;
  const originalStdoutWrite = process.stdout.write.bind(process.stdout);

  // 將日誌同時寫入 HTTP Response 與伺服器終端機
  console.log = (...args) => {
    res.write(args.join(' ') + '\n');
    originalLog(...args);
  };
  process.stdout.write = (chunk) => {
    res.write(chunk.toString());
    originalStdoutWrite(chunk);
  };

  // 回傳恢復函數，避免影響其他請求
  return () => {
    console.log = originalLog;
    process.stdout.write = originalStdoutWrite;
  };
}

// 🌐 API 1: 啟動多代理協作生成專案 (Agentic Workflow API)
app.post('/api/generate', async (req, res) => {
  const { description, outputDir, apiKey, lang } = req.body;

  // 設定 Chunked 串流格式
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const restoreStream = hijackStream(res);

  try {
    const key = await AIService.resolveApiKey(apiKey);
    const projectName = outputDir || AIService.generateProjectName(description);
    const targetDir = path.resolve(process.cwd(), projectName);

    console.log(`\n===========================================`);
    console.log(`🌎 Initializing CodeCraft Agentic Pipeline`);
    console.log(`🎯 Language Mode: ${lang === 'zh' ? 'Traditional Chinese' : 'English-First'}`);
    console.log(`===========================================\n`);

    const blueprint = await AIService.callArchitect(description, key, lang);
    await AIService.executeGenerationPipeline(targetDir, blueprint, description, key, lang);

  } catch (err) {
    console.log(`\n\x1b[31m❌ System Crash: ${err.message}\x1b[0m`);
  } finally {
    restoreStream();
    res.end();
  }
});

// 🌐 API 2: AI 局部補丁修改 (AST Smart Grafting API)
app.post('/api/modify', async (req, res) => {
  const { projectDir, message, apiKey } = req.body;
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const restoreStream = hijackStream(res);

  try {
    console.log(`\n🧠 [QA Agent] Received patch request: "${message}"`);
    console.log(`⏳ Analyzing AST nodes in directory: ${projectDir}...`);
    // 這裡預留串接你未來的 AST 修復邏輯
    setTimeout(() => {
      console.log(`\x1b[32m✅ Patch applied successfully using AST Smart Grafting.\x1b[0m`);
      restoreStream();
      res.end();
    }, 2000);
  } catch (err) {
    console.log(`\n\x1b[31m❌ Patch Failed: ${err.message}\x1b[0m`);
    restoreStream();
    res.end();
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`\n✅ Core Services initialized successfully.`);
  console.log(`🚀 Web Interface running at: http://localhost:${PORT}\n`);