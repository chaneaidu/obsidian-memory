/**
 * Obsidian Memory API Server
 * 提供本地 HTTP API 让浏览器扩展或其他工具读取记忆数据
 *
 * 使用方法: node server/index.js [vault_path]
 * 默认 vault_path: 当前工作目录
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

// 配置
const PORT = 9180;
const VAULT_PATH = process.argv[2] || process.cwd();
const DATA_FILE = path.join(VAULT_PATH, '.obsidian-memory', 'memories.json');
const POLL_INTERVAL = 5000; // 5秒轮询

// 内存缓存
let cache = {
  memories: { sessions: [], observations: [], summaries: [] },
  lastModified: 0
};

// 读取数据文件
function readMemoriesFile() {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return null;
    }
    const stats = fs.statSync(DATA_FILE);
    const lastModified = stats.mtimeMs;

    // 如果文件没有变化，使用缓存
    if (lastModified === cache.lastModified && cache.memories) {
      return cache.memories;
    }

    const content = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(content);

    cache.memories = data;
    cache.lastModified = lastModified;

    return data;
  } catch (e) {
    console.error('[API Server] 读取文件失败:', e.message);
    return null;
  }
}

// 搜索记忆
function searchMemories(data, query) {
  if (!data || !query) return [];

  const q = query.toLowerCase();
  const results = [];

  // 搜索 observations
  if (data.observations) {
    for (const obs of data.observations) {
      const searchable = [
        obs.title || '',
        obs.narrative || '',
        obs.type || '',
        ...(obs.concepts || []),
        ...(obs.facts || [])
      ].join(' ').toLowerCase();

      if (searchable.includes(q)) {
        results.push({ type: 'observation', data: obs, score: 1 });
      }
    }
  }

  // 搜索 summaries
  if (data.summaries) {
    for (const summary of data.summaries) {
      const searchable = [
        summary.learned || '',
        summary.request || '',
        summary.investigated || ''
      ].join(' ').toLowerCase();

      if (searchable.includes(q)) {
        results.push({ type: 'summary', data: summary, score: 1 });
      }
    }
  }

  return results;
}

// 构建响应
function jsonResponse(data, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
}

// 构建错误响应
function errorResponse(message, code, res) {
  res.writeHead(code, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
  });
  res.end(JSON.stringify({ success: false, error: message }));
}

// 路由处理
function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const query = url.searchParams.get('q') || '';

  console.log(`[${new Date().toISOString()}] ${req.method} ${pathname}`);

  // CORS 预检
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  try {
    // GET /health - 健康检查
    if (pathname === '/health' || pathname === '/') {
      const data = readMemoriesFile();
      return jsonResponse({
        success: true,
        status: 'ok',
        server: 'Obsidian Memory API',
        version: '1.0.0',
        vault: VAULT_PATH,
        dataFile: DATA_FILE,
        hasData: data !== null,
        timestamp: new Date().toISOString()
      }, res);
    }

    // GET /memories - 获取所有记忆
    if (pathname === '/memories') {
      const data = readMemoriesFile();
      if (!data) {
        return jsonResponse({
          success: true,
          count: 0,
          data: { sessions: [], observations: [], summaries: [] }
        }, res);
      }
      return jsonResponse({
        success: true,
        count: (data.observations?.length || 0) + (data.summaries?.length || 0),
        data: data
      }, res);
    }

    // GET /memories/recent - 获取最近的记忆
    if (pathname === '/memories/recent') {
      const limit = parseInt(url.searchParams.get('limit') || '10', 10);
      const data = readMemoriesFile();
      if (!data) {
        return jsonResponse({ success: true, count: 0, data: [] }, res);
      }

      const observations = data.observations || [];
      const recent = observations
        .sort((a, b) => (b.created_at_epoch || 0) - (a.created_at_epoch || 0))
        .slice(0, limit)
        .map(obs => ({ type: 'observation', data: obs }));

      return jsonResponse({
        success: true,
        count: recent.length,
        data: recent
      }, res);
    }

    // GET /memories/search - 搜索记忆
    if (pathname === '/memories/search') {
      if (!query) {
        return errorResponse('Missing query parameter: q', 400, res);
      }
      const data = readMemoriesFile();
      const results = searchMemories(data, query);
      return jsonResponse({
        success: true,
        count: results.length,
        query: query,
        data: results
      }, res);
    }

    // 404
    errorResponse('Not found', 404, res);

  } catch (e) {
    console.error('[API Server] 处理请求失败:', e);
    errorResponse('Internal server error', 500, res);
  }
}

// 启动服务器
const server = http.createServer(handleRequest);

server.listen(PORT, () => {
  console.log('');
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║         Obsidian Memory API Server                  ║');
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log(`║  Port:     ${PORT}                                  ║`);
  console.log(`║  Vault:    ${VAULT_PATH}              ║`);
  console.log(`║  Data:     ${DATA_FILE}  ║`);
  console.log('╠═══════════════════════════════════════════════════════╣');
  console.log('║  Endpoints:                                        ║');
  console.log('║    GET /health          - 健康检查                  ║');
  console.log('║    GET /memories        - 获取所有记忆               ║');
  console.log('║    GET /memories/recent - 获取最近记忆               ║');
  console.log('║    GET /memories/search?q=xxx - 搜索记忆            ║');
  console.log('╚═══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('按 Ctrl+C 停止服务器');
});

// 错误处理
server.on('error', (e) => {
  if (e.code === 'EADDRINUSE') {
    console.error(`端口 ${PORT} 已被占用，请关闭其他程序或使用其他端口`);
  } else {
    console.error('服务器错误:', e);
  }
  process.exit(1);
});