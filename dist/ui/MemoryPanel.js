"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryPanel = void 0;
const obsidian_1 = require("obsidian");
class MemoryPanel extends obsidian_1.ItemView {
    constructor(leaf, store, searchManager) {
        super(leaf);
        this.memoryListEl = null;
        this.store = store;
        this.searchManager = searchManager;
    }
    getViewType() {
        return 'memory-panel';
    }
    getDisplayText() {
        return 'Memory';
    }
    async onOpen() {
        const container = this.contentEl;
        container.innerHTML = `
      <div class="memory-panel">
        <div class="memory-header">
          <h3>Memory</h3>
          <button class="refresh-btn">Refresh</button>
        </div>
        <div class="memory-search">
          <input type="text" placeholder="Search memories..." />
        </div>
        <div class="memory-list"></div>
      </div>
    `;
        this.memoryListEl = container.querySelector('.memory-list');
        // Event listeners
        container.querySelector('.refresh-btn')?.addEventListener('click', () => this.refreshMemories());
        container.querySelector('input')?.addEventListener('keypress', async (e) => {
            if (e.key === 'Enter') {
                const target = e.target;
                await this.searchMemories(target.value);
            }
        });
        await this.refreshMemories();
    }
    async onClose() {
        // Cleanup
    }
    async refreshMemories() {
        if (!this.memoryListEl)
            return;
        const observations = await this.store.getObservations('default', 20);
        if (observations.length === 0) {
            this.memoryListEl.innerHTML = '<div class="empty-state">No memories yet. Start working in your vault!</div>';
            return;
        }
        this.memoryListEl.innerHTML = observations.map((obs) => `
      <div class="memory-item" data-id="${obs.id}">
        <div class="memory-item-header">
          <span class="memory-type">${obs.type}</span>
          <span class="memory-date">${new Date(obs.created_at).toLocaleDateString()}</span>
        </div>
        <div class="memory-title">${obs.title || 'Untitled'}</div>
        ${obs.narrative ? `<div class="memory-preview">${obs.narrative.substring(0, 100)}...</div>` : ''}
        <button class="copy-btn">Copy</button>
      </div>
    `).join('');
        // Add copy handlers
        this.memoryListEl.querySelectorAll('.copy-btn').forEach((btn) => {
            btn.addEventListener('click', async (e) => {
                const target = e.target;
                const id = target.closest('.memory-item')?.getAttribute('data-id');
                const obs = observations.find((o) => o.id === id);
                if (obs) {
                    await navigator.clipboard.writeText(obs.narrative || obs.title || '');
                    target.textContent = 'Copied!';
                    setTimeout(() => target.textContent = 'Copy', 1500);
                }
            });
        });
    }
    async searchMemories(query) {
        if (!this.memoryListEl)
            return;
        const results = await this.searchManager.search(query, { limit: 20 });
        const observations = results.map(r => r.observation).filter((o) => o !== undefined);
        if (observations.length === 0) {
            this.memoryListEl.innerHTML = `<div class="empty-state">No results for "${query}"</div>`;
            return;
        }
        this.memoryListEl.innerHTML = observations.map((obs) => {
            const result = results.find(r => r.observation?.id === obs.id);
            return `
      <div class="memory-item" data-id="${obs.id}">
        <div class="memory-item-header">
          <span class="memory-type">${obs.type}</span>
          <span class="memory-score">Score: ${result?.relevanceScore.toFixed(2) || 0}</span>
        </div>
        <div class="memory-title">${obs.title || 'Untitled'}</div>
        ${obs.narrative ? `<div class="memory-preview">${obs.narrative.substring(0, 100)}...</div>` : ''}
        <button class="copy-btn">Copy</button>
      </div>
    `;
        }).join('');
    }
}
exports.MemoryPanel = MemoryPanel;
//# sourceMappingURL=MemoryPanel.js.map