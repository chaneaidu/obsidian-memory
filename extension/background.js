/**
 * Obsidian Memory - Background Service Worker (MV3)
 * 负责从 API 服务器获取记忆数据，并与 content script 通信
 */

const API_BASE = 'http://localhost:9180';
const POLL_INTERVAL = 30000; // 30秒轮询
const MAX_RECENT = 20;

// 缓存
let memoryCache = {
  recent: [],
  all: null,
  lastFetch: 0
};

// 状态
let isConnected = false;
let lastError = null;

// 获取记忆数据
async function fetchMemories(endpoint = '/memories') {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${API_BASE}${endpoint}`, {
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (e) {
    console.error('[ObsidianMemory Background] Fetch error:', e.message);
    throw e;
  }
}

// 获取最近记忆
async function fetchRecentMemories() {
  try {
    const data = await fetchMemories('/memories/recent?limit=' + MAX_RECENT);
    if (data.success) {
      memoryCache.recent = data.data || [];
      memoryCache.lastFetch = Date.now();
      isConnected = true;
      lastError = null;
      return data.data;
    }
    return [];
  } catch (e) {
    isConnected = false;
    lastError = e.message;
    return [];
  }
}

// 获取所有记忆
async function fetchAllMemories() {
  try {
    const data = await fetchMemories('/memories');
    if (data.success) {
      memoryCache.all = data.data;
      memoryCache.lastFetch = Date.now();
      isConnected = true;
      lastError = null;
      return data.data;
    }
    return null;
  } catch (e) {
    isConnected = false;
    lastError = e.message;
    return null;
  }
}

// 搜索记忆
async function searchMemories(query) {
  try {
    const encodedQuery = encodeURIComponent(query);
    const data = await fetchMemories(`/memories/search?q=${encodedQuery}`);
    if (data.success) {
      return data.data || [];
    }
    return [];
  } catch (e) {
    console.error('[ObsidianMemory Background] Search error:', e.message);
    return [];
  }
}

// 定时更新缓存
async function startPolling() {
  await fetchRecentMemories();
  setInterval(async () => {
    await fetchRecentMemories();
  }, POLL_INTERVAL);
}

// 监听来自 popup 和 content script 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message).then(sendResponse);
  return true; // 异步响应
});

async function handleMessage(message) {
  const { action, data } = message;

  switch (action) {
    case 'getRecent':
      // 如果缓存过期，重新获取
      if (Date.now() - memoryCache.lastFetch > POLL_INTERVAL) {
        await fetchRecentMemories();
      }
      return {
        success: true,
        data: memoryCache.recent,
        isConnected,
        lastError
      };

    case 'getAll':
      if (!memoryCache.all || Date.now() - memoryCache.lastFetch > POLL_INTERVAL) {
        await fetchAllMemories();
      }
      return {
        success: true,
        data: memoryCache.all,
        isConnected,
        lastError
      };

    case 'search':
      const results = await searchMemories(data.query);
      return {
        success: true,
        data: results,
        isConnected,
        lastError
      };

    case 'inject':
      // 转发到 content script
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          action: 'injectMemory',
          memory: data.memory
        });
      }
      return { success: true };

    case 'checkConnection':
      return {
        success: true,
        isConnected,
        lastError,
        lastFetch: memoryCache.lastFetch
      };

    default:
      return { success: false, error: 'Unknown action' };
  }
}

// 安装时初始化
chrome.runtime.onInstalled.addListener(() => {
  console.log('[ObsidianMemory] Extension installed');
  startPolling();
});

// 启动时初始化
startPolling();