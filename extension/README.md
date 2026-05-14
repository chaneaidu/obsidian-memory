# Obsidian Memory Browser Extension

## 安装步骤

### 1. API 服务器（必需）

```bash
node server/index.js [/path/to/vault]
```

示例：
```bash
# 使用默认 vault 路径（当前目录）
node server/index.js

# 指定 vault 路径
node server/index.js "/home/how/文档/Obsidian Vault"
```

服务器启动后会在后台运行，监听端口 9180。

### 2. 加载浏览器扩展

1. 打开 Chrome/Edge → `chrome://extensions/`
2. 开启 **开发者模式**（右上角）
3. 点击 **加载已解压的扩展程序**
4. 选择本目录

### 3. 使用

1. 确保 API 服务器正在运行
2. 打开扩展图标（工具栏中的 🧠 图标）
3. 在 Obsidian 中工作，记忆会自动同步
4. 访问 Claude.ai 或 ChatGPT 时，点击 🧠 按钮注入记忆

## 文件结构

```
extension/
├── manifest.json    # 扩展清单 (MV3)
├── background.js    # 后台脚本 (Service Worker)
├── content.js       # 内容脚本 (注入 AI 网站)
├── popup.html       # 弹窗界面
├── popup.js        # 弹窗逻辑
├── styles/
│   └── content.css # 内容样式
└── icons/           # 图标文件 (需自行下载)
```

## 功能

- ✅ 从 API 读取最近记忆
- ✅ 搜索记忆
- ✅ 一键注入记忆到 AI 对话框
- ✅ 悬浮按钮快速访问
- ⚙️ 连接到本地 API 服务器

## 图标

需要添加图标文件到 `icons/` 目录：
- `icon16.png`
- `icon32.png`
- `icon48.png`
- `icon128.png`

可以从 [Flaticon](https://www.flaticon.com) 下载 brain/memory 相关免费图标。

## API 端点

| 端点 | 描述 |
|------|------|
| `GET /health` | 健康检查 |
| `GET /memories` | 获取所有记忆 |
| `GET /memories/recent?limit=10` | 获取最近 N 条记忆 |
| `GET /memories/search?q=xxx` | 搜索记忆 |

## 支持的 AI 网站

- claude.ai
- chat.openai.com
- chatgpt.com