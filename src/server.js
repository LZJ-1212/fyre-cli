const express = require('express');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/generate', (req, res) => {
  const { description, outputDir, apiKey, install, test, force } = req.body;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  if (!apiKey && !process.env.DEEPSEEK_API_KEY) {
    res.write('\n\x1b[31m❌ 錯誤：請輸入 DeepSeek API Key。\x1b[0m\n');
    return res.end();
  }

  const cliPath = path.resolve(__dirname, '../bin/cli.js');
  // 構建 CLI 命令 (改為呼叫支援多代理架構的 ai-create-pro)
  const args = ['ai-create-pro', `"${description}"`];

  if (outputDir) args.push('-o', outputDir);
  if (apiKey) args.push('-k', apiKey);
  if (install) args.push('-i');
  if (test) args.push('--test');
  if (force) args.push('-f');

  console.log('\n--- 🤖 準備啟動 AI 生成程序 ---');

  try {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    child.stdout.on('data', (data) => {
      // 同步印在黑色的終端機視窗，方便我們監控
      const text = data.toString();
      process.stdout.write(text);
      res.write(text);

      // 【核心修復】當偵測到專案的 Dev Server 啟動網址時，主動結束前端請求
      // 支援 localhost 或是 127.0.0.1 格式
      if (text.match(/http:\/\/(localhost|127\.0\.0\.1):\d+/)) {
        // 稍微延遲 500 毫秒，確保最後一段日誌傳送完畢，然後強制結束 HTTP 回應
        setTimeout(() => {
          if (!res.writableEnded) {
            res.write('\n\x1b[32m[系統提示] 專案伺服器已啟動，Web UI 準備解除鎖定！\x1b[0m\n');
            res.end(); // 這行會讓前端的 fetch() 成功 resolve，進入下一個畫面！
          }
        }, 500);
      }
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      res.write(`\x1b[31m${data.toString()}\x1b[0m`);
    });

    child.on('close', (code, signal) => {
      console.log(`\n--- 程序結束 (Code: ${code}, Signal: ${signal}) ---`);
      if (code !== 0) {
        res.write(`\n\x1b[31m[系統提示] 生成程序異常結束 (代碼: ${code}, 訊號: ${signal})\x1b[0m\n`);
      }
      res.end();
    });

    child.on('error', (err) => {
      console.error('\n❌ 子程序發生錯誤:', err);
      res.write(`\n\x1b[31m[系統錯誤] 無法啟動 CLI: ${err.message}\x1b[0m\n`);
      res.end();
    });

    // 【重要修復】已經徹底刪除 req.on('close') 的誤殺機制！

  } catch (error) {
    console.error('\n❌ 伺服器發生例外:', error);
    res.write(`\n\x1b[31m[伺服器錯誤] 發生未預期的錯誤: ${error.message}\x1b[0m\n`);
    res.end();
  }
});

// 【新增】接收前端聊天指令，呼叫 AI 進行代碼修改
app.post('/api/modify', (req, res) => {
  const { projectDir, message, apiKey, history } = req.body;

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  if (!apiKey && !process.env.DEEPSEEK_API_KEY) {
    res.write('\n\x1b[31m❌ 錯誤：請確保 API Key 有效。\x1b[0m\n');
    return res.end();
  }

  // 【新增】將前端傳來的對話紀錄，寫入專案目錄下的隱藏記憶檔
  try {
    const targetPath = path.resolve(process.cwd(), projectDir);
    if (history && fs.existsSync(targetPath)) {
      fs.writeFileSync(path.join(targetPath, '.codecraft-chat.json'), JSON.stringify(history));
    }
  } catch (err) {
    console.warn('⚠️ 無法寫入歷史紀錄:', err.message);
  }

  const cliPath = path.resolve(__dirname, '../bin/cli.js');
  const args = [cliPath, 'ai-patch', message, '-d', projectDir];
  if (apiKey) args.push('-k', apiKey);

  try {
    const child = spawn(process.execPath, args, {
      cwd: process.cwd(),
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
      res.write(data);
    });
    child.stderr.on('data', (data) => {
      process.stderr.write(data);
      res.write(`\x1b[31m${data.toString()}\x1b[0m`);
    });

    child.on('close', (code) => {
      if (code !== 0) res.write(`\n\x1b[31m[系統提示] 修改程序異常結束 (代碼: ${code})\x1b[0m\n`);
      res.end();
    });
  } catch (error) {
    res.write(`\n\x1b[31m[伺服器錯誤] ${error.message}\x1b[0m\n`);
    res.end();
  }
});

// 【新增】讀取現有專案與對話紀錄的 API
app.post('/api/load', (req, res) => {
  const { projectDir } = req.body;
  const targetPath = path.resolve(process.cwd(), projectDir);

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: `找不到專案目錄: ${projectDir}` });
  }

  let history = [];
  const historyFile = path.join(targetPath, '.codecraft-chat.json');
  if (fs.existsSync(historyFile)) {
    try { history = JSON.parse(fs.readFileSync(historyFile, 'utf8')); } catch (e) { }
  }

  res.json({ success: true, history });
});

app.listen(PORT, () => {
  console.log(`\n✅ 伺服器已套用【終極除錯版】代碼！誤殺機制已解除！`);
  console.log(`🚀 CodeCraft Web GUI 伺服器已啟動！`);
  console.log(`👉 請在瀏覽器開啟: http://localhost:${PORT}\n`);
});