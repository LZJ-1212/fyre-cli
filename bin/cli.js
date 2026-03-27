#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const axios = require('axios');
const util = require('util');
const exec = util.promisify(require('child_process').exec);

// ==========================================
// 1. 全域設定與常數 (Configuration)
// ==========================================
program.version(require('../package.json').version, '-v, --version', '輸出當前版本');
const prompt = inquirer.createPromptModule();

// 【恢復】本地模板設定 (對齊報告附錄 E.3)
const TEMPLATES = {
  node: {
    name: 'Node.js (基礎)',
    description: '基礎 Node.js 專案模板',
    dir: 'node-basic',
    required: ['package.json', 'src/index.js', 'src/routes/api.js', '.gitignore', 'README.md']
  },
  react: {
    name: 'React',
    description: 'React 專案模板',
    dir: 'react-app',
    required: ['package.json', 'src/main.jsx', 'src/App.jsx', 'index.html', 'vite.config.js']
  },
  vue: {
    name: 'Vue',
    description: 'Vue 專案模板',
    dir: 'vue-app',
    required: ['package.json', 'src/main.js', 'src/App.vue', 'index.html', 'vite.config.js']
  }
};

// ==========================================
// 2. 共用工具函數 (Utilities)
// ==========================================
async function processFiles(dir, replacements) {
  const files = await fs.readdir(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      await processFiles(filePath, replacements);
    } else {
      let content = await fs.readFile(filePath, 'utf8');
      for (const [key, value] of Object.entries(replacements)) {
        content = content.replace(new RegExp(`{% ${key} %}`, 'g'), value);
      }
      await fs.writeFile(filePath, content, 'utf8');
    }
  }
}

// 【恢復】檢查模板完整性
async function checkTemplateIntegrity(templateDir, templateType) {
  const requiredFiles = TEMPLATES[templateType]?.required || [];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(path.join(templateDir, file)));

  if (missingFiles.length > 0) {
    console.warn('\n⚠️  警告: 模板不完整，缺少以下檔案:');
    missingFiles.forEach(file => console.warn(`    - ${file}`));
    const { continueAnyway } = await prompt([{ name: 'continueAnyway', type: 'confirm', message: '是否繼續創建專案?', default: false }]);
    if (!continueAnyway) {
      console.log('操作已取消。');
      process.exit(1);
    }
  }
}

async function getGitConfig() {
  try {
    const { stdout: name } = await exec('git config user.name');
    const { stdout: email } = await exec('git config user.email');
    return { name: name.trim(), email: email.trim() };
  } catch {
    return { name: 'Unknown', email: '' };
  }
}

async function runCommand(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, stdio: 'pipe', shell: true });
    let errorOutput = '';
    proc.stderr.on('data', (data) => { errorOutput += data.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve(true);
      else reject(new Error(`執行失敗 (代碼 ${code})\n${errorOutput}`));
    });
  });
}

// ==========================================
// 3. 環境配置模組 (Environment Configuration)
// ==========================================
async function checkCommand(cmd) {
  try {
    const { stdout } = await exec(`${cmd} --version`);
    return stdout.trim();
  } catch { return null; }
}

async function installSoftware(software, softwareName) {
  const commands = {
    win32: { node: 'winget install OpenJS.NodeJS', git: 'winget install Git.Git' },
    darwin: { node: 'brew install node', git: 'brew install git' },
    linux: { node: 'sudo apt update && sudo apt install -y nodejs npm', git: 'sudo apt update && sudo apt install -y git' }
  };
  const cmd = commands[process.platform]?.[software];
  if (!cmd) {
    console.error(`❌ 目前不支援您的作業系統自動安裝 ${softwareName}，請手動安裝。`);
    return false;
  }
  console.log(`\n📦 正在嘗試安裝 ${softwareName}...`);
  try {
    const installProcess = spawn(cmd.split(' ')[0], cmd.split(' ').slice(1), { stdio: 'inherit', shell: true });
    await new Promise((resolve, reject) => { installProcess.on('close', code => code === 0 ? resolve() : reject()); });
    console.log(`✅ ${softwareName} 安裝成功！`);
    return true;
  } catch {
    console.warn(`⚠️ ${softwareName} 安裝失敗，請考慮手動安裝。`);
    return false;
  }
}

