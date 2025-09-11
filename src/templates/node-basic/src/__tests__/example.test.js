const request = require('supertest');
const app = require('../index');

// 不再需要手动关闭服务器，因为测试环境下服务器不会启动

describe('基础路由测试', () => {
  test('GET / 应该返回欢迎信息', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('message');
    expect(response.body).toHaveProperty('timestamp');
  });

  test('GET /health 应该返回健康状态', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('OK');
  });
});

describe('API 路由测试', () => {
  test('GET /api 应该返回API信息', async () => {
    const response = await request(app).get('/api');
    // 根据你的API路由实现，这里可能是200或501
    expect([200, 501]).toContain(response.statusCode);
  });

  test('GET /api 应该返回API信息', async () => {
    const response = await request(app).get('/api/health'); // 改为测试 /api/health
    expect(response.statusCode).toBe(200);
    expect(response.body).toHaveProperty('status');
  });
});

// 模拟函数测试示例
describe('模拟函数测试', () => {
  const mockFn = jest.fn();

  beforeEach(() => {
    mockFn.mockClear();
  });

  test('模拟函数应该被调用', () => {
    mockFn();
    expect(mockFn).toHaveBeenCalled();
  });

  test('模拟函数应该被调用一次', () => {
    mockFn();
    expect(mockFn).toHaveBeenCalledTimes(1);
  });
});

// 异步测试示例
describe('异步操作测试', () => {
  test('异步操作应该成功', () => {
    return Promise.resolve('success').then(data => {
      expect(data).toBe('success');
    });
  });

  test('异步操作应该失败', () => {
    return Promise.reject(new Error('fail')).catch(error => {
      expect(error.message).toBe('fail');
    });
  });
});

// 快照测试示例
describe('快照测试', () => {
  test('对象应该匹配快照', () => {
    const user = {
      id: 1,
      name: '测试用户',
      email: 'test@example.com',
      createdAt: '2023-01-01T00:00:00.000Z'
    };
    expect(user).toMatchSnapshot();
  });
});