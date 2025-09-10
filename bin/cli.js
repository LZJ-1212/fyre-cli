#!/usr/bin/env node

const { program } = require('commander');
const inquirer = require('inquirer').default;
const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process'); // 添加子进程支持

// 定义程序的版本信息
program.version(require('../package.json').version, '-v, --version', '输出当前版本');

// 定义模板配置
const TEMPLATES = {
  node: {
    name: 'Node.js (基础)',
    description: '基础Node.js项目模板'
  },
  react: {
    name: 'React',
    description: 'React项目模板'
  },
  vue: {
    name: 'Vue',
    description: 'Vue项目模板'
  }
};

// 定义 create 命令
program
  .command('create <project-name>')
  .description('创建一个新的项目')
  .option('-t, --template <template-name>', '指定项目模板（例如: node, react, vue）')
  .option('-f, --force', '如果目标目录已存在，则强制覆盖', false)
  .option('-g, --git', '初始化git仓库', false)
  .option('-i, --install', '自动安装依赖', false)
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
          const { action } = await inquirer.prompt([
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
        const { templateAnswer } = await inquirer.prompt([
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
      const templateDir = path.join(__dirname, '../templates', template);

      if (!fs.existsSync(templateDir)) {
        console.error(`错误：模板目录 '${templateDir}' 不存在.`);
        process.exit(1);
      }

      // 创建项目目录
      await fs.ensureDir(targetDir);

      // 将模板文件复制到目标目录
      console.log(`\n正在创建项目 ${projectName}...`);
      await fs.copy(templateDir, targetDir);
      
      // 更新package.json中的项目名称
      const packageJsonPath = path.join(targetDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = await fs.readJson(packageJsonPath);
        packageJson.name = projectName;
        await fs.writeJson(packageJsonPath, packageJson, { spaces: 2 });
      }

      console.log(`\n✅ 项目 ${projectName} 创建成功！使用模板: ${TEMPLATES[template].name}`);

      // 初始化git仓库
      if (options.git) {
        console.log('📦 初始化Git仓库...');
        try {
          spawn('git', ['init'], { cwd: targetDir, stdio: 'inherit' });
          console.log('✅ Git仓库初始化完成');
        } catch (error) {
          console.warn('⚠️  Git初始化失败，请手动初始化');
        }
      }

      // 自动安装依赖
      if (options.install) {
        console.log('📦 安装项目依赖...');
        try {
          // 检测包管理器
          const hasYarn = await fs.pathExists(path.join(process.cwd(), 'yarn.lock'));
          const command = hasYarn ? 'yarn' : 'npm';
          
          spawn(command, ['install'], { cwd: targetDir, stdio: 'inherit' });
          console.log('✅ 依赖安装完成');
        } catch (error) {
          console.warn('⚠️  自动安装依赖失败，请手动运行 npm install 或 yarn install');
        }
      }

      // 显示下一步指引
      console.log('\n🎉 项目创建完成！下一步：');
      console.log(`  cd ${projectName}`);
      
      if (!options.install) {
        console.log(`  npm install 或 yarn install`);
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