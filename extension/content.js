/**
 * Obsidian Memory - Content Script
 * 注入到 AI 网站（Claude、ChatGPT 等），处理记忆注入 UI
 */

(function() {
  'use strict';

  // 配置
  const BUTTON_ID = 'obsidian-memory-btn';
  const PANEL_ID = 'obsidian-memory-panel';

  // 检测 AI 网站类型
  function detectAIType() {
    const url = window.location.hostname;
    if (url.includes('claude.ai')) return 'claude';
    if (url.includes('chat.openai.com') || url.includes('chatgpt.com')) return 'chatgpt';
    return 'unknown';
  }

  // 查找输入框
  function findInputBox() {
    const aiType = detectAIType();

    if (aiType === 'claude') {
      // Claude.ai 输入框
      return document.querySelector('textarea[data-id="composer-input"]') ||
             document.querySelector('textarea[placeholder*="Message"]') ||
             document.querySelector('[contenteditable="true"]');
    }

    if (aiType === 'chatgpt') {
      // ChatGPT 输入框
      return document.querySelector('textarea[data-id="request-textarea"]') ||
             document.querySelector('textarea[placeholder*="Message"]') ||
             document.querySelector('[contenteditable="true"]');
    }

    // 通用查找
    return document.querySelector('textarea') || document.querySelector('[contenteditable="true"]');
  }

  // 注入记忆到输入框
  function injectMemory(memory) {
    const input = findInputBox();
    if (!input) {
      console.error('[ObsidianMemory] 找不到输入框');
      return false;
    }

    const text = formatMemoryAsText(memory);

    if (input.tagName === 'TEXTAREA' || input.tagName === 'INPUT') {
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
    } else {
      // contenteditable
      input.textContent = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }

    return true;
  }

  // 格式化记忆为文本
  function formatMemoryAsText(memory) {
    const data = memory.data || memory;
    let text = '';

    if (data.narrative) {
      text += `📝 ${data.narrative}\n\n`;
    }

    if (data.title) {
      text += `📌 ${data.title}\n`;
    }

    if (data.concepts && data.concepts.length > 0) {
      text += `🏷️ ${data.concepts.join(', ')}\n`;
    }

    if (data.facts && data.facts.length > 0) {
      text += `📋 Facts:\n${data.facts.map(f => `  - ${f}`).join('\n')}\n`;
    }

    if (data.files_read && data.files_read.length > 0) {
      text += `📁 Files: ${data.files_read.join(', ')}\n`;
    }

    return text.trim();
  }

  // 创建悬浮按钮
  function createFloatingButton() {
    if (document.getElementById(BUTTON_ID)) return;

    const button = document.createElement('div');
    button.id = BUTTON_ID;
    button.innerHTML = '🧠';
    button.title = 'Obsidian Memory - 点击注入记忆';

    button.addEventListener('click', togglePanel);

    document.body.appendChild(button);
  }

  // 切换面板
  function togglePanel() {
    let panel = document.getElementById(PANEL_ID);

    if (panel) {
      panel.remove();
    } else {
      showPanel();
    }
  }

  // 显示记忆面板
  async function showPanel() {
    const panel = document.createElement('div');
    panel.id = PANEL_ID;
    panel.innerHTML = `
      <div class="om-header">
        <span>🧠 Obsidian Memory</span>
        <button class="om-close">×</button>
      </div>
      <div class="om-content">
        <div class="om-loading">加载中...</div>
      </div>
    `;

    document.body.appendChild(panel);

    // 关闭按钮
    panel.querySelector('.om-close').addEventListener('click', () => {
      panel.remove();
    });

    // 从 background 获取记忆
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getRecent' });

      if (response.success && response.data && response.data.length > 0) {
        const content = panel.querySelector('.om-content');
        content.innerHTML = renderMemoryList(response.data);
      } else {
        panel.querySelector('.om-content').innerHTML = '<div class="om-empty">暂无记忆</div>';
      }
    } catch (e) {
      panel.querySelector('.om-content').innerHTML = `<div class="om-error">加载失败: ${e.message}</div>`;
    }
  }

  // 渲染记忆列表
  function renderMemoryList(memories) {
    let html = '<div class="om-list">';

    for (const item of memories.slice(0, 10)) {
      const data = item.data || item;
      const time = new Date(data.created_at || Date.now()).toLocaleString('zh-CN');
      const typeLabel = getTypeLabel(data.type);

      html += `
        <div class="om-item" data-memory='${JSON.stringify(item).replace(/'/g, '&#39;')}'>
          <div class="om-item-header">
            <span class="om-type">${typeLabel}</span>
            <span class="om-time">${time}</span>
          </div>
          <div class="om-narrative">${data.narrative || data.title || '无描述'}</div>
          <div class="om-actions">
            <button class="om-inject-btn">注入</button>
          </div>
        </div>
      `;
    }

    html += '</div>';
    return html;
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

  // 初始化
  function init() {
    // 等待页面加载完成
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(createFloatingButton, 1000);
      });
    } else {
      setTimeout(createFloatingButton, 1000);
    }
  }

  // 监听来自 background 的消息
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'injectMemory') {
      const success = injectMemory(message.memory);
      sendResponse({ success });
    }
  });

  // 启动
  init();
})();