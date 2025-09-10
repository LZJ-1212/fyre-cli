const express = require('express');
const router = express.Router();

/**
 * @route GET /api/health
 * @description 检查API健康状况
 * @access Public
 */
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    message: 'API服务运行正常',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

/**
 * @route GET /api/users
 * @description 获取用户列表
 * @access Public
 */
router.get('/users', (req, res) => {
  // 模拟用户数据
  const users = [
    { id: 1, name: '张三', email: 'zhangsan@example.com' },
    { id: 2, name: '李四', email: 'lisi@example.com' },
    { id: 3, name: '王五', email: 'wangwu@example.com' }
  ];
  
  res.json({
    success: true,
    data: users,
    count: users.length
  });
});

/**
 * @route GET /api/users/:id
 * @description 获取特定用户
 * @access Public
 */
router.get('/users/:id', (req, res) => {
  const { id } = req.params;
  
  // 验证ID是否为数字
  if (isNaN(id)) {
    return res.status(400).json({
      success: false,
      error: '无效的用户ID'
    });
  }
  
  const userId = parseInt(id);
  
  // 模拟从数据库获取用户
  const user = { 
    id: userId, 
    name: `用户${userId}`, 
    email: `user${userId}@example.com`,
    createdAt: new Date().toISOString()
  };
  
  res.json({
    success: true,
    data: user
  });
});

/**
 * @route POST /api/users
 * @description 创建新用户
 * @access Public
 */
router.post('/users', (req, res) => {
  const { name, email } = req.body;
  
  // 验证必填字段
  if (!name || !email) {
    return res.status(400).json({
      success: false,
      error: '姓名和邮箱是必填字段'
    });
  }
  
  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: '邮箱格式不正确'
    });
  }
  
  // 模拟创建用户
  const newUser = {
    id: Date.now(),
    name,
    email,
    createdAt: new Date().toISOString()
  };
  
  res.status(201).json({
    success: true,
    message: '用户创建成功',
    data: newUser
  });
});

/**
 * @route GET /api/docs
 * @description 返回API文档信息
 * @access Public
 */
router.get('/docs', (req, res) => {
  res.json({
    message: 'API文档',
    endpoints: [
      { method: 'GET', path: '/api/health', description: '检查API健康状况' },
      { method: 'GET', path: '/api/users', description: '获取用户列表' },
      { method: 'GET', path: '/api/users/:id', description: '获取特定用户' },
      { method: 'POST', path: '/api/users', description: '创建新用户' },
      { method: 'GET', path: '/api/docs', description: '获取API文档' }
    ]
  });
});

module.exports = router;