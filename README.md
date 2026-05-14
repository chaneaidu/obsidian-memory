# Obsidian Memory

**Persistent memory for AI** - Capture your Obsidian work, generate AI-readable memories, and inject context into AI conversations.

[中文介绍](README_zh.md)

---

## The Problem

When you chat with AI (Claude, ChatGPT, etc.), each conversation starts from scratch. The AI knows nothing about:

- Your current project architecture
- Recent decisions you've made
- Important discoveries from your work

Even though you have everything documented in Obsidian, there's no easy way to give AI that context.

## The Solution

**Obsidian Memory** bridges this gap - it transforms your Obsidian work into persistent memory that AI can understand and use.

```
You work in Obsidian → Plugin captures observations → You inject context to AI → AI understands your context
```

---

## Key Features

| Feature | Description |
|---------|-------------|
| **Auto Capture** | Detects file changes in your vault every 30 seconds (configurable) |
| **AI Narrative Generation** | Uses MiniMax API to generate natural language descriptions |
| **Local Storage** | Saves to `memories.json` - persists across sessions |
| **Search & Filter** | Keyword search with time-based filtering |
| **Manual Notes** | Add thoughts manually, not just auto-capture |
| **Context Injection** | One-click copy formatted memories to clipboard |

---

## Use Cases

### 1. AI-Assisted Development

```
1. You edit code notes in Obsidian
2. Plugin generates observations ("Implemented user auth module")
3. Next time you ask AI, inject the relevant memories
4. AI understands your project context and gives better answers
```

### 2. Learning & Research

```
1. Read documentation and take notes in Obsidian
2. AI captures key findings and insights
3. Search quickly to find related knowledge
4. Generate summaries for review
```

### 3. Decision Tracking

```
1. Document architectural decisions in Obsidian
2. AI captures and generates decision narratives
3. Later, search to recall why certain decisions were made
```

### 4. Daily Work Log

```
1. File edits automatically generate observations
2. Manually add important thoughts
3. Weekend review: summarize the week's memories
```

---

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                      Obsidian Vault                           │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐                     │
│  │ File A  │   │ File B  │   │ File C  │   ...             │
│  └────┬────┘   └────┬────┘   └────┬────┘                   │
│       └─────────────┼─────────────┘                           │
│                     ▼                                         │
│              ┌──────────────┐                                │
│              │ LifecycleManager │  (30s polling)             │
│              └──────────────┘                                │
│                     │                                         │
│                     ▼                                         │
│         ┌─────────────────────┐                            │
│         │ ObservationGenerator │  (AI narrative)            │
│         └─────────────────────┘                            │
│                     │                                         │
│                     ▼                                         │
│           memories.json                                     │
└─────────────────────────────────────────────────────────────┘

                         │ (user action)

┌─────────────────────────────────────────────────────────────┐
│                      Memory Panel                            │
│  Click 📋 → Memories copied to clipboard → Paste to AI       │
└─────────────────────────────────────────────────────────────┘
```

---

## Installation

### Prerequisites

- Obsidian v1.5.0 or higher
- MiniMax API Key (for AI narrative generation)

### Steps

1. Download `main.js`, `manifest.json`, `styles.css` from releases
2. Put them in `{vault}/.obsidian/plugins/obsidian-memory/`
3. Enable plugin in Obsidian Settings → Plugins
4. Configure your MiniMax API Key in plugin settings

### Get MiniMax API Key

1. Visit [MiniMax API](https://api.minimax.chat/)
2. Register and get an API Key
3. Paste in plugin settings

---

## Usage

### Open Memory Panel

- Click the lightbulb icon in left sidebar
- Or use Command Palette (Ctrl/Cmd+P) → search "Memory"

### Add Memory Manually

1. Click **"+"** button at top
2. Fill in title, content, type, concepts
3. Click "Save"

### Search Memories

1. Type keywords in search box
2. Press Enter
3. Use time filter (All/Today/This Week/This Month)

### Inject Context to AI

1. Start an AI conversation
2. Click **"📋"** button in panel
3. Memories copied to clipboard
4. Paste into AI conversation

### Delete Memory

- Hover over any memory → red "Delete" button appears

### Export

- Click "Export Memories" at bottom → all memories JSON copied to clipboard

---

## Privacy

- **Local Storage** - All data saved to local `memories.json`
- **AI Communication** - Only observations (not file content) sent to MiniMax API
- **You Control** - Disable auto-capture anytime, manual only
- **No Tracking** - Plugin collects no usage data

---

## Configuration

| Setting | Description | Default |
|---------|-------------|---------|
| API Key | MiniMax API Key for AI generation | (required) |
| Poll Interval | Seconds between vault scans | 30 |
| Auto Capture | Automatically capture file changes | true |
| Default Time Filter | Default view filter | All |

---

## Tech Stack

| Component | Technology |
|-----------|------------|
| Framework | Obsidian Plugin API |
| Language | TypeScript |
| Bundler | esbuild |
| Storage | JSON file (local) |
| AI | MiniMax Chat API |

---

## Project Structure

```
obsidian-memory-plugin/
├── manifest.json           # Plugin metadata
├── package.json            # Project config
├── styles.css              # Styles
├── src/
│   ├── main.ts            # Entry point
│   ├── ui/
│   │   └── MemoryPanel.ts # Sidebar UI
│   ├── storage/
│   │   └── SqliteStore.ts  # Data persistence
│   ├── lifecycle/
│   │   └── LifecycleManager.ts  # Vault polling
│   ├── search/
│   │   └── SearchManager.ts     # Search
│   ├── observation/
│   │   └── ObservationGenerator.ts  # AI generation
│   ├── settings/
│   │   ├── SettingsManager.ts
│   │   └── SettingsTab.ts
│   └── utils/
│       └── tag-stripping.ts
└── scripts/
    ├── bundle.js
    └── deploy.js
```

---

## FAQ

### Q: How to get API Key?
Visit [MiniMax API](https://api.minimax.chat/) to register and get one.

### Q: Why did AI generation fail?
1. Check if API Key is configured correctly
2. Check network connection
3. API has rate limits - wait and retry

### Q: Where is data stored?
`{vault}/.obsidian-memory/memories.json`

### Q: How to disable auto-capture?
Turn off "Auto Capture" in settings - plugin will only record manually added memories.

---

## License

MIT License