// ==========================================
// 4. AI 專案生成模組 (AI Generation)
// ==========================================
function generateSafeProjectName(description) {
  const words = description.toLowerCase().match(/[a-z0-9]+/g) || [];
  let name = words.slice(0, 3).join('-');
  return name.length >= 3 ? name.slice(0, 50) : `ai-project-${Date.now()}`;
}

async function getApiKey(options) {
  if (options.apiKey) return options.apiKey;
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;

  const { apiKey } = await prompt([{
    name: 'apiKey',
    type: 'password',
    mask: '*',
    message: '🔑 請輸入 DeepSeek API 密鑰（只在記憶體中使用，不會保存）:',
    validate: input => input ? true : 'API 密鑰不能為空'
  }]);
  return apiKey;
}

async function callDeepSeekAPI(description, apiKey) {
  const systemPrompt = `你是一個負責帶領「完全不懂程式的小白」完成專案的「頂級資深前端架構師」與「全端工程師」。請根據描述生成一個極具商業質感、且【功能完全真實可用】的專案。

【你的核心行為準則】：
1. 拒絕靜態空殼 (Deep Logic)：你不只是排版設計師，你必須實作真實的業務邏輯！任何表單、按鈕、資料增刪改查，都必須有對應的 JavaScript 邏輯，並強制使用 \`localStorage\` 將資料保存在本地端，確保重新整理後資料不會消失。
2. 多頁面與路由架構 (Multi-page Routing)：如果使用者的需求包含多個頁面（例如：首頁、日曆頁、設定頁），你【必須】主動建立路由架構！
   - 若為 React 專案：請自動在 package.json 引入 \`react-router-dom\`，建立 \`src/pages\` 目錄拆分頁面，並在 App.jsx 設置好路由與全域導覽列 (Navbar)。
   - 若為原生 HTML 專案：請生成多個獨立的 .html 檔案 (例如 index.html, calendar.html)，並在每個頁面都加上能互相跳轉的導覽列。
3. 極致美學：直接幫使用者寫出漂亮的排版 (Flex/Grid)、現代化配色、卡片陰影、圓角、與 Hover 動畫效果。
4. 圖示與圖片的鐵律：遇到圖片強制使用公開 URL (如 https://picsum.photos/800/600)。遇到圖示 (Icon) 務必使用「極簡的 SVG」或 Unicode (如 📅, 🗑️)，絕對禁止生成超長 SVG <path> 避免 JSON 損毀。
5. 框架與腳本：
   - 必須包含 "dev" 或 "start" 腳本於 package.json。
   - 【極度重要】如果使用 Vite 請正常配置；如果使用 live-server，請務必在 package.json 腳本中加上 "--ignore=node_modules --no-browser" 參數，絕對不可自己開啟瀏覽器！

約束：
- 輸出格式必須是純 JSON 物件，鍵為相對檔案路徑，值為檔案完整內容。
- 不要輸出任何 Markdown 標籤 (如 \`\`\`json)，只要純 JSON！`;

  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: description }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 8192 // 【新增這行】解放字數上限，允許 AI 輸出超大專案！
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  const content = response.data.choices[0].message.content;
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('API 沒有回傳有效的 JSON 專案結構');

  return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
}

async function writeGeneratedFiles(targetDir, filesMap) {
  for (const [filePath, content] of Object.entries(filesMap)) {
    if (filePath.includes('..') || path.isAbsolute(filePath)) continue;
    await fs.outputFile(path.join(targetDir, filePath), content, 'utf8');
  }
}

