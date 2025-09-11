module.exports = {
  env: {
    node: true,
    commonjs: true,
    es2021: true,
    jest: true,
  },
  extends: ['eslint:recommended'],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    // 换行符规则 - 根据平台自适应
    'linebreak-style': ['error', process.platform === 'win32' ? 'windows' : 'unix'],
    
    // 引号规则 - 使用单引号，允许模板字符串
    'quotes': ['error', 'single', { 'allowTemplateLiterals': true }],
    
    // 禁止行尾空格
    'no-trailing-spaces': 'error',
    
    // 文件末尾需要换行
    'eol-last': ['error', 'always'],
    
    // 允许使用 console（服务器端代码常用）
    'no-console': 'off',
    
    // 允许内联注释
    'no-inline-comments': 'off',
    
    // 多行时需要尾随逗号
    'comma-dangle': ['error', 'only-multiline'],
    
    // 其他推荐规则
    'array-bracket-spacing': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'semi': ['error', 'always'],
    'indent': ['error', 2],
    'curly': ['error', 'multi-line'],
    'eqeqeq': 'error',
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
  },
  overrides: [
    {
      files: ['**/__tests__/**/*.js', '**/*.test.js'],
      env: {
        jest: true,
      },
      rules: {
        // 测试文件中允许使用 console
        'no-console': 'off',
      },
    },
  ],
};