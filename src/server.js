const express = require('express');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const AIService = require('./services/aiService');
const FileService = require('./services/fileService');
const EnvService = require('./services/envService');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// [核心修復] 移除 console.log 的劫持，只保留底層 stdout 攔截，徹底消滅雙重回音！
let isStreamingHijacked = false;
let originalStdoutWrite = process.stdout.write.bind(process.stdout);

/**
 * 終極防彈日誌串流劫持器 (純淨無回音版)
 */
function hijackStream(res) {
  if (isStreamingHijacked) return () => { };

  isStreamingHijacked = true;

  // 唯一攔截點：因為所有的 console.log 最終都會流過這裡
  process.stdout.write = (chunk, encoding, callback) => {
    if (typeof chunk === 'string') {
      res.write(chunk);
    } else if (Buffer.isBuffer(chunk)) {
      res.write(chunk.toString('utf8'));
    }
    return originalStdoutWrite(chunk, encoding, callback);
  };

  // 返回還原函數
  return () => {
    process.stdout.write = originalStdoutWrite;
    isStreamingHijacked = false;
  };
}

// --- [實機演示核心：圖片自動獲取邏輯] ---
app.get('/api/get-image', (req, res) => {
    const { q } = req.query;
    // 如果 AI 沒給關鍵字，就給一張隨機風景圖
    if (!q) return res.redirect('https://picsum.photos/800/600');

    // 關鍵：將 AI 生成的關鍵字轉發給 LoremFlickr (目前最穩定的免費圖庫)
    const targetUrl = `https://loremflickr.com/800/600/${encodeURIComponent(q)}`;
    
    console.log(`\n🖼️ [Asset Discovery] Redirecting request for [${q}] to real asset...`);
    res.redirect(targetUrl);
});

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
    console.log(`\x1b[33m💡 [Tip] 請嘗試再次點擊修復按鈕，讓 AI 重新嘗試。\x1b[0m\n`);
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
app.listen(PORT, async () => {
  console.log(`\n===================================================`);
  console.log(`      🚀 Welcome to CodeCraft Agentic IDE 🚀`);
  console.log(`===================================================`);

  // 啟動環境檢查
  await EnvService.runHealthCheck();

  console.log(`\n[System] Booting up CodeCraft Agentic Workflow Engine...`);
  console.log(`✅ Core Services initialized successfully.`);
  console.log(`🚀 Web Interface running at: http://localhost:${PORT}\n`);
});