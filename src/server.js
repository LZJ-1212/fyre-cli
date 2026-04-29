const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const AIService = require('./services/aiService');
const FileService = require('./services/fileService');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// [核心修復] 使用全域變數鎖定機制，防止重複劫持導致的日誌倍增
let isStreamingHijacked = false;
let originalLog = console.log;
let originalStdoutWrite = process.stdout.write.bind(process.stdout);

/**
 * 終極防彈日誌串流劫持器
 */
function hijackStream(res) {
  if (isStreamingHijacked) return () => { }; // 如果已經在劫持中，不重複處理

  isStreamingHijacked = true;

  console.log = (...args) => {
    const msg = args.join(' ') + '\n';
    res.write(msg); // 發送到前端
    originalLog(...args); // 同步印在實體終端機
  };

  process.stdout.write = (chunk) => {
    res.write(chunk.toString());
    originalStdoutWrite(chunk);
  };

  // 返回還原函數
  return () => {
    console.log = originalLog;
    process.stdout.write = originalStdoutWrite;
    isStreamingHijacked = false;
  };
}

// 🌐 API 1: 啟動多代理協作生成專案 
app.post('/api/generate', async (req, res) => {
  const { description, outputDir, apiKey, lang } = req.body;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const restoreStream = hijackStream(res);

  try {
    const projectName = outputDir || AIService.generateProjectName(description);
    const targetPath = path.resolve(process.cwd(), projectName);

    console.log(`\n===========================================`);
    console.log(`🌎 Initializing CodeCraft Agentic Pipeline`);
    console.log(`🎯 Language Mode: ${lang === 'zh' ? '繁體中文' : 'English-First'}`);
    console.log(`===========================================\n`);

    const blueprint = await AIService.callArchitect(description, apiKey, lang);
    await AIService.executeGenerationPipeline(targetPath, blueprint, description, apiKey, lang);

  } catch (err) {
    console.log(`\n\x1b[31m❌ Fatal Error: ${err.message}\x1b[0m`);
  } finally {
    restoreStream();
    res.end();
  }
});

// 🌐 API 2: AI 魔法修復 (QA Agent)
app.post('/api/modify', async (req, res) => {
  const { projectDir, message, apiKey } = req.body;
  const targetPath = path.resolve(process.cwd(), projectDir || "");

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const restoreStream = hijackStream(res);

  try {
    await AIService.applyQAPatch(targetPath, message, apiKey);
    console.log(`\n\x1b[32m✅ Patch applied successfully using AST Smart Grafting.\x1b[0m`);
  } catch (err) {
    console.log(`\n\x1b[31m❌ Patch Failed: ${err.message}\x1b[0m`);
    console.log(`\x1b[33m💡 [Tip] 請嘗試再次點擊修復按鈕，讓 AI 重新嘗試。[0m\n`);
  } finally {
    restoreStream();
    res.end();
  }
});

// 🌐 API 3: 啟動生成好的專案 (實體視窗隔離模式)
app.post('/api/start', async (req, res) => {
  const { projectDir } = req.body;
  const targetPath = path.resolve(process.cwd(), projectDir || "");

  try {
    const batPath = path.join(targetPath, 'Start_Project.bat');

    if (fs.existsSync(batPath)) {
      // [核心修復] 僅使用 Windows start 指令彈出獨立視窗，徹底防止 Port 3000 被背景進程霸佔
      exec(`start "" "${batPath}"`, { cwd: targetPath });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Start_Project.bat not found. Please regenerate." });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🌐 API 4: 公網發布 (LocalTunnel)
app.post('/api/publish', async (req, res) => {
  const { projectDir } = req.body;
  const localtunnel = require('localtunnel');

  try {
    const tunnel = await localtunnel({ port: 3000 });
    console.log(`\n\x1b[36m🌐 Public Access Granted: ${tunnel.url}\x1b[0m`);
    res.json({ url: tunnel.url });

    tunnel.on('close', () => {
      console.log('🌐 Public tunnel closed.');
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to create tunnel: " + err.message });
  }
});

const PORT = 8080;
app.listen(PORT, () => {
  console.log(`\n===================================================`);
  console.log(`      🚀 Welcome to CodeCraft Agentic IDE 🚀`);
  console.log(`===================================================`);
  console.log(`\n[System] Booting up CodeCraft Agentic Workflow Engine...`);
  console.log(`✅ Core Services initialized successfully.`);
  console.log(`🚀 Web Interface running at: http://localhost:${PORT}\n`);
});