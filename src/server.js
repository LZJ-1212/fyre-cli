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
  const args = [path.join(__dirname, '../bin/cli.js'), 'ai-create-pro', `"${description}"`];

  if (outputDir) args.push('-o', outputDir);
  if (apiKey) args.push('-k', apiKey);
  if (install) args.push('-i');
  if (test) args.push('--test');
  if (force) args.push('-f');

  console.log('\n--- 🤖 準備啟動 AI 生成程序 ---');

  // 【核心修復：心跳機制 Keep-Alive】防止瀏覽器因長時間等待而斷開連線
  const heartbeat = setInterval(() => {
    if (!res.writableEnded) {
      res.write(' '); // 每秒發送一個空白字元，保持 HTTP 串流活躍
    } else {
      clearInterval(heartbeat);
    }
  }, 1000);

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
            clearInterval(heartbeat); // [A級規範：嚴格清除計時器，防止寫入已關閉的串流]
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
      clearInterval(heartbeat); // 關閉心跳
      console.log(`\n--- 程序結束 (Code: ${code}, Signal: ${signal}) ---`);
      if (code !== 0) {
        res.write(`\n\x1b[31m[系統提示] 生成程序異常結束 (代碼: ${code}, 訊號: ${signal})\x1b[0m\n`);
      }
      res.end();
    });

    child.on('error', (err) => {
      clearInterval(heartbeat); // 關閉心跳
      console.error('\n❌ 子程序發生錯誤:', err);
      res.write(`\n\x1b[31m[系統錯誤] 無法啟動 CLI: ${err.message}\x1b[0m\n`);
      res.end();
    });

    // 【架构级修复：进程生命周期强力接管】
    // 监听前端请求意外中断（如用户刷新页面、关闭浏览器）
    req.on('close', () => {
      if (!res.writableEnded) {
        console.warn('\n⚠️ [系統警告] 偵測到前端連線異常中斷！');
        // 確保子程序仍存活時才進行擊殺
        if (child && child.pid && !child.killed) {
          console.warn(`🔪 正在強制終止孤立的 AI 子程序 (PID: ${child.pid})...`);
          try {
            // Windows 系統需要特殊的強制擊殺方式，防止子進程殘留
            if (process.platform === 'win32') {
              const { exec } = require('child_process');
              exec(`taskkill /pid ${child.pid} /T /F`);
            } else {
              child.kill('SIGKILL');
            }
          } catch (e) {
            console.error('無法終止程序:', e);
          }
        }
      }
    });

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
    const basePath = process.cwd();
    const targetPath = path.resolve(basePath, projectDir);

    // 嚴格校驗：確保解析後的路徑必須以當前工作目錄為前綴，防範目錄穿越 (Path Traversal)
    if (!targetPath.startsWith(basePath)) {
      res.write('\n\x1b[31m❌ [系統安全防禦] 偵測到非法越權路徑訪問！請求已被攔截。\x1b[0m\n');
      return res.end();
    }

    if (history && fs.existsSync(targetPath)) {
      // 使用格式化的 JSON (包含縮排) 以利於後續 Debug，而不是擠成一行的字串
      fs.writeFileSync(path.join(targetPath, '.codecraft-chat.json'), JSON.stringify(history, null, 2));
    }
  } catch (err) {
    // 必須使用 error 級別而非 warn，並在發生寫入異常時中斷後續 AI 呼叫，避免資料不同步
    console.error('❌ 致命錯誤：無法寫入歷史紀錄。', err.stack);
    res.write(`\n\x1b[31m[系統錯誤] 歷史記憶寫入失敗: ${err.message}\x1b[0m\n`);
    return res.end();
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

    // 【补齐进程生命周期强力接管】
    req.on('close', () => {
      if (!res.writableEnded) {
        console.warn('\n⚠️ [系統警告] 偵測到前端連線異常中斷 (Modify API)！');
        if (child && child.pid && !child.killed) {
          console.warn(`🔪 正在強制終止孤立的 AI 子程序 (PID: ${child.pid})...`);
          try {
            if (process.platform === 'win32') {
              require('child_process').exec(`taskkill /pid ${child.pid} /T /F`);
            } else {
              child.kill('SIGKILL');
            }
          } catch (e) { }
        }
      }
    });
  } catch (error) {
    res.write(`\n\x1b[31m[伺服器錯誤] ${error.message}\x1b[0m\n`);
    res.end();
  }
});

app.post('/api/load', (req, res) => {
  const { projectDir } = req.body;

  if (!projectDir || typeof projectDir !== 'string') {
    return res.status(400).json({ error: '無效的專案目錄參數' });
  }

  const basePath = process.cwd();
  const targetPath = path.resolve(basePath, projectDir);

  // 同步執行目錄穿越防護
  if (!targetPath.startsWith(basePath)) {
    return res.status(403).json({ error: '拒絕存取：越權目錄訪問' });
  }

  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: `找不到專案目錄: ${projectDir}` });
  }

  let history = [];
  const historyFile = path.join(targetPath, '.codecraft-chat.json');

  if (fs.existsSync(historyFile)) {
    try {
      history = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
    } catch (e) {
      // 捕獲 JSON 格式損壞，向前端返回明確的錯誤狀態，而不是靜默吞噬
      console.error(`❌ 解析歷史紀錄失敗 (${historyFile}):`, e.message);
      return res.status(500).json({ error: '對話記憶檔案已損壞，請手動檢查或清除 .codecraft-chat.json' });
    }
  }

  res.json({ success: true, history });
});

app.listen(PORT, () => {
  console.log(`\n✅ 伺服器已套用【終極除錯版】代碼！誤殺機制已解除！`);
  console.log(`🚀 CodeCraft Web GUI 伺服器已啟動！`);
  console.log(`👉 請在瀏覽器開啟: http://localhost:${PORT}\n`);
});