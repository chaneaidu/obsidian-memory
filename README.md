# Obsidian Memory

**Your AI's Long-Term Memory** — Transform Obsidian notes into persistent, injectable context for AI conversations.

[中文介绍](README_zh.md)

---

## The Problem

Every AI conversation starts from scratch. AI has **zero memory** of:
- Your codebase architecture decisions
- Recent project discoveries
- Past problem-solving approaches

Even though everything is documented in Obsidian, AI can't access it — creating a massive context gap that wastes your time repeating background.

## The Solution

**Obsidian Memory** bridges this gap with a complete system:

```
You work in Obsidian → Captures context → AI understands your world
```

**Three injection methods:**
1. **📋 Manual Copy** — One-click copy formatted memories
2. **🌐 Browser Extension** — Auto-inject into Claude/ChatGPT with one click
3. **🔌 API Access** — Programmatic access for AI tools and scripts

---

## Why Obsidian Memory?

| Feature | What It Means |
|---------|---------------|
| **Zero Configuration** | Works immediately with sensible defaults |
| **Privacy First** | All data stays local in your vault |
| **AI-Native Output** | Memories formatted for AI consumption, not human reading |
| **Three Injection Methods** | Manual, browser extension, or API — choose your workflow |
| **Auto-Capture** | Watches vault changes, no manual entry required |
| **Smart Search** | Find relevant memories by keyword or time |

---

## How It Works

```
┌──────────────────────────────────────────────────────────────┐
│                         YOUR VAULT                           │
│   ┌─────────┐   ┌─────────┐   ┌─────────┐                   │
│   │ Notes   │   │ Code    │   │ Docs    │   ...            │
│   └────┬────┘   └────┬────┘   └────┬────┘                  │
│        └─────────────┼─────────────┘                        │
│                      ↓                                       │
│            ┌─────────────────┐                             │
│            │  Auto-Capture   │  (30s polling)                │
│            └────────┬────────┘                             │
│                     ↓                                       │
│        ┌────────────────────────┐                          │
│        │   AI Narrative Gen     │  (MiniMax/any API)        │
│        └────────┬────────────────┘                          │
│                 ↓                                           │
│         memories.json                                       │
└─────────────────────────────────────────────────────────────┘
              ↓           ↓           ↓
         ┌────┐      ┌────┐      ┌────┐
         │ 📋 │      │ 🌐 │      │ 🔌 │
         └────┘      └────┘      └────┘
      Clipboard   Extension    API Server
```

---

## Quick Start

### 1. Install Plugin

Copy to Obsidian plugins folder:
```bash
# Your vault path
{vault}/.obsidian/plugins/obsidian-memory/
# Copy: main.js, manifest.json, styles.css
```

Enable in Obsidian Settings → Plugins → **Memory**

### 2. Configure API Key

Settings → Memory → Enter your API key (MiniMax or compatible API)

### 3. Start Using

- **Open Panel**: Click 🧠 in sidebar or `Ctrl/Cmd+P` → "Memory"
- **Auto-Capture**: Works automatically — just use Obsidian
- **Manual Add**: Click **+** to add thoughts manually
- **Search**: Type keywords with time filters (Today/Week/Month)
- **Inject**: Click **📋** to copy, paste into any AI

---

## Advanced: Browser Extension + API Server

### API Server (Optional)

For programmatic access or browser extension:

```bash
node server/index.js "/path/to/vault"
# Runs on http://localhost:9180
```

**Endpoints:**
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/memories` | All memories |
| GET | `/memories/recent?limit=10` | Recent memories |
| GET | `/memories/search?q=xxx` | Search memories |

### Browser Extension (Optional)

1. Open `chrome://extensions/`
2. Enable Developer Mode
3. Load unpacked → select `extension/` folder
4. Visit Claude.ai or ChatGPT — 🧠 button appears

---

## Features

### Core
- **Auto-Capture**: Detects file changes every 30s (configurable)
- **AI Narrative Generation**: Converts file changes into readable summaries
- **Local Storage**: All data in `memories.json` — no cloud, no tracking
- **Privacy**: Only observations sent to AI, never raw file content

### Search & Filter
- Full-text keyword search
- Time-based filtering (All/Today/Week/Month)
- Relevance-scored results

### Manual Memory
- Add thoughts not from files
- Tag with concepts
- Categorize by type (change/bugfix/feature/decision)

### Export
- Copy all memories as JSON
- Copy formatted memories for AI prompts
- Per-memory delete

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| API Key | (required) | Your AI API key |
| API URL | MiniMax endpoint | Custom AI endpoint |
| Model | MiniMax-Text-01 | AI model name |
| Poll Interval | 30s | How often to scan vault |
| Auto Capture | true | Automatically capture changes |
| Default Filter | All | Default time filter |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Obsidian Plugin API |
| Language | TypeScript |
| Bundler | esbuild |
| Storage | JSON (local vault) |
| AI | MiniMax Chat API (configurable) |

---

## Project Structure

```
obsidian-memory/
├── manifest.json              # Plugin metadata
├── package.json               # Project config
├── styles.css                 # Plugin styles
├── src/
│   ├── main.ts               # Entry point
│   ├── ui/MemoryPanel.ts     # Sidebar UI
│   ├── storage/SqliteStore.ts # Data persistence
│   ├── lifecycle/            # Vault polling
│   ├── search/               # Search logic
│   ├── observation/           # AI generation
│   └── settings/             # Settings UI
├── server/
│   └── index.js              # HTTP API server (optional)
└── extension/                 # Browser extension (optional)
    ├── manifest.json
    ├── background.js
    ├── content.js
    └── popup.html
```

---

## Privacy

- **Local Only**: All data stored in your vault's `.obsidian-memory/` folder
- **No Cloud**: Nothing sent to external servers except AI API (when you choose)
- **You Control**: Disable auto-capture anytime — manual mode only
- **No Telemetry**: Zero tracking, zero analytics

---

## FAQ

**Q: Which AI APIs work?**
A: Any OpenAI-compatible API. Default is MiniMax. Configure URL and model in settings.

**Q: How is data stored?**
A: `{vault}/.obsidian-memory/memories.json`

**Q: Why browser extension needs a server?**
A: Browser extensions can't read local files directly. The server reads `memories.json` and serves it via HTTP.

**Q: How to disable auto-capture?**
A: Settings → Auto Capture → OFF. Plugin records only manually added memories.

---

## License

MIT License

---

*Give your AI a memory. Give yourself back your time.*