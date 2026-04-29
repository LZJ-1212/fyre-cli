const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { extractCodeSkeleton, injectASTNode } = require('../core/ast');

/**
 * FileService: 基礎設施與檔案安全服務 (Infrastructure & Security Service)
 * [Why] 遵守單一職責原則 (SRP)，將所有與底層作業系統的互動 (檔案 I/O, 進程調用) 集中管理。
 * [How] 提供統一的非同步 API，並在所有寫入操作前強制執行 Path Traversal 安全過濾。
 */
class FileService {
    /**
     * 執行外部命令 (Process Spawning)
     * @param {string} cmd - 命令 (如 'npm', 'git')
     * @param {Array} args - 參數陣列
     * @param {string} cwd - 執行目錄
     * @returns {Promise<boolean>}
     */
    static async runCommand(cmd, args, cwd) {
        return new Promise((resolve, reject) => {
            // 封裝 spawn 以支援跨平台與非同步操作
            const proc = spawn(cmd, args, { cwd, stdio: 'pipe', shell: true });
            let errorOutput = '';

            proc.stderr.on('data', (data) => { errorOutput += data.toString(); });
            proc.on('close', code => {
                if (code === 0) resolve(true);
                else reject(new Error(`Execution failed (Code ${code})\n${errorOutput}`));
            });
        });
    }

    /**
     * 處理專案佔位符替換 (Placeholder Replacement)
     * 遞迴掃描目錄並替換 {% projectName %} 等變數
     */
    static async processPlaceholders(dir, replacements) {
        const files = await fs.readdir(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = await fs.stat(filePath);

            if (stat.isDirectory()) {
                await this.processPlaceholders(filePath, replacements);
            } else {
                let content = await fs.readFile(filePath, 'utf8');
                for (const [key, value] of Object.entries(replacements)) {
                    // 全域替換對應的佔位符
                    content = content.replace(new RegExp(`{% ${key} %}`, 'g'), value);
                }
                await fs.writeFile(filePath, content, 'utf8');
            }
        }
    }

    /**
     * 寫入 AI 生成的檔案並強制執行安全過濾 (Path Traversal Defence)
     * [Why] 防止惡意或失控的 AI 生成 "../" 路徑覆寫系統關鍵檔案。
     */
    static async writeGeneratedFiles(targetDir, filesMap) {
        for (const [filePath, content] of Object.entries(filesMap)) {
            // 核心防禦：拒絕絕對路徑與包含 .. 的相對路徑
            if (filePath.includes('..') || path.isAbsolute(filePath)) {
                console.warn(`\x1b[33m⚠️ Security Warning: Blocked unsafe file path [${filePath}]\x1b[0m`);
                continue;
            }

            const fullPath = path.join(targetDir, filePath);
            await fs.outputFile(fullPath, content, 'utf8');
        }
    }

    /**
     * 讀取專案代碼並自動進行 AST 骨架壓縮 (Context Preparation)
     * [Why] 防止大型專案導致 LLM Context Window 爆炸。
     * [How] 略過 node_modules，且對大於 15KB 的檔案啟用 AST 骨架提取。
     */
    static async readProjectFiles(targetDir) {
        const filesMap = {};
        const ignoreDirs = ['node_modules', '.git', 'dist', 'build', 'public', 'assets'];
        const ignoreFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml'];
        const allowedExts = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', '.json', '.md'];

        const scan = async (currentPath, relativePath = '') => {
            const entries = await fs.readdir(currentPath, { withFileTypes: true });
            for (const entry of entries) {
                if (ignoreDirs.includes(entry.name) || ignoreFiles.includes(entry.name)) continue;

                const fullPath = path.join(currentPath, entry.name);
                const relPath = path.join(relativePath, entry.name);

                if (entry.isDirectory()) {
                    await scan(fullPath, relPath);
                } else {
                    const ext = path.extname(entry.name);
                    if (allowedExts.includes(ext) || entry.name === 'Dockerfile' || entry.name.startsWith('.env')) {
                        const stat = await fs.stat(fullPath);

                        if (stat.size < 500 * 1024) { // 限制單檔 500KB 以下
                            let content = await fs.readFile(fullPath, 'utf8');

                            // AST 智慧切片接入：若文件過大，啟動骨架提取
                            if (stat.size > 15 * 1024 && ['.js', '.jsx', '.ts', '.tsx'].includes(ext)) {
                                console.log(`\n  🌲 [AST Optimization] Extracting skeleton for large file: ${relPath}`);
                                content = extractCodeSkeleton(content);
                            }
                            filesMap[relPath.replace(/\\/g, '/')] = content;
                        } else {
                            console.warn(`\n⚠️ Warning: Skipped ${relPath} (Exceeds 500KB limit).`);
                        }
                    }
                }
            }
        };

        await scan(targetDir);
        return filesMap;
    }

    /**
     * 應用 AI 代碼補丁與 AST 精準嫁接 (Smart Patching)
     */
    static async applyPatch(targetDir, updatedFilesMap) {
        for (const [filePath, fileContent] of Object.entries(updatedFilesMap)) {
            if (filePath.includes('..') || path.isAbsolute(filePath)) continue;

            const absPath = path.join(targetDir, filePath);

            // AI 回傳 null 代表刪除該檔案
            if (fileContent === null) {
                await fs.remove(absPath);
                console.log(`  🗑️  Deleted: ${filePath}`);
            } else {
                let finalContent = fileContent;

                // AST 智慧防護與嫁接 (Smart Grafting)
                if (fs.existsSync(absPath)) {
                    const stat = await fs.stat(absPath);
                    // 如果是大型檔案，且 AI 回傳的代碼很短（代表只是局部片段）
                    if (stat.size > 15 * 1024 && fileContent.length < stat.size * 0.5) {
                        console.log(`  🌲 [AST Grafting] Applying partial patch to: ${filePath}`);
                        const originalCode = await fs.readFile(absPath, 'utf8');
                        const graftedCode = injectASTNode(originalCode, fileContent);
                        if (graftedCode) {
                            finalContent = graftedCode;
                            console.log(`  ✅ AST Grafting Successful!`);
                        }
                    }
                }

                await fs.outputFile(absPath, finalContent, 'utf8');
                console.log(`  📝 Updated: ${filePath}`);
            }
        }
    }
}

module.exports = FileService;