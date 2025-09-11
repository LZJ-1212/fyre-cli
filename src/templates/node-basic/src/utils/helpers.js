// 日期格式化函数示例
function formatDate(date) {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// 其他工具函数
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// 生成随机ID
function generateId() {
  return Math.random().toString(36).substr(2, 9);
}

module.exports = {
  formatDate,
  capitalize,
  generateId
};