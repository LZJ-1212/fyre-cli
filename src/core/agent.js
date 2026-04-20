const axios = require('axios');

// 統一語言設定函數 (供內部 Prompt 注入使用)
function getLangInstruction(lang) {
  return lang === 'en'
    ? 'CRITICAL: All user interfaces, comments, variable names, and database schemas MUST be written in strictly professional English.'
    : '請確保所有使用者介面文字、註解與提示訊息都使用流暢的繁體中文。';
}

// 第一層：全端架構師 (The Architect Agent)
async function callArchitectAgent(description, apiKey, lang = 'en') {
  const architectPrompt = `你是一位頂級的全端軟體架構師 (Full-Stack Architect)。你的任務是根據使用者的需求，規劃出一個完美、可擴展的專案結構。
【核心職責：全端與資料庫支援】
如果使用者的需求包含「需要長期儲存的資料」（如帳號、文章、訂單、待辦事項），你必須拋棄純前端架構，改為規劃【全端架構】：
1. 後端強制使用 Node.js + Express + SQLite (請規劃 \`server.js\` 以及 \`database.js\`)。
2. 必須規劃獨立的 API 路由檔案。
3. 前端請規劃 React、Vue 或原生 HTML，並在簡述中註明「透過 fetch API 呼叫後端」。

【輸出約束】：
1. 只允許輸出純 JSON 物件，鍵為檔案相對路徑，值為職責簡述。
2. 絕對不可以輸出純資料夾！
3. 必須包含 package.json，並在簡述中要求配置 sqlite3 (若有資料庫) 與 "dev" 啟動腳本。
4. ${getLangInstruction(lang)}
5. 嚴禁 Markdown 標籤。`;

  console.log('\n👑 [架構師] 正在分析需求並繪製專案藍圖...');

  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: architectPrompt }, { role: 'user', content: description }],
    response_format: { type: 'json_object' },
    temperature: 0.2
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  const content = response.data.choices[0].message.content;
  const jsonStart = content.indexOf('{');
  const jsonEnd = content.lastIndexOf('}');
  return JSON.parse(content.substring(jsonStart, jsonEnd + 1));
}

// 第二層：資深全端工程師 (The Coder Agent)
async function callCoderAgent(filePath, fileRole, blueprint, description, apiKey, lang = 'en') {
  const coderPrompt = `你是一位神級資深全端工程師。
【專案總需求】: ${description}
【架構藍圖】: \n${JSON.stringify(blueprint, null, 2)}

【當前唯一任務】: 請撰寫此檔案完整代碼：\`${filePath}\` (職責：${fileRole})

【協作鐵律】:
1. 嚴禁使用 Markdown 標籤 (如 \`\`\`javascript)。只輸出純文字代碼！
2. 【統一匯出規範】：React 專案強制使用具名匯出 (Named Exports)。
3. 【後端與資料庫】：若撰寫 Express 或 SQLite 邏輯，請確保包含完整的 Try/Catch，並正確配置 CORS。
4. ${getLangInstruction(lang)}`;

  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: coderPrompt }, { role: 'user', content: `請輸出 ${filePath} 的完整代碼。` }],
    temperature: 0.1,
    max_tokens: 8192
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  return response.data.choices[0].message.content.replace(/^```[\w-]*\n/i, '').replace(/```$/i, '').trim();
}

// 第 2.5 層：網頁搜尋代理 (The Web Search Agent)
async function callWebSearchAgent(errorLog, apiKey) {
  console.log(`\n🌐 [Web Search Agent] 啟動中...`);
  try {
    const queryPrompt = `根據報錯訊息產生一句適合丟進 Google 的英文搜尋關鍵字，必須包含技術環境詞彙。報錯：${errorLog}`;
    const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: queryPrompt }],
      temperature: 0.1
    }, { headers: { Authorization: `Bearer ${apiKey}` } });

    const searchQuery = response.data.choices[0].message.content.trim();
    const jinaRes = await axios.get(`https://s.jina.ai/${encodeURIComponent(searchQuery)}`);
    return jinaRes.data.slice(0, 3000);
  } catch (err) {
    return "";
  }
}

// 第三層：測試與除錯員 (The QA Agent)
async function callQAAgent(errorLog, currentFiles, webSearchResult, apiKey, lang = 'en') {
  const qaPrompt = `你是一位神級 QA 與除錯大師。
【當前代碼】:\n${JSON.stringify(currentFiles)}
【報錯訊息】:\n${errorLog}
【網路解法】:\n${webSearchResult || "無"}

【你的任務】: 找出出錯的檔案並修正。
1. 只回傳需要修改的檔案。輸出純 JSON 物件。
2. 嚴禁 Markdown 標籤。
3. ${getLangInstruction(lang)}`;

  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: qaPrompt }, { role: 'user', content: '專案編譯失敗了，請修正。' }],
    response_format: { type: 'json_object' },
    temperature: 0.1,
    max_tokens: 8192
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  const content = response.data.choices[0].message.content;
  const jsonStart = content.indexOf('{');
  return JSON.parse(content.substring(jsonStart, content.lastIndexOf('}') + 1));
}

// 基礎單一代理生成 (The Baseline Agent)
async function callDeepSeekAPI(description, apiKey, lang = 'en') {
  const systemPrompt = `你是一個負責帶領新手的「頂級資深全端架構師」。請根據描述生成一個極具商業質感、且【功能完全真實可用】的專案。

【核心行為準則】：
1. 全端與資料庫 (Full-Stack & DB)：如果需求需要儲存資料，【強制】建立 Node.js + Express + SQLite 後端！前端必須透過 fetch API 與後端溝通。若不需要資料庫，才允許使用 localStorage。
2. 多頁面與路由架構：如果需求包含多個頁面，主動建立路由架構。
3. 極致美學：漂亮的排版、卡片陰影、現代化配色。
4. 語言要求：${getLangInstruction(lang)}
5. 必須包含啟動腳本於 package.json。

約束：
- 輸出純 JSON 物件，鍵為相對檔案路徑，值為檔案完整內容。不要輸出 Markdown 標籤！`;

  const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
    model: 'deepseek-chat',
    messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: description }],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 8192
  }, { headers: { Authorization: `Bearer ${apiKey}` } });

  const content = response.data.choices[0].message.content;
  return JSON.parse(content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1));
}

module.exports = { callArchitectAgent, callCoderAgent, callWebSearchAgent, callQAAgent, callDeepSeekAPI };