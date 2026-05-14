/**
 * Obsidian Memory - Popup Script
 * 扩展弹窗界面逻辑
 */

document.addEventListener('DOMContentLoaded', () => {
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const memoryList = document.getElementById('memoryList');
  const searchInput = document.getElementById('searchInput');

  let memories = [];

  // 检查连接状态
  async function checkConnection() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'checkConnection' });
      updateStatus(response.isConnected, response.lastError);
      return response.isConnected;
    } catch (e) {
      updateStatus(false, e.message);
      return false;
    }
  }

  // 更新状态显示
  function updateStatus(isConnected, error) {
    if (isConnected) {
      statusDot.className = 'status-dot connected';
      statusText.textContent = '已连接';
    } else {
      statusDot.className = 'status-dot disconnected';
      statusText.textContent = error ? `离线: ${error}` : '未连接';
    }
  }

  // 加载最近记忆
  async function loadRecentMemories() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getRecent' });
      if (response.success && response.data) {
        memories = response.data;
        renderMemories(memories);
      } else {
        renderEmpty();
      }
    } catch (e) {
      renderError(e.message);
    }
  }

  // 搜索记忆
  async function searchMemories(query) {
    if (!query.trim()) {
      loadRecentMemories();
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        action: 'search',
        data: { query }
      });
      if (response.success && response.data) {
        memories = response.data;
        renderMemories(memories);
      } else {
        renderEmpty();
      }
    } catch (e) {
      renderError(e.message);
    }
  }

  // 渲染记忆列表
  function renderMemories(items) {
    if (!items || items.length === 0) {
      renderEmpty();
      return;
    }

    let html = '';

    for (const item of items) {
      const data = item.data || item;
      const time = new Date(data.created_at || Date.now()).toLocaleString('zh-CN');
      const typeLabel = getTypeLabel(data.type);

      html += `
        <div class="memory-item" data-memory='${JSON.stringify(item).replace(/'/g, '&#39;')}'>
          <div class="memory-item-header">
            <span class="memory-type">${typeLabel} ${data.type || ''}</span>
            <span class="memory-time">${time}</span>
          </div>
          <div class="memory-narrative">${escapeHtml(data.narrative || data.title || '无描述')}</div>
          ${data.concepts && data.concepts.length > 0 ? `
            <div class="memory-concepts">
              ${data.concepts.map(c => `<span class="concept-tag">${escapeHtml(c)}</span>`).join('')}
            </div>
          ` : ''}
          <div class="memory-actions">
            <button class="btn btn-primary inject-btn">注入到 AI</button>
          </div>
        </div>
      `;
    }

    memoryList.innerHTML = html;

    // 绑定注入按钮事件
    memoryList.querySelectorAll('.inject-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const memoryItem = btn.closest('.memory-item');
        const memoryData = JSON.parse(memoryItem.dataset.memory);
        injectMemory(memoryData);
      });
    });

    // 绑定点击整个item也注入
    memoryList.querySelectorAll('.memory-item').forEach(item => {
      item.addEventListener('click', () => {
        const memoryData = JSON.parse(item.dataset.memory);
        injectMemory(memoryData);
      });
    });
  }

  // 注入记忆到页面
  async function injectMemory(memory) {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'inject',
        data: { memory }
      });
      if (response.success) {
        showNotification('✅ 记忆已注入!');
      } else {
        showNotification('❌ 注入失败');
      }
    } catch (e) {
      showNotification('❌ 注入失败: ' + e.message);
    }
  }

  // 显示通知
  function showNotification(message) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #333;
      color: white;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 13px;
      z-index: 10000;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 2000);
  }

  // 渲染空状态
  function renderEmpty() {
    memoryList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📭</div>
        <p>暂无记忆</p>
        <p style="font-size:12px;color:#999;margin-top:8px;">在 Obsidian 中工作后，记忆会自动显示在这里</p>
      </div>
    `;
  }

  // 渲染错误状态
  function renderError(message) {
    memoryList.innerHTML = `
      <div class="error-state">
        <p>加载失败</p>
        <p style="font-size:12px;margin-top:8px;">${escapeHtml(message)}</p>
      </div>
    `;
  }

  // 获取类型标签
  function getTypeLabel(type) {
    const labels = {
      'change': '📝',
      'bugfix': '🐛',
      'feature': '✨',
      'decision': '📋',
      'discovery': '💡',
      'session': '📦',
      'summary': '📊'
    };
    return labels[type] || '📝';
  }

  // HTML 转义
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 搜索事件
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      searchMemories(searchInput.value);
    }
  });

  // 初始化
  (async function init() {
    const connected = await checkConnection();
    if (connected) {
      await loadRecentMemories();
    } else {
      renderEmpty();
    }
  })();
});