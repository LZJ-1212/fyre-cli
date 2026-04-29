const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;

/**
 * Abstract Syntax Tree (AST) Core Module
 * [Research Element] This module solves the LLM Context Window exhaustion problem 
 * by dynamically compressing large source files into method skeletons.
 */
class ASTProcessor {
    /**
     * AST 代碼骨架提取器 (AST Skeleton Extractor)
     * 將龐大檔案中的函數實作清空，僅保留函數簽名，大幅節省 AI Token。
     */
    static extractCodeSkeleton(code) {
        try {
            const ast = parser.parse(code, {
                sourceType: "module",
                plugins: ["jsx", "typescript"]
            });

            traverse(ast, {
                // 捕捉一般函數、箭頭函數與類別方法，將其內部 Block 替換為隱藏標籤
                FunctionDeclaration(path) { ASTProcessor._hollowOutBlock(path); },
                ArrowFunctionExpression(path) { ASTProcessor._hollowOutBlock(path); },
                ClassMethod(path) { ASTProcessor._hollowOutBlock(path); }
            });

            return generator(ast, { retainLines: false, compact: false }).code;
        } catch (err) {
            console.warn('\x1b[33m⚠️ AST Parsing failed. Falling back to raw text mode.\x1b[0m', err.message);
            return code;
        }
    }

    /**
     * AST 精準嫁接器 (AST Grafter / Smart Patching)
     * 將 AI 輸出的局部代碼片段，精準插入到原始大型檔案的對應語法樹節點中。
     */
    static injectASTNode(originalCode, aiPatchCode) {
        try {
            const originalAst = parser.parse(originalCode, { sourceType: "module", plugins: ["jsx", "typescript"] });
            const patchAst = parser.parse(aiPatchCode, { sourceType: "module", plugins: ["jsx", "typescript"] });

            let newNodes = [];

            // 提取 AI 補丁中的目標節點
            traverse(patchAst, {
                FunctionDeclaration(path) { newNodes.push(path.node); },
                VariableDeclaration(path) {
                    if (path.node.declarations[0].init?.type === 'ArrowFunctionExpression') newNodes.push(path.node);
                }
            });

            if (newNodes.length === 0) return originalCode;

            let replaced = false;
            // 在原始語法樹中尋找並替換
            traverse(originalAst, {
                FunctionDeclaration(path) {
                    const match = newNodes.find(n => n.type === 'FunctionDeclaration' && n.id?.name === path.node.id?.name);
                    if (match) { path.replaceWith(match); path.skip(); replaced = true; }
                },
                VariableDeclarator(path) {
                    const match = newNodes.find(n => n.type === 'VariableDeclaration' && n.declarations[0].id?.name === path.node.id?.name);
                    if (match && path.node.init?.type === 'ArrowFunctionExpression') {
                        path.parentPath.replaceWith(match); path.skip(); replaced = true;
                    }
                }
            });

            if (!replaced) throw new Error("Target function node not found for replacement.");

            return generator(originalAst, { retainLines: false }).code;
        } catch (err) {
            console.warn(`\n\x1b[33m⚠️ AST Grafting failed: ${err.message}. Falling back to overwrite mode.\x1b[0m`);
            return null;
        }
    }

    static _hollowOutBlock(path) {
        if (path.node.body && path.node.body.type === 'BlockStatement') {
            path.node.body.body = [];
            path.addComment('inner', ' ... implementation hidden for context optimization ', false);
        }
    }
}

module.exports = {
    extractCodeSkeleton: ASTProcessor.extractCodeSkeleton,
    injectASTNode: ASTProcessor.injectASTNode
};