// ==========================================
// 【新增】AI 專案修改模組 (AI Patching)
// ==========================================
async function readProjectFiles(targetDir) {
  const filesMap = {};

  // 忽略無效的目錄 (這些傳給 AI 毫無意義，且 node_modules 會直接讓程式崩潰)
  const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'public', 'assets'];

  // 【新增】精準排除「不需要讓 AI 看的自動生成巨型檔案」
  const ignoreFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];

  // 允許讀取的程式碼副檔名
  const allowedExts = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', '.json', '.md'];

  async function scan(currentPath, relativePath = '') {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (ignoreDirs.includes(entry.name)) continue;
      if (ignoreFiles.includes(entry.name)) continue; // 排除 lock 檔

      const fullPath = path.join(currentPath, entry.name);
      const relPath = path.join(relativePath, entry.name);

      if (entry.isDirectory()) {
        await scan(fullPath, relPath);
      } else {
        const ext = path.extname(entry.name);

        // 除了副檔名，也允許讀取 Dockerfile 等特殊設定檔
        if (allowedExts.includes(ext) || entry.name === 'Dockerfile' || entry.name.startsWith('.env')) {
          const stat = await fs.stat(fullPath);

          // 【優化】安全上限提高到 500KB (約五十萬字元)，保證高品質代碼不會被腰斬
          if (stat.size < 500 * 1024) {
            const content = await fs.readFile(fullPath, 'utf8');
            // 將 Windows 系統的路徑斜線標準化
            filesMap[relPath.replace(/\\/g, '/')] = content;
          } else {
            console.warn(`\n⚠️ 警告: ${relPath} 檔案超過 500KB，為防止 AI 超載已自動略過。`);
          }
        }
      }
    }
  }

  await scan(targetDir);
  return filesMap;
}

// ==========================================
// 5. CLI 指令註冊 (Commands)
// ==========================================

program
  .command('setup')
  .description('檢查並配置本地開發環境 (Node.js, Git)')
  .action(async () => {
    console.log('🔍 正在掃描系統環境...\n');
    const [nodeVer, gitVer] = await Promise.all([checkCommand('node'), checkCommand('git')]);

    console.log(nodeVer ? `✅ Node.js: ${nodeVer}` : '❌ Node.js 未安裝');
    console.log(gitVer ? `✅ Git: ${gitVer}` : '❌ Git 未安裝');

    if (nodeVer && gitVer) return console.log('\n🎉 您的開發環境非常完整！');

    const choices = [];
    if (!nodeVer) choices.push({ name: 'Node.js', value: 'node', checked: true });
    if (!gitVer) choices.push({ name: 'Git', value: 'git', checked: true });

    const { selected } = await prompt([{ name: 'selected', type: 'checkbox', message: '選擇要安裝的環境:', choices }]);
    if (selected.includes('node')) await installSoftware('node', 'Node.js');
    if (selected.includes('git')) await installSoftware('git', 'Git');
    console.log('\n🎉 環境配置結束。若有安裝新軟體，請重啟終端機！');
  });

// 【恢復】list 指令
program
  .command('list')
  .description('列出所有本地內建的可用模板')
  .action(() => {
    console.log('\n📦 可用專案模板：');
    Object.entries(TEMPLATES).forEach(([key, value]) => {
      console.log(`  - \x1b[36m${key.padEnd(10)}\x1b[0m : ${value.name} (${value.description})`);
    });
    console.log('');
  });

// 【恢復】create 指令 (本地模板生成)
program
  .command('create <project-name>')
  .description('創建一個新的專案（使用本地預設模板）')
  .option('-t, --template <template-name>', '指定專案模板（例如: node, react, vue）')
  .option('-f, --force', '強制覆蓋已存在目錄', false)
  .option('-g, --git', '初始化git倉庫', false)
  .option('-i, --install', '自動安裝依賴', true)
  .option('-a, --author <author>', '設置項目作者', '')
  .action(async (projectName, options) => {
    try {
      const targetDir = path.resolve(process.cwd(), projectName);

      // 安全防護
      if (targetDir === process.cwd() || targetDir === path.parse(process.cwd()).root) {
        console.error('\n❌ 錯誤: 為了安全起見，禁止直接覆蓋當前目錄。請指定一個新的資料夾名稱。');
        return process.exit(1);
      }

      if (fs.existsSync(targetDir) && !options.force) {
        const { action } = await prompt([{ name: 'action', type: 'list', message: `目錄 ${projectName} 已存在:`, choices: [{ name: '覆蓋', value: true }, { name: '取消', value: false }] }]);
        if (!action) return;
      }

      let template = options.template;
      if (!template || !TEMPLATES[template]) {
        const { selectedTemplate } = await prompt([{
          name: 'selectedTemplate',
          type: 'list',
          message: '請選擇一個專案模板:',
          choices: Object.keys(TEMPLATES).map(k => ({ name: TEMPLATES[k].name, value: k }))
        }]);
        template = selectedTemplate;
      }

      const templateDir = path.join(__dirname, '../src/templates', TEMPLATES[template].dir);
      if (!fs.existsSync(templateDir)) {
        console.error(`\n❌ 錯誤: 找不到模板目錄 ${templateDir}，請確保 src/templates 存在。`);
        return process.exit(1);
      }

      await fs.remove(targetDir);
      await checkTemplateIntegrity(templateDir, template);

      console.log(`\n📁 正在複製模板檔案到 ${projectName}...`);
      await fs.copy(templateDir, targetDir);

      const gitConfig = await getGitConfig();
      const author = options.author || (gitConfig.email ? `${gitConfig.name} <${gitConfig.email}>` : 'Unknown');

      console.log('🔧 正在處理佔位符替換...');
      await processFiles(targetDir, { projectName, author, year: new Date().getFullYear() });

      console.log(`✅ 專案 ${projectName} 創建成功！`);

      let shouldGit = options.git;
      if (!shouldGit) {
        const { initGit } = await prompt([{ name: 'initGit', type: 'confirm', message: '是否初始化 Git 倉庫?', default: true }]);
        shouldGit = initGit;
      }
      if (shouldGit) {
        console.log('📦 初始化 Git 倉庫...');
        await runCommand('git', ['init'], targetDir).catch(() => console.warn('⚠️ Git 初始化失敗'));
      }

      if (options.install) {
        console.log('📦 安裝依賴中... (已隱藏繁瑣的警告訊息)');
        await runCommand('npm', ['install'], targetDir).catch((err) => console.warn('⚠️ 依賴安裝警告:\n', err.message));
      }

      console.log(`\n🎉 下一步:\n  cd ${projectName}\n  npm run dev (或 npm start)\n`);
    } catch (error) {
      console.error(`\n❌ 創建失敗: ${error.message}`);
    }
  });

program
  .command('ai-create <description>')
  .description('通過自然語言描述生成專案')
  .option('-o, --output <dir>', '指定輸出目錄')
  .option('-f, --force', '強制覆蓋')
  .option('-i, --install', '自動安裝依賴')
  .option('--test', '執行自動編譯測試，失敗則回滾')
  .option('-k, --api-key <key>', 'API 密鑰')
  .action(async (description, options) => {
    let spinner;
    try {
      const projectName = options.output ? path.basename(options.output) : generateSafeProjectName(description);
      const targetDir = path.resolve(process.cwd(), options.output || projectName);

      if (targetDir === process.cwd() || targetDir === path.parse(process.cwd()).root) {
        console.error('\n❌ 錯誤: 為了安全起見，禁止直接覆蓋當前目錄。請指定一個新的資料夾名稱。');
        return process.exit(1);
      }

      if (fs.existsSync(targetDir) && !options.force) {
        const { action } = await prompt([{ name: 'action', type: 'list', message: `目錄 ${projectName} 已存在:`, choices: [{ name: '覆蓋', value: true }, { name: '取消', value: false }] }]);
        if (!action) return;
      }
      await fs.remove(targetDir);

      const apiKey = await getApiKey(options);

      // 【新增這行】強迫 Node.js 刷新緩衝區，讓網頁立刻印出這句話
      console.log('\n🚀 正在連線至 DeepSeek 伺服器，AI 思考中 (約需 30~60 秒)，請耐心等候...');

      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let i = 0;
      spinner = setInterval(() => {
        process.stdout.write(`\r\x1b[36m🤖 正在呼叫 DeepSeek AI 生成代碼，請稍候... ${frames[i = ++i % frames.length]}\x1b[0m`);
      }, 80);

      const filesMap = await callDeepSeekAPI(description, apiKey);

      clearInterval(spinner);
      process.stdout.write('\r\x1b[32m✅ DeepSeek AI 代碼生成完畢！                          \x1b[0m\n');

      await fs.ensureDir(targetDir);
      await writeGeneratedFiles(targetDir, filesMap);

      const gitConfig = await getGitConfig();
      const author = gitConfig.email ? `${gitConfig.name} <${gitConfig.email}>` : 'Unknown';
      await processFiles(targetDir, { projectName, author, year: new Date().getFullYear() });

      console.log(`\n✅ 專案 ${projectName} 檔案寫入成功！`);

      if (options.install) {
        console.log('📦 安裝依賴中... (已隱藏繁瑣的警告訊息)');
        await runCommand('npm', ['install'], targetDir).catch((err) => {
          console.warn('⚠️ 依賴安裝時遇到警告或錯誤，部分套件可能未正確安裝：');
          console.error(err.message);
        });

        if (options.test) {
          console.log('\n🧪 執行 AI 代理自我測試...');
          try {
            const pkg = await fs.readJson(path.join(targetDir, 'package.json'));
            if (pkg.scripts?.build) {
              await runCommand('npm', ['run', 'build'], targetDir);
              console.log('✅ 自我測試通過！');
            }
          } catch (err) {
            console.error('\n❌ 測試失敗！觸發回滾，正在刪除專案...');
            console.error(err.message);
            await fs.remove(targetDir);
            return process.exit(1);
          }
        }

        console.log('\n🚀 啟動伺服器...');
        const pkg = await fs.readJson(path.join(targetDir, 'package.json'));
        const runScript = pkg.scripts?.dev ? 'dev' : (pkg.scripts?.start ? 'start' : null);

        if (runScript) {
          const server = spawn('npm', ['run', runScript], { cwd: targetDir, shell: true });
          let browserOpened = false;

          server.stdout.on('data', data => {
            process.stdout.write(data);
            const match = data.toString().match(/http:\/\/(localhost|127\.0\.0\.1):\d+/);
            if (match && !browserOpened) {
              browserOpened = true;
              const url = match[0];
              const openCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
              spawn(openCmd, [url], { shell: true });
            }
          });

          server.stderr.on('data', data => {
            process.stderr.write(data);
          });
        }
      } else {
        console.log(`\n🎉 下一步:\n  cd ${projectName}\n  npm install\n  npm run dev`);
      }
    } catch (error) {
      if (spinner) clearInterval(spinner);
      process.stdout.write('\n');
      console.error(`❌ 錯誤: ${error.message}`);
      process.exit(1);
    }
  });

// 【修改】ai-patch 指令 (持續對話修改)
program
  .command('ai-patch <message>')
  .description('透過自然語言指令修改現有專案代碼')
  .option('-d, --dir <directory>', '指定要修改的專案目錄', process.cwd())
  .option('-k, --api-key <key>', 'API 密鑰')
  .action(async (message, options) => {
    let spinner;
    try {
      const targetDir = path.resolve(process.cwd(), options.dir);
      if (!fs.existsSync(targetDir)) throw new Error(`找不到目錄: ${targetDir}`);

      console.log(`\n🔍 正在讀取專案代碼: ${path.basename(targetDir)} ...`);
      const currentFiles = await readProjectFiles(targetDir);
      const apiKey = await getApiKey(options);

      // 【新增】讀取專案大腦裡的對話記憶
      let chatHistory = [];
      const historyFile = path.join(targetDir, '.codecraft-chat.json');
      if (fs.existsSync(historyFile)) {
        try { chatHistory = JSON.parse(await fs.readFile(historyFile, 'utf8')); } catch (e) { }
      }

      const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
      let i = 0;
      spinner = setInterval(() => {
        process.stdout.write(`\r\x1b[35m🤖 CodeCraft Agent 正在深思熟慮並修改代碼... ${frames[i = ++i % frames.length]}\x1b[0m`);
      }, 80);

      const systemPrompt = `你是一個負責帶領「完全不懂程式的小白」完成專案的「頂級資深前端架構師」與「全端工程師」。請根據描述生成一個極具商業質感、且【功能完全真實可用】的專案。

【你的核心行為準則】：
1. 拒絕靜態空殼 (Deep Logic)：你不只是排版設計師，你必須實作真實的業務邏輯！任何表單、按鈕、資料增刪改查，都必須有對應的 JavaScript 邏輯，並強制使用 \`localStorage\` 將資料保存在本地端，確保重新整理後資料不會消失。
2. 多頁面與路由架構 (Multi-page Routing)：如果使用者的需求包含多個頁面（例如：首頁、日曆頁、設定頁），你【必須】主動建立路由架構！
   - 若為 React 專案：請自動在 package.json 引入 \`react-router-dom\`，建立 \`src/pages\` 目錄拆分頁面，並在 App.jsx 設置好路由與全域導覽列 (Navbar)。
   - 若為原生 HTML 專案：請生成多個獨立的 .html 檔案 (例如 index.html, calendar.html)，並在每個頁面都加上能互相跳轉的導覽列。
3. 極致美學：直接幫使用者寫出漂亮的排版 (Flex/Grid)、現代化配色、卡片陰影、圓角、與 Hover 動畫效果。
4. 圖示與圖片的鐵律：遇到圖片強制使用公開 URL (如 https://picsum.photos/800/600)。遇到圖示 (Icon) 務必使用「極簡的 SVG」或 Unicode (如 📅, 🗑️)，絕對禁止生成超長 SVG <path> 避免 JSON 損毀。
5. 框架與腳本：
   - 必須包含 "dev" 或 "start" 腳本於 package.json。
   - 【極度重要】如果使用 Vite 請正常配置；如果使用 live-server，請務必在 package.json 腳本中加上 "--ignore=node_modules --no-browser" 參數，絕對不可自己開啟瀏覽器！

約束：
- 輸出格式必須是純 JSON 物件，鍵為相對檔案路徑，值為檔案完整內容。
- 不要輸出任何 Markdown 標籤 (如 \`\`\`json)，只要純 JSON！`;

      // 【新增】建構帶有記憶的 API 請求
      const apiMessages = [{ role: 'system', content: systemPrompt }];
      if (chatHistory.length > 0) {
        // 只保留最後 6 句對話，避免 Token 爆炸
        apiMessages.push(...chatHistory.slice(-6));
      } else {
        apiMessages.push({ role: 'user', content: message });
      }

      const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
        model: 'deepseek-chat',
        messages: apiMessages,
        response_format: { type: 'json_object' },
        temperature: 0.3, // 稍微提高溫度，讓 AI 有發揮創意的空間
        max_tokens: 8192 // 【新增這行】防止修改大型檔案時被腰斬！
      }, { headers: { Authorization: `Bearer ${apiKey}` } });

      const content = response.data.choices[0].message.content;
      const jsonStart = content.indexOf('{');
      const jsonEnd = content.lastIndexOf('}');
      if (jsonStart === -1 || jsonEnd === -1) throw new Error('API 沒有回傳有效的 JSON');

      const updatedFilesMap = JSON.parse(content.substring(jsonStart, jsonEnd + 1));

      clearInterval(spinner);
      process.stdout.write('\r\x1b[32m✅ AI 修改方案生成完畢！                          \x1b[0m\n');

      console.log('🔧 正在將修改應用到專案中...');
      for (const [filePath, fileContent] of Object.entries(updatedFilesMap)) {
        if (filePath.includes('..') || path.isAbsolute(filePath)) continue;
        const absPath = path.join(targetDir, filePath);

        if (fileContent === null) {
          await fs.remove(absPath);
          console.log(`  🗑️  刪除: ${filePath}`);
        } else {
          await fs.outputFile(absPath, fileContent, 'utf8');
          console.log(`  📝 更新: ${filePath}`);
        }
      }
      console.log(`\n🎉 修改完成！`);

    } catch (error) {
      if (spinner) clearInterval(spinner);
      process.stdout.write('\n');
      console.error(`❌ 修改失敗: ${error.message}`);
      process.exit(1);
    }
  });

// 【新增】ui 指令 (啟動圖形化介面)
program
  .command('ui')
  .description('啟動圖形化網頁介面 (Web GUI)')
  .action(() => {
    const serverPath = path.join(__dirname, '../src/server.js');

    // 在背景啟動 Express 伺服器
    const serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      shell: true
    });

    // 延遲 1.5 秒等待伺服器啟動後，自動打開使用者的預設瀏覽器
    setTimeout(() => {
      const url = 'http://localhost:8080';
      const openCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
      spawn(openCmd, [url], { shell: true });
    }, 1500);

    // 捕捉 Ctrl+C 來優雅關閉伺服器
    process.on('SIGINT', () => {
      serverProcess.kill();
      process.exit();
    });
  });

program.parse(process.argv);