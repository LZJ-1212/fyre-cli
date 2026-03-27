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

// ==========================================
// 【進化版】多代理工作流 (Agentic Workflow)
// ==========================================

// 第一層：架構師 (The Architect Agent)
// 職責：不寫程式碼，只規劃專案結構與 package.json 依賴
async function callArchitectAgent(description, apiKey) {
  const architectPrompt = `你是一位頂級的軟體架構師 (Software Architect)。你的任務是根據使用者的需求，規劃出一個完美、現代化、可擴展的專案檔案結構。
【請注意】：
1. 你「不需要」寫出具體的程式碼實現。
2. 你只需要回傳該專案需要哪些「具體檔案」，以及該檔案的「職責簡述」。
3. 【極度重要】只允許輸出「具體的檔案名稱」(包含副檔名，如 .js, .jsx, .css)，絕對【不可以】輸出純資料夾 (如 src/assets/)！
4. 必須包含 package.json，並在簡述中強制要求配置 Vite 構建工具與 "dev" 啟動腳本。
5. 若為 React 專案，請務必規劃 vite.config.js。

【輸出約束】：
- 輸出必須是純 JSON 物件。
- 鍵 (Key) 為檔案的相對路徑 (例如 "src/App.jsx" 或 "package.json")。
- 值 (Value) 為該檔案的具體職責描述與需要包含的關鍵字。
- 絕對不要輸出 Markdown 標籤 (如 \`\`\`json)，只要純 JSON。`;

  console.log('\n👑 [架構師] 正在分析需求並繪製專案藍圖...');

  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: architectPrompt },
      { role: 'user', content: description }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.2 // 架構規劃需要極度嚴謹，所以溫度調低
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  const content = response.data.choices[0].message.content;
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('架構師沒有回傳有效的 JSON 藍圖');

  const blueprint = JSON.parse(content.substring(jsonStart, jsonEnd + 1));
  console.log('✅ [架構師] 藍圖繪製完畢！共規劃了', Object.keys(blueprint).length, '個檔案。');
  return blueprint;
}

// 第二層：資深工程師 (The Coder Agent)
// 職責：讀取藍圖，專心為「單一檔案」撰寫最高品質的程式碼
async function callCoderAgent(filePath, fileRole, blueprint, description, apiKey) {
  const coderPrompt = `你是一位神級資深前端工程師，目前正在與架構師合作開發專案。
【專案總需求】: ${description}
【架構師的完整藍圖】: 
${JSON.stringify(blueprint, null, 2)}

【你的當前唯一任務】:
請撰寫這個檔案的完整原始碼：\`${filePath}\`
該檔案的具體職責是：${fileRole}

【極度重要約束 (團隊協作鐵律)】:
1. 嚴禁使用 Markdown 標籤 (如 \`\`\`javascript)。
2. 只輸出純文字的代碼內容，絕對不要包含任何解釋！
3. 【統一匯出規範】：為了避免多檔案協作時的 Import/Export 錯誤，所有 React 元件、Hooks、Contexts、常數，【強制全部使用具名匯出 (Named Exports)】（例如：export const MyComponent = ...），絕對禁止使用 export default！
4. 【依賴套件規範】：絕對禁止 import 任何沒有在 package.json 藍圖中明確列出的第三方套件（例如：絕對禁止使用 prop-types）！
5. 如果撰寫 package.json，請確保 "scripts" 包含 "dev": "vite"。
6. 如果撰寫 index.html，請加上 <script type="module" src="/src/main.jsx"></script>。`;

  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: coderPrompt },
      { role: 'user', content: `請輸出 ${filePath} 的完整代碼。` }
    ],
    temperature: 0.1, // 降低溫度，確保代碼精準且不出錯
    max_tokens: 8192
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  let code = response.data.choices[0].message.content;
  // 清理 AI 可能不小心加上的 Markdown 標記
  code = code.replace(/^```[\w-]*\n/i, '').replace(/```$/i, '').trim();
  return code;
}

// ==========================================
// 第 2.5 層：網頁搜尋代理 (The Web Search Agent)
// 職責：把報錯轉成精準的 Google 關鍵字，並爬取最新解法
// ==========================================
async function callWebSearchAgent(errorLog, apiKey) {
  console.log(`\n🌐 [Web Search Agent] 正在啟動，準備上網尋找解決方案...`);

  try {
    // 1. 讓 AI 提煉出最精準的搜尋關鍵字 (加上環境上下文，防止搜到舊文章)
    const queryPrompt = `你是一個精通 React 18 與 Vite 的資深工程師。請根據以下的報錯訊息，產生一句「最適合丟進 Google 搜尋」的英文關鍵字。
    【報錯訊息】: ${errorLog}
    【約束】:
    1. 關鍵字必須包含 "React", "Vite" 等環境詞彙。
    2. 只能輸出純文字的搜尋關鍵字，不要引號，不要任何解釋。`;

    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: queryPrompt }],
      temperature: 0.1
    }, { headers: { Authorization: `Bearer ${apiKey}` } });

    const searchQuery = response.data.choices[0].message.content.trim();
    console.log(`🔍 [Web Search Agent] 產生搜尋關鍵字: "${searchQuery}"`);
    console.log(`📡 [Web Search Agent] 正在讀取網路上的最新技術討論...`);

    // 2. 呼叫 Jina Search API (直接回傳 Markdown 格式的搜尋結果)
    const jinaRes = await axios.get(`https://s.jina.ai/${encodeURIComponent(searchQuery)}`);

    // 取前 3000 個字元，避免查到的網頁太長導致 Token 爆炸
    const searchResult = jinaRes.data.slice(0, 3000);
    console.log(`✅ [Web Search Agent] 成功獲取網路解答！`);

    return searchResult;
  } catch (err) {
    console.log(`⚠️ [Web Search Agent] 網路搜尋失敗 (${err.message})，將退回傳統盲修模式。`);
    return ""; // 搜尋失敗就回傳空字串，不影響原本的 QA 流程
  }
}

// 第三層：測試與除錯員 (The QA Agent)
// 職責：閱讀終端機報錯，找出 Bug 並提供修正後的程式碼
async function callQAAgent(errorLog, currentFiles, webSearchResult, apiKey) {
  const qaPrompt = `你是一位神級的 QA 測試工程師與除錯大師。
【當前專案代碼】:
${JSON.stringify(currentFiles)}

【終端機報錯訊息 (Error Log)】:
${errorLog}

【網路搜尋到的可能解決方案 (Web Search Results)】:
${webSearchResult ? webSearchResult : "無網路資料，請依賴自身知識判斷。"}

【你的唯一任務】:
根據「報錯訊息」與「網路解決方案」，找出是哪些檔案寫錯了，並幫我把出錯的檔案修好。
請特別注意網路解答中提到的 Vite 或 React 18 最新語法規範，不要使用過時的寫法。

【極度重要約束】:
1. 只需要回傳【需要被修改的檔案】。沒有更動的檔案請絕對不要回傳！
2. 輸出格式必須是純 JSON 物件，鍵為相對檔案路徑，值為修正後的完整代碼內容。
3. 嚴禁使用 Markdown 標籤 (如 \`\`\`json)，只要純文字 JSON！
4. 如果報錯顯示缺少某個套件，請務必順便修改 package.json 把它加進去。`;

  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: qaPrompt },
      { role: 'user', content: `專案編譯失敗了，請幫我修正報錯的檔案。` }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1, // 除錯需要極度精準
    max_tokens: 8192
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  const content = response.data.choices[0].message.content;
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('QA Agent 沒有回傳有效的 JSON 修正檔');

  return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
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
          // 加上 detached: true，並把 stdio 設為 ignore 或特定配置，讓它在背景獨立運行
          const server = spawn('npm', ['run', runScript], {
            cwd: targetDir,
            shell: true,
            detached: true, // 允許在背景執行
            stdio: ['ignore', 'pipe', 'pipe']
          });

          // 讓 Node.js 主程式不要等待這個子程式結束
          server.unref();

          let browserOpened = false;
          server.stdout.on('data', data => {
            process.stdout.write(data);
            const match = data.toString().match(/http:\/\/(localhost|127\.0\.0\.1):\d+/);
            if (match && !browserOpened) {
              browserOpened = true;
              const url = match[0];
              const openCmd = process.platform === 'win32' ? 'start' : (process.platform === 'darwin' ? 'open' : 'xdg-open');
              spawn(openCmd, [url], { shell: true });

              // 【關鍵修復】抓到網址、打開瀏覽器後，強制結束這個 CLI 進程，讓 Web UI 收到成功訊號！
              console.log('\n✅ 伺服器啟動成功！即將進入對話模式...');
              process.exit(0);
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

      // 🌟 [時光機備份]
      console.log('💾 正在建立修改前的防護存檔 (Git Checkpoint)...');
      await runCommand('git', ['add', '.'], targetDir).catch(() => { });
      await runCommand('git', ['commit', '-m', `Backup before ai-patch: ${message}`], targetDir).catch(() => { });

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

      // 🌟 [時光機驗證]
      console.log('🧪 正在驗證修改是否引發致命錯誤...');
      try {
        await runCommand('npm', ['run', 'build'], targetDir);
        console.log(`\n🎉 修改完成且驗證通過！`);
      } catch (err) {
        console.log(`\x1b[31m❌ 警告：AI 的修改導致專案編譯失敗！\x1b[0m`);
        console.log(`⏪ 正在觸發時光機回滾 (Rollback)，恢復上一版代碼...`);
        await runCommand('git', ['reset', '--hard', 'HEAD'], targetDir);
        await runCommand('git', ['clean', '-fd'], targetDir);
        console.log(`\n✅ 專案已安全恢復！請嘗試換一種方式告訴 AI 您的需求。`);
      }

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

program
  .command('test-architect <description>')
  .description('測試架構師代理')
  .action(async (description) => {
    const apiKey = await getApiKey({});
    try {
      const blueprint = await callArchitectAgent(description, apiKey);
      console.log('\n📋 產出的架構藍圖如下：');
      console.log(blueprint);
    } catch (e) {
      console.error(e);
    }
  });

// 【終極武器】多代理協作生成指令
program
  .command('ai-create-pro <description>')
  .description('使用 Agentic Workflow (多代理架構) 生成大型真實專案')
  .option('-o, --output <dir>', '指定輸出目錄')
  .option('-k, --api-key <key>', 'API 密鑰')
  .option('-i, --install', '自動安裝依賴')
  .option('--test', '執行自動編譯測試，失敗則回滾')
  .option('-f, --force', '強制覆蓋')
  .action(async (description, options) => {
    try {
      const apiKey = await getApiKey(options);
      const projectName = options.output || generateSafeProjectName(description);
      const targetDir = path.resolve(process.cwd(), projectName);

      console.log(`\n🚀 啟動 Agentic Workflow (多代理協作模式)...\n`);

      // 第 1 步：呼叫架構師
      const blueprint = await callArchitectAgent(description, apiKey);
      const fileNames = Object.keys(blueprint);

      console.log(`\n👷 [工程師] 收到藍圖，準備開始編寫 ${fileNames.length} 個檔案...\n`);
      await fs.ensureDir(targetDir);

      // 第 2 步：迴圈呼叫工程師 (逐一生成檔案)
      let count = 1;
      for (const [filePath, fileRole] of Object.entries(blueprint)) {
        process.stdout.write(`⏳ (${count}/${fileNames.length}) 正在撰寫 ${filePath} ... `);
        try {
          // 呼叫工程師 AI
          const code = await callCoderAgent(filePath, fileRole, blueprint, description, apiKey);

          // 邊生成邊寫入本地端！不怕跑到一半斷線！
          const absPath = path.join(targetDir, filePath);
          await fs.outputFile(absPath, code, 'utf8');

          console.log(`\x1b[32m✅ 完成!\x1b[0m`);
        } catch (err) {
          console.log(`\x1b[31m❌ 失敗: ${err.message}\x1b[0m`);
        }
        count++;
      }

      // ==========================================
      // 第 3 步：QA Agent 自動測試與修復迴圈
      // ==========================================
      console.log(`\n📦 [系統] 正在自動安裝依賴套件 (npm install)...`);
      await runCommand('npm', ['install'], targetDir);

      console.log(`\n🧪 [系統] 正在執行編譯測試 (npm run build)...`);
      let maxRetries = 2; // 最多允許 AI 自動修復 2 次
      let testPassed = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          // 嘗試編譯專案 (這是 Vite/React 抓 Bug 最準的方式)
          await runCommand('npm', ['run', 'build'], targetDir);
          console.log(`\x1b[32m✅ [QA 測試] 第 ${attempt} 次編譯測試通過！專案無嚴重 Bug！\x1b[0m`);
          testPassed = true;
          break; // 成功就跳出除錯迴圈
        } catch (error) {
          console.log(`\x1b[31m❌ [QA 測試] 編譯失敗！(已擷取錯誤紀錄)\x1b[0m`);
          if (attempt === maxRetries) {
            console.log(`⚠️ 已達到最大自動修復次數。`);
            console.log(`\n🕵️ [審查員] 正在將錯誤翻譯為白話文，並生成決策選項...\n`);
            try {
              const errorLog = error.message.slice(-2000);
              const reviewerPrompt = `你是一位資深產品經理與技術審查員。專案目前遇到編譯錯誤。
【報錯訊息】:
${errorLog}

【你的任務】:
1. 將冷冰冰的報錯訊息「翻譯」成完全不懂程式的小白能看懂的繁體中文解釋。
2. 給出 3 個不同的解決方案讓小白選擇（例如：A. 拔除出錯的套件 B. 修改導入路徑 C. 換一種寫法）。

【輸出約束】:
必須為純 JSON 格式，絕對不可有 Markdown 標籤：
{
  "message": "親切的白話文解釋...",
  "options": [
    "選項 A 的具體描述",
    "選項 B 的具體描述",
    "選項 C 的具體描述"
  ]
}`;
              const reviewerResponse = await axios.post('https://api.deepseek.com/v1/chat/completions', {
                model: 'deepseek-chat',
                messages: [{ role: 'system', content: reviewerPrompt }, { role: 'user', content: '請分析錯誤並給出選項。' }],
                response_format: { type: 'json_object' },
                temperature: 0.3
              }, { headers: { Authorization: `Bearer ${apiKey}` } });

              const reviewerContent = reviewerResponse.data.choices[0].message.content;
              const jsonStart = reviewerContent.indexOf('{');
              const jsonEnd = reviewerContent.lastIndexOf('}');
              const reviewerJSON = reviewerContent.substring(jsonStart, jsonEnd + 1);

              // 輸出這個特殊的秘密標籤，讓前端的 Web UI 攔截它！
              console.log(`___REVIEWER_ACTION___:${reviewerJSON.replace(/\n/g, '')}`);
            } catch (err) {
              console.log(`⚠️ 審查員分析失敗: ${err.message}`);
            }
            break;
          }

          console.log(`\n🕵️ [QA Agent] 正在啟動除錯程序 (第 ${attempt} 次救援)...`);
          const currentFiles = await readProjectFiles(targetDir);
          const errorLog = error.message.slice(-2000);

          try {
            // 🌟 0. [RAG 聯網檢索] 讓 AI 上網查解法
            const webSearchResult = await callWebSearchAgent(errorLog, apiKey);

            // 🌟 1. [時光機備份] 在 AI 亂動程式碼之前，先強制存檔
            console.log(`💾 [系統保護] 正在建立 Git 還原點...`);
            await runCommand('git', ['add', '.'], targetDir).catch(() => { });
            await runCommand('git', ['commit', '-m', `Auto backup before QA attempt ${attempt}`], targetDir).catch(() => { });

            // 🌟 2. 套用 AI 的修復方案 (把網頁搜尋結果傳給 QA)
            console.log(`🧠 [QA Agent] 正在統整網路解答與報錯，撰寫修復代碼...`);
            const fixedFilesMap = await callQAAgent(errorLog, currentFiles, webSearchResult, apiKey);

            // ===== 以下是必須保留的寫入與驗證邏輯 =====
            for (const [filePath, fileContent] of Object.entries(fixedFilesMap)) {
              const absPath = path.join(targetDir, filePath);
              await fs.outputFile(absPath, fileContent, 'utf8');
              console.log(`  🩹 QA 已嘗試修改: ${filePath}`);
            }
            console.log(`\n🔄 [系統] 重新安裝套件並驗證修復結果...`);
            await runCommand('npm', ['install'], targetDir);

            // 🌟 3. [時光機驗證] 立即測試這次修復有沒有把專案搞得更糟
            try {
              await runCommand('npm', ['run', 'build'], targetDir);
              // 如果執行到這裡，代表修復成功！
              console.log(`\x1b[32m✅ [系統保護] QA 修復驗證成功！保留修改。\x1b[0m`);
              testPassed = true;
              break; // 跳出大迴圈
            } catch (verifyErr) {
              // 🌟 4. [時光機回滾] 修復失敗！立刻倒轉時間！
              console.log(`\x1b[31m❌ [系統保護] QA 這次修復無效甚至更糟，觸發時光機回滾 (Rollback)！\x1b[0m`);
              await runCommand('git', ['reset', '--hard', 'HEAD'], targetDir);
              await runCommand('git', ['clean', '-fd'], targetDir); // 清除 AI 亂新增的檔案
              console.log(`⏪ [系統保護] 代碼已安全恢復到修復前的狀態。`);

              // 丟出錯誤讓外層迴圈繼續處理或進入 Reviewer
              throw new Error("QA 修復驗證失敗");
            }

          } catch (qaErr) {
            if (qaErr.message !== "QA 修復驗證失敗") {
              console.log(`\x1b[31m❌ [QA Agent] 修復過程發生異常: ${qaErr.message}\x1b[0m`);
            }
            // 如果這是最後一次機會，就會進到下一輪的 Reviewer Modal
          }
        }
      }


      console.log(`\n🎉 專案 ${projectName} 已經由 AI 團隊合力完成！`);
      if (testPassed) {
        console.log(`👉 專案已經通過編譯測試！您可以直接執行：\n  cd ${projectName}\n  npm run dev\n`);
      } else {
        console.log(`👉 專案目前可能還有小部分 Bug，建議您使用 CodeCraft Web UI 載入專案繼續修改。\n`);
      }

    } catch (error) {
      console.error(`\n❌ 執行失敗: ${error.message}`);
    }
  });

program.parse(process.argv);