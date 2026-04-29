const axios = require('axios');
const inquirer = require('inquirer');
const path = require('path');
const fs = require('fs-extra');
// 注意：這裡假設你將原本 cli.js 中的 runCommand 移到了 fileService，或者你可以暫時寫在這邊
const FileService = require('./fileService');

/**
 * 語言指令工廠 (Language Instruction Factory)
 * [How] 根據傳入的 lang 參數動態生成 Prompt 約束。
 * [Why] 滿足 A 級標準中的「國際化/英文優先」要求，確保系統輸出的變數、註解、UI 皆符合工業級英文規範。
 */
function getLangInstruction(lang) {
    if (lang === 'zh') {
        return 'CRITICAL: The user requested Chinese. Please use fluent Traditional Chinese for all UI text, comments, and console outputs.';
    }
    // 預設強制使用英文 (English-First Policy)
    return 'CRITICAL: You MUST use strictly professional English for ALL user interfaces, code comments, variable names, database schemas, and console outputs. NO CHINESE is allowed.';
}

class AIService {
    /**
     * 解析並獲取 API 密鑰
     */
    static async resolveApiKey(cliKey) {
        if (cliKey) return cliKey;
        if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;

        const { apiKey } = await inquirer.prompt([{
            name: 'apiKey',
            type: 'password',
            mask: '*',
            message: '🔑 Enter your DeepSeek API Key (In-memory only):',
            validate: input => input ? true : 'API Key cannot be empty'
        }]);
        return apiKey;
    }

    /**
     * 從自然語言描述生成安全的專案名稱
     */
    static generateProjectName(description) {
        const words = description.toLowerCase().match(/[a-z0-9]+/g) || [];
        let name = words.slice(0, 3).join('-');
        return name.length >= 3 ? name.slice(0, 50) : `ai-project-${Date.now()}`;
    }

