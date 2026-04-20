const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;

/**
 * [核心功能] AST 骨架提取器 (AST Skeleton Extractor)
 */
function extractCodeSkeleton(code) {
    try {
        const ast = parser.parse(code, {
            sourceType: "module",
            plugins: ["jsx", "typescript"]
        });

        traverse(ast, {
            FunctionDeclaration(path) {
                if (path.node.body && path.node.body.type === 'BlockStatement') {
                    path.node.body.body = [];
                    path.addComment('inner', ' ... implementation hidden ', false);
                }
            },
            ArrowFunctionExpression(path) {
                if (path.node.body && path.node.body.type === 'BlockStatement') {
                    path.node.body.body = [];
                    path.addComment('inner', ' ... implementation hidden ', false);
                }
            },
            ClassMethod(path) {
                if (path.node.body && path.node.body.type === 'BlockStatement') {
                    path.node.body.body = [];
                    path.addComment('inner', ' ... implementation hidden ', false);
                }
            }
        });

        return generator(ast, { retainLines: false, compact: false }).code;
    } catch (err) {
        console.warn('⚠️ AST 解析失敗，退回原始文字模式:', err.message);
        return code;
    }
}

/**
 * [核心功能] AST 精準嫁接器 (AST Grafter)
 */
function injectASTNode(originalCode, aiPatchCode) {
    try {
        const originalAst = parser.parse(originalCode, { sourceType: "module", plugins: ["jsx", "typescript"] });
        const patchAst = parser.parse(aiPatchCode, { sourceType: "module", plugins: ["jsx", "typescript"] });

        let newNodes = [];

        traverse(patchAst, {
            FunctionDeclaration(path) { newNodes.push(path.node); },
            VariableDeclaration(path) { if (path.node.declarations[0].init?.type === 'ArrowFunctionExpression') newNodes.push(path.node); }
        });

        if (newNodes.length === 0) return originalCode;

        let replaced = false;
        traverse(originalAst, {
            FunctionDeclaration(path) {
                const matchingNode = newNodes.find(n => n.type === 'FunctionDeclaration' && n.id?.name === path.node.id?.name);
                if (matchingNode) {
                    path.replaceWith(matchingNode);
                    path.skip();
                    replaced = true;
                }
            },
            VariableDeclarator(path) {
                const matchingNode = newNodes.find(n => n.type === 'VariableDeclaration' && n.declarations[0].id?.name === path.node.id?.name);
                if (matchingNode && path.node.init?.type === 'ArrowFunctionExpression') {
                    path.parentPath.replaceWith(matchingNode);
                    path.skip();
                    replaced = true;
                }
            }
        });

        if (!replaced) throw new Error("在原始代碼中找不到對應的函數名稱進行替換");

        return generator(originalAst, { retainLines: false }).code;
    } catch (err) {
        console.warn(`\n⚠️ AST 嫁接失敗: ${err.message}，將退回全覆寫模式。`);
        return null;
    }
}

// 導出模組
module.exports = {
    extractCodeSkeleton,
    injectASTNode
};