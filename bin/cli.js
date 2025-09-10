#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer');
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');

// 定义程序的版本信息
program.version(require('../package.json').version, '-v, --version', '输出当前版本');

// 定义模板配置
const TEMPLATES = {
  node: {
    name: 'Node.js (基础)',
    description: '基础Node.js项目模板',
    dir: 'node-basic' // 指定模板目录名称
  },
  react: {
    name: 'React',
    description: 'React项目模板',
    dir: 'react'
  },
  vue: {
    name: 'Vue',
    description: 'Vue项目模板',
    dir: 'vue'
  }
};

// 创建 inquirer prompt 函数
const prompt = inquirer.createPromptModule();

// 递归处理文件，替换占位符
async function processFiles(dir, replacements) {
  const files = await fs.readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = await fs.stat(filePath);

    if (stat.isDirectory()) {
      await processFiles(filePath, replacements);
    } else {
      // 读取文件内容
      let content = await fs.readFile(filePath, 'utf8');

      // 替换所有占位符
      for (const [key, value] of Object.entries(replacements)) {
        const placeholder = `{% ${key} %}`;
        content = content.replace(new RegExp(placeholder, 'g'), value);
      }

      // 写回文件
      await fs.writeFile(filePath, content, 'utf8');
    }
  }
}

// 检查模板完整性
async function checkTemplateIntegrity(templateDir) {
  const requiredFiles = [
    'package.json',
    'src/index.js',
    'src/routes/api.js',
    '.env.example',
    '.gitignore',
    'README.md'
  ];

  const missingFiles = [];

  for (const file of requiredFiles) {
    const filePath = path.join(templateDir, file);
    if (!fs.existsSync(filePath)) {
      missingFiles.push(file);
    }
  }

  if (missingFiles.length > 0) {
    console.warn('⚠️  模板不完整，缺少以下文件:');
    missingFiles.forEach(file => console.warn(`    - ${file}`));
    console.warn('  这可能会导致创建的项目无法正常运行。');

    // 询问用户是否继续
    const { continueAnyway } = await prompt([
      {
        name: 'continueAnyway',
        type: 'confirm',
        message: '是否继续创建项目?',
        default: false
      }
    ]);

    if (!continueAnyway) {
      console.log('操作已取消');
      process.exit(1);
    }
  }
}

// 获取 git 配置信息
async function getGitConfig() {
  return new Promise((resolve) => {
    const result = { name: '', email: '' };
    let completed = 0;

    const checkCompletion = () => {
      completed++;
      if (completed === 2) {
        resolve(result);
      }
    };

    // 获取 git 用户名
    const nameProcess = spawn('git', ['config', 'user.name']);
    nameProcess.stdout.on('data', (data) => {
      result.name = data.toString().trim();
    });
    nameProcess.on('close', checkCompletion);
    nameProcess.on('error', checkCompletion);

    // 获取 git 邮箱
    const emailProcess = spawn('git', ['config', 'user.email']);
    emailProcess.stdout.on('data', (data) => {
      result.email = data.toString().trim();
    });
    emailProcess.on('close', checkCompletion);
    emailProcess.on('error', checkCompletion);
  });
}

// 定义 create 命令
program
  .command('create <project-name>')
  .description('创建一个新的项目')
  .option('-t, --template <template-name>', '指定项目模板（例如: node, react, vue）')
  .option('-f, --force', '如果目标目录已存在，则强制覆盖', false)
  .option('-g, --git', '初始化git仓库', false)
  .option('-i, --install', '自动安装依赖', false)
  .option('-a, --author <author>', '设置项目作者', '')
  .action(async (projectName, options) => {
    try {
      // 验证项目名称
      if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
        console.error('错误：项目名称只能包含字母、数字、下划线和连字符');
        process.exit(1);
      }

      // 检查目标目录是否已存在
      const targetDir = path.join(process.cwd(), projectName);
      if (fs.existsSync(targetDir)) {
        if (!options.force) {
          const { action } = await prompt([
            {
              name: 'action',
              type: 'list',
              message: `目标目录 ${projectName} 已存在。请选择操作：`,
              choices: [
                { name: '覆盖', value: 'overwrite' },
                { name: '取消', value: false }
              ]
            }
          ]);

          if (!action) {
            console.log('操作已取消');
            return;
          } else if (action === 'overwrite') {
            console.log(`\n正在删除 ${projectName}...`);
            await fs.remove(targetDir);
          }
        } else {
          console.log(`\n强制创建，删除已存在的目录 ${projectName}...`);
          await fs.remove(targetDir);
        }
      }

      // 确定要使用的模板
      let template = options.template;
      if (!template) {
        const { templateAnswer } = await prompt([
          {
            name: 'templateAnswer',
            type: 'list',
            message: '请选择项目模板：',
            choices: Object.entries(TEMPLATES).map(([key, value]) => ({
              name: `${value.name} - ${value.description}`,
              value: key
            }))
          }
        ]);
        template = templateAnswer;
      }

      // 检查模板是否存在
      if (!TEMPLATES[template]) {
        console.error(`错误：模板 '${template}' 不存在.`);
        process.exit(1);
      }

      // 根据模板名称，构造模板路径
      const templateDir = path.join(__dirname, '../src/templates', TEMPLATES[template].dir);

      if (!fs.existsSync(templateDir)) {
        console.error(`错误：模板目录 '${templateDir}' 不存在.`);
        process.exit(1);
      }

      // 检查模板完整性
      console.log('检查模板完整性...');
      await checkTemplateIntegrity(templateDir);

      // 创建项目目录
      await fs.ensureDir(targetDir);

      // 将模板文件复制到目标目录
      console.log(`\n正在创建项目 ${projectName}...`);
      await fs.copy(templateDir, targetDir);

      // 获取作者信息（如果未通过选项提供）
      let author = options.author;
      if (!author) {
        try {
          // 尝试从git配置获取作者信息
          const gitConfig = await getGitConfig();
          author = gitConfig.email ? `${gitConfig.name} <${gitConfig.email}>` : gitConfig.name || 'Unknown';
        } catch (error) {
          author = 'Unknown';
        }
      }

      // 定义占位符替换映射
      const replacements = {
        projectName: projectName,
        author: author,
        year: new Date().getFullYear()
      };

      // 处理所有文件，替换占位符
      console.log('正在处理模板文件...');
      await processFiles(targetDir, replacements);

      console.log(`\n✅ 项目 ${projectName} 创建成功！使用模板: ${TEMPLATES[template].name}`);

      if (!options.git) { // 如果用户没有通过命令行选项指定
        const { shouldInitGit } = await prompt([
          {
            name: 'shouldInitGit',
            type: 'confirm',
            message: '是否要初始化Git仓库?',
            default: true // 默认选择是
          }
        ]);
        options.git = shouldInitGit; // 将询问结果赋值给 options.git
      }

      // 初始化git仓库
      if (options.git) {
        console.log('📦 初始化Git仓库...');
        try {
          const gitInit = spawn('git', ['init'], { cwd: targetDir, stdio: 'inherit' });

          gitInit.on('close', (code) => {
            if (code === 0) {
              console.log('✅ Git仓库初始化完成');
            } else {
              console.warn('⚠️  Git初始化失败，请手动初始化');
            }
          });
        } catch (error) {
          console.warn('⚠️  Git初始化失败，请手动初始化');
        }
      }

      // 自动安装依赖
      if (options.install) {
        console.log('📦 安装项目依赖...');
        try {
          // 使用npm安装依赖
          const installProcess = spawn('npm', ['install'], { cwd: targetDir, stdio: 'inherit' });

          installProcess.on('close', (code) => {
            if (code === 0) {
              console.log('✅ 依赖安装完成');
            } else {
              console.warn('⚠️  自动安装依赖失败，请手动运行 npm install');
            }
          });
        } catch (error) {
          console.warn('⚠️  自动安装依赖失败，请手动运行 npm install');
        }
      }

      // 显示下一步指引
      console.log('\n🎉 项目创建完成！下一步：');
      console.log(`  cd ${projectName}`);

      if (!options.install) {
        console.log(`  npm install`);
      }

      console.log(`  开始编码！\n`);

    } catch (error) {
      console.error('❌ 创建项目失败：', error.message);
      process.exit(1);
    }
  });

// 添加list命令查看可用模板
program
  .command('list')
  .description('列出所有可用模板')
  .action(() => {
    console.log('\n可用模板：');
    Object.entries(TEMPLATES).forEach(([key, value]) => {
      console.log(`  ${key.padEnd(10)} - ${value.name}: ${value.description}`);
    });
    console.log('');
  });

// 错误处理：监听未知命令
program.on('command:*', () => {
  console.error('无效的命令：%s\n', program.args.join(' '));
  console.log('请使用 --help 查看所有可用命令。');
  process.exit(1);
});

// 如果没有提供任何参数，显示帮助信息
if (process.argv.length <= 2) {
  program.help();
}

// 解析命令行参数
program.parse(process.argv);