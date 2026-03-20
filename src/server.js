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
  const args = [cliPath, 'ai-create', description];

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
      process.stdout.write(data); 
      res.write(data);
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

app.listen(PORT, () => {
  console.log(`\n✅ 伺服器已套用【終極除錯版】代碼！誤殺機制已解除！`);
  console.log(`🚀 CodeCraft Web GUI 伺服器已啟動！`);
  console.log(`👉 請在瀏覽器開啟: http://localhost:${PORT}\n`);
});