    /**
     * 階段 1：呼叫架構師代理 (The Architect Agent)
     * [How] 傳入系統級 Prompt 與語言約束，要求 LLM 返回 JSON 格式的專案藍圖。
     */
    static async callArchitect(description, apiKey, lang) {
        console.log(`\n👑 [Architect Agent] Analyzing requirements and designing blueprint...`);
        // [進階系統設計] 企業級架構師提示詞：強制引入資料庫與現代化 UI 框架
        const architectPrompt = `You are an elite Enterprise Software Architect. Design a PRODUCTION-READY, Deployment-Grade Full-Stack architecture based on the user's description.
CRITICAL Requirements to maximize token usage and quality:
1. REAL IMAGES CAPABILITY (NO PLACEHOLDERS): You MUST design a Backend API route (e.g., /api/images) that fetches real images from public APIs. The frontend MUST use this to render REAL images.
2. MULTI-PAGE REQUIREMENT: DO NOT build a single-page application (SPA) unless specifically asked. You MUST design a multi-page structure (e.g., index.html, detail.html, about.html) with proper navigation links between them.
3. FRONTEND SIMPLICITY: You MUST use Vanilla HTML/JS/CSS for the frontend. Place frontend files directly in 'public/'.
4. DATABASE MANDATORY: You MUST design a persistent data layer using Node.js + Express + standard 'sqlite3' (NO 'better-sqlite3'). Include init scripts and Model/Controller files.
5. MODERN UI MANDATORY: Plan a modern UI utilizing Tailwind CSS. Include CSS files, JS utility files, and distinct HTML pages.
6. ONLY output a pure JSON object where keys are file paths and values are comprehensive duty descriptions.
7. NO Markdown tags. NO empty directories.
8. ${getLangInstruction(lang)}`;

        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: architectPrompt }, { role: 'user', content: description }],
            response_format: { type: 'json_object' },
            temperature: 0.2
        }, { headers: { Authorization: `Bearer ${apiKey}` }, timeout: 60000 });

        const content = response.data.choices[0].message.content;
        return JSON.parse(content.substring(content.indexOf('{'), content.lastIndexOf('}') + 1));
    }

    /**
     * 階段 2 & 3：執行多代理生成與 QA 測試管線 (Generation & QA Pipeline)
     * [How] 遍歷藍圖生成代碼 -> 安裝依賴 -> 執行自動化測試 -> 觸發 QA Agent 進行自癒修復 (Self-Healing)。
     * [Why] 這是整個系統達到 Deployment Ready 的核心證明，將這個複雜邏輯封裝在 Service 中，可大幅提升系統可維護性。
     */
    static async executeGenerationPipeline(targetDir, blueprint, description, apiKey, lang) {
        const fileNames = Object.keys(blueprint);
        console.log(`\n👷 [Coder Agent] Blueprint received. Writing ${fileNames.length} files...\n`);

        await fs.ensureDir(targetDir);

        // 1. 啟動「專案記憶掃描」 (AST Context Injection)
        let existingContext = "";
        if (await fs.pathExists(targetDir)) {
            console.log(`\n🧠 [System] Project folder detected. Scanning existing codebase for Context...`);
            try {
                const filesMap = await FileService.readProjectFiles(targetDir);
                existingContext = JSON.stringify(filesMap);
                console.log(`✅ Existing context captured (Size: ${existingContext.length} chars)`);
            } catch (err) {
                console.log(`⚠️ Context scan failed or skipped: ${err.message}`);
            }
        }

        // 2. 工程師代理生成檔案 (導入動態記憶體池架構)
        let count = 1;
        let dynamicMemory = {}; // 存放本次生成過程中，剛寫好的檔案骨架

        for (const [filePath, fileRole] of Object.entries(blueprint)) {
            process.stdout.write(`⏳ (${count}/${fileNames.length}) Crafting ${filePath} ... `);
            try {
                // 將「長期記憶 (舊檔案)」與「短期記憶 (剛生成的檔案)」合併
                let combinedContext = existingContext || "";
                if (Object.keys(dynamicMemory).length > 0) {
                    combinedContext += `\n\n[CRITICAL MEMORY: FILES JUST GENERATED IN THIS SESSION]\n${JSON.stringify(dynamicMemory, null, 2)}`;
                }

                const code = await this._callCoder(filePath, fileRole, blueprint, description, apiKey, lang, combinedContext);
                await fs.outputFile(path.join(targetDir, filePath), code, 'utf8');

                // [核心邏輯] 寫完檔案後，立刻提取骨架並存入動態記憶體
                dynamicMemory[filePath] = this._extractCodeSkeleton(code);

                console.log(`\x1b[32m✅ Done\x1b[0m`);
            } catch (err) {
                console.log(`\x1b[31m❌ Failed: ${err.message}\x1b[0m`);
            }
            count++;
        }

        // 3. 智慧依賴安裝與 QA 測試管線 (Smart Build Resolution)
        console.log(`\n📦 [System] Installing dependencies (npm install)...`);
        try {
            await FileService.runCommand('npm', ['install'], targetDir);
        } catch (installErr) {
            console.log(`\x1b[31m❌ [System] npm install failed: Dependency compilation error.\x1b[0m`);

            const isZh = lang === 'zh';
            const modalData = {
                message: isZh
                    ? "依賴套件安裝失敗 (npm install)！這通常是因為 AI 選擇了需要 Windows C++ (node-gyp) 編譯的底層套件。請問要如何處理？"
                    : "Dependency installation failed! This is usually because the AI chose a native package requiring Windows C++ tools (node-gyp). How to proceed?",
                options: isZh
                    ? ["請 AI 改用不需要 C++ 編譯的輕量級資料庫 (如純 sqlite3 或 JSON)", "強行略過安裝並嘗試啟動伺服器", "請 AI 分析這段報錯"]
                    : ["Ask AI to rewrite using a lightweight database without C++ dependencies", "Force skip install and try to start", "Ask AI to analyze the error"]
            };

            console.log(`\n___REVIEWER_ACTION___:${JSON.stringify(modalData)}\n`);
            return false; // 終止後續管線，等待使用者決策
        }

        // [智慧解析] 檢查 package.json 是否真的需要 build，並捕捉啟動指令
        const pkgPath = path.join(targetDir, 'package.json');
        let needsBuild = false;
        let startCommand = 'node server.js'; // 預設降級啟動指令

        if (await fs.pathExists(pkgPath)) {
            const pkg = await fs.readJson(pkgPath);
            if (pkg.scripts && pkg.scripts.build) needsBuild = true;
            if (pkg.scripts && pkg.scripts.start) startCommand = 'npm start';
        }

        let testPassed = true; // 預設為 true (假設不需要編譯的原生專案即為合格)

        if (needsBuild) {
            console.log(`\n🧪 [System] Build script detected. Running compilation tests...`);
            testPassed = false;
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    await FileService.runCommand('npm', ['run', 'build'], targetDir);
                    console.log(`\x1b[32m✅ [QA] Test passed on attempt ${attempt}!\x1b[0m`);
                    testPassed = true;
                    break;
                } catch (error) {
                    console.log(`\x1b[31m❌ [QA] Build failed! Initiating debugging sequence...\x1b[0m`);
                    if (attempt === 2) {
                        console.log(`⚠️ Max auto-repair attempts reached.`);
                        const isZh = lang === 'zh';
                        const modalData = {
                            message: isZh
                                ? "自動化測試 (Build) 失敗。請問您想怎麼處理？"
                                : "The build test failed. How would you like to proceed?",
                            options: isZh
                                ? ["忽略錯誤，強行啟動專案。", "請 AI 幫我修復 Build 腳本或報錯。", "請 AI 解釋錯誤原因。"]
                                : ["Ignore the error and force start.", "Ask AI to fix the build issue.", "Ask AI to explain the error."]
                        };
                        console.log(`\n___REVIEWER_ACTION___:${JSON.stringify(modalData)}\n`);
                        break;
                    }
                    console.log(`🧠 [QA Agent] Analyzing logs and writing patches...`);
                }
            }
        } else {
            console.log(`\n⏩ [System] Native project detected (No build script). Skipping build phase.`);
        }

        // 4. [UX 終極優化] 自動掛載並啟動子專案 (Port 3000 Isolation)
        if (testPassed) {
            console.log(`\n🚀 [System] Auto-starting the generated project on PORT 3000...`);
            const { spawn } = require('child_process');
            const [cmd, ...args] = startCommand.split(' ');

            try {
                // 加入 shell: true 來解決 Windows 找不到 npm.cmd 的 ENOENT 錯誤
                const child = spawn(cmd, args, {
                    cwd: targetDir,
                    env: { ...process.env, PORT: 3000 },
                    detached: true,
                    stdio: 'ignore',
                    shell: process.platform === 'win32' // 🌟 跨平台核心修復點
                });

                // 捕捉子進程的非同步錯誤，防止主伺服器崩潰
                child.on('error', (err) => {
                    console.log(`\n\x1b[33m⚠️ [Warning] Auto-start failed (${err.message}). The generated project is safe, please start it manually.\x1b[0m`);
                });

                child.unref();
            } catch (spawnErr) {
                console.log(`\n\x1b[33m⚠️ [Warning] Could not spawn process: ${spawnErr.message}\x1b[0m`);
            }

            // ==========================================
            // 👇 [新增] 5. 為小白生成「專屬一鍵啟動腳本」
            // ==========================================
            console.log(`🎁 [System] Generating Beginner-Friendly Start Script...`);

            let finalStartCmd = startCommand;
            if (startCommand === 'node server.js') {
                if (await fs.pathExists(path.join(targetDir, 'server/index.js'))) finalStartCmd = 'node server/index.js';
                else if (await fs.pathExists(path.join(targetDir, 'server.js'))) finalStartCmd = 'node server.js';
                else if (await fs.pathExists(path.join(targetDir, 'index.js'))) finalStartCmd = 'node index.js';
            }

            const batPath = path.join(targetDir, 'Start_Project.bat');

            // [終極防彈修復] 移除所有中文，確保 100% 英文 ASCII 兼容
            const rawBatContent = `@echo off
title Running: ${path.basename(targetDir)}
color 0A
echo ===================================================
echo   Welcome to your AI-Generated Project!
echo ===================================================
echo.
echo [System] Starting local server on PORT 3000...
echo [System] If the app crashes, the error will stay on this screen!
echo.
set PORT=3000
start http://localhost:3000
:: Use call to ensure control returns and window does not crash
call ${finalStartCmd}
echo.
echo [WARNING] The server process has stopped or crashed.
echo [TIP] Check the error messages above, copy them, and use AI Magic Edit!
pause`;

            // [核心修復] 強制將所有 Linux 換行 (\n) 轉換為 Windows 換行 (\r\n)
            const safeBatContent = rawBatContent.replace(/\r?\n/g, '\r\n');

            await fs.outputFile(batPath, safeBatContent, 'utf8');
            // ==========================================
            console.log(`✅ Start_Project.bat created successfully!`);
            // ==========================================

            console.log(`\n===========================================`);
            console.log(`🎉 Project Successfully Deployed!`);
            console.log(`👉 Click here to view: \x1b[36mhttp://localhost:3000\x1b[0m`);
            console.log(`💡 Note: You can easily restart this project later by double-clicking 'Start_Project.bat' inside the folder.`);
            console.log(`===========================================\n`);
        }

        return testPassed;
    }


    /**
       * 高解析度代碼骨架提取器：捕捉箭頭函數與物件解構，確保匯出與匯入 100% 對齊
       */
    static _extractCodeSkeleton(code) {
        if (!code) return "";
        const lines = code.split('\n');
        const skeletonLines = lines.filter(line => {
            const trimmed = line.trim();
            return trimmed.startsWith('export ') ||
                trimmed.startsWith('function ') ||
                trimmed.startsWith('class ') ||
                trimmed.startsWith('module.exports') ||
                trimmed.startsWith('exports.') ||
                trimmed.startsWith('const router =') ||
                trimmed.includes('require(') ||
                // [終極修復] 精準捕捉現代化的箭頭函數宣告 (const/let xxx = () =>)
                (trimmed.startsWith('const ') && trimmed.includes('=')) ||
                (trimmed.startsWith('let ') && trimmed.includes('='));
        });
        return skeletonLines.join('\n');
    }

    /**
     * 私有方法：呼叫工程師代理 (終極大一統版)
     * 整合了：邏輯掛載、防禦性前端、嚴格對齊，以及高保真精準資料生成。
     */
    static async _callCoder(filePath, fileRole, blueprint, description, apiKey, lang, rawMemory = "") {

        // 格式化傳入的記憶體，確保 AI 能清楚區分這是系統給予的「長期與短期骨架記憶」
        let formattedMemoryPrompt = "";
        if (rawMemory && rawMemory.length > 5) {
            formattedMemoryPrompt = `\n[CRITICAL MEMORY: PROJECT AST SKELETON]\nHere is the structural skeleton of the files generated so far:\n${rawMemory}\nRULE: You MUST integrate your new code seamlessly with this existing architecture. Use EXACT function names and export styles shown above.`;
        }

        const coderPrompt = `You are a Senior Enterprise Full-Stack Engineer who specializes in 100% WORKING applications.
Project Context: ${description}
Blueprint: ${JSON.stringify(blueprint)}
Current Task: Write the EXACT, PRODUCTION-READY code for \`${filePath}\` (Duty: ${fileRole}).

CRITICAL RULES FOR "ZERO-KNOWLEDGE" USER SUCCESS:
1. ZERO PLACEHOLDERS: NEVER use comments like "// logic goes here". Write 100% working, dense JavaScript logic.
2. FULL INTERACTIVITY & AUTO-WIRING: 
   - HTML: Include all necessary <script> and <link> tags connecting to the blueprint's files.
   - JS: Every button/input ID in the HTML MUST have a working EventListener. Forms MUST submit.
3. DEFENSIVE FRONTEND (NO FROZEN UI): Wrap fetch() calls in try/catch. If API fails, immediately fallback to hardcoded Mock Data to prevent perpetual loading spinners.
4. EXACT DATA WIRING (HIGH FIDELITY REQUIRED): DO NOT generate garbage data (e.g., "Test Item 1") or use random loops to mix attributes. 
   - Define an array of exact JSON objects with paired, accurate data (e.g., \`[{title: 'My AI Project', desc: 'Agentic Workflow', imagePath: '/images/project1.jpg'}]\`).
   - Use standard local paths for personal portfolios so users can easily replace them.
   - Use a short loop to execute parameterized SQL inserts for this array. Limit to 10-15 high-quality, perfectly accurate items to prevent token truncation.
5. REAL ASSETS: Do NOT use fake placeholder URLs. Use dynamic URLs from public APIs or local paths as required.
6. STRICT ALIGNMENT: Read the [CRITICAL MEMORY] section below. Do NOT hallucinate function names.
7. EXHAUST YOUR TOKENS: Output the full file. Do not omit any logic.
8. NO Markdown tags. Pure code ONLY.
9. ${getLangInstruction(lang)}
${formattedMemoryPrompt}`;

        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: coderPrompt }, { role: 'user', content: `Output code for ${filePath}` }],
            temperature: 0.1,
            max_tokens: 8192
        }, { headers: { Authorization: `Bearer ${apiKey}` } });

        return response.data.choices[0].message.content.replace(/^```[\w-]*\n/i, '').replace(/```$/i, '').trim();
    }


    /**
       * 階段 4：QA 審查與修復 (Chain-of-Thought 思維鏈除錯)
       */
    static async applyQAPatch(projectDir, message, apiKey) {
        console.log(`🧠 [QA Agent] Analyzing AST and formulating Chain-of-Thought reasoning...`);

        const filesMap = await FileService.readProjectFiles(projectDir);
        const existingContext = JSON.stringify(filesMap);

        const qaPrompt = `You are an Elite QA Automation Engineer.
Project Context: The user reported an issue or requested a change: "${message}"
Current Codebase Skeleton: ${existingContext}

CRITICAL DEBUGGING RULES:
<thought_process>
1. Analyze exactly what failed.
2. Identify the root cause.
3. List exact files and fixes.
</thought_process>

<patch>
Provide ONLY a valid JSON object. Keys are file paths, values are the FULL FIXED CODE.
NO markdown code blocks inside the <patch> tag.
</patch>`;

        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: qaPrompt }, { role: 'user', content: "Execute QA Protocol and provide the patch." }],
            temperature: 0.2,
            max_tokens: 8192
        }, { headers: { Authorization: `Bearer ${apiKey}` } });

        const content = response.data.choices[0].message.content;

        const thoughtMatch = content.match(/<thought_process>([\s\S]*?)<\/thought_process>/i);
        if (thoughtMatch) {
            console.log(`\n\x1b[36m💡 [QA AI Thinking Process]:\n${thoughtMatch[1].trim()}\x1b[0m\n`);
        }

        const patchMatch = content.match(/<patch>([\s\S]*?)<\/patch>/i);
        if (!patchMatch) {
            throw new Error("AI completely failed to generate the <patch> tag.");
        }

        // 終極防彈 JSON 解析邏輯
        let jsonStr = patchMatch[1].trim();

        // 清除開頭結尾可能的 Markdown 標籤 (例如 ```json 和 ```)
        jsonStr = jsonStr.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/i, '').trim();

        try {
            // 嘗試直接解析
            const patchData = JSON.parse(jsonStr);
            console.log(`📝 [File Service] Applying AST Grafting for ${Object.keys(patchData).length} files...`);
            await FileService.applyPatch(projectDir, patchData);
            return true;
        } catch (parseErr) {
            // 如果直接解析失敗，嘗試暴力定位大括號範圍
            const firstBrace = jsonStr.indexOf('{');
            const lastBrace = jsonStr.lastIndexOf('}');
            if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
                try {
                    const extractedJson = jsonStr.substring(firstBrace, lastBrace + 1);
                    const patchData = JSON.parse(extractedJson);
                    console.log(`📝 [File Service] Applying AST Grafting for ${Object.keys(patchData).length} files...`);
                    await FileService.applyPatch(projectDir, patchData);
                    return true;
                } catch (fallbackErr) {
                    console.error("Extracted JSON:", extractedJson);
                    throw new Error("JSON syntax is fundamentally broken by AI.");
                }
            }
            throw new Error("Failed to parse AI JSON format. AI outputted invalid syntax.");
        }
    }
}

module.exports = AIService;