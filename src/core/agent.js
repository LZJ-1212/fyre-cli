const axios = require('axios');

// 第一層：架構師 (The Architect Agent)
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
    temperature: 0.2
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
    temperature: 0.1,
    max_tokens: 8192
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  let code = response.data.choices[0].message.content;
  code = code.replace(/^```[\w-]*\n/i, '').replace(/```$/i, '').trim();
  return code;
}

// 第 2.5 層：網頁搜尋代理 (The Web Search Agent)
async function callWebSearchAgent(errorLog, apiKey) {
  console.log(`\n🌐 [Web Search Agent] 正在啟動，準備上網尋找解決方案...`);
  try {
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

    const jinaRes = await axios.get(`https://s.jina.ai/${encodeURIComponent(searchQuery)}`);
    const searchResult = jinaRes.data.slice(0, 3000);
    console.log(`✅ [Web Search Agent] 成功獲取網路解答！`);
    return searchResult;
  } catch (err) {
    console.log(`⚠️ [Web Search Agent] 網路搜尋失敗 (${err.message})，將退回傳統盲修模式。`);
    return "";
  }
}

// 第三層：測試與除錯員 (The QA Agent)
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
    temperature: 0.1,
    max_tokens: 8192
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  const content = response.data.choices[0].message.content;
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('QA Agent 沒有回傳有效的 JSON 修正檔');

  return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
}

// 基礎單一代理生成 (The Baseline Agent)
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
    max_tokens: 8192
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  const content = response.data.choices[0].message.content;
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  if (jsonStart === -1 || jsonEnd === -1) throw new Error('API 沒有回傳有效的 JSON 專案結構');

  return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
}

module.exports = {
  callArchitectAgent,
  callCoderAgent,
  callWebSearchAgent,
  callQAAgent,
  callDeepSeekAPI
};