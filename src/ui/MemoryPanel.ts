import { ItemView, WorkspaceLeaf, Notice } from 'obsidian';
import { SqliteStore, Observation, SessionSummary } from '../storage/SqliteStore';
import { SearchManager } from '../search/SearchManager';

export class MemoryPanel extends ItemView {
  private store: SqliteStore;
  private searchManager: SearchManager;
  private memoryListEl: HTMLElement | null = null;
  private searchInputEl: HTMLInputElement | null = null;
  private refreshInterval: number | null = null;
  private currentTimePeriod: string = 'all';
  private currentTab: string = 'observations';

  constructor(leaf: WorkspaceLeaf, store: SqliteStore, searchManager: SearchManager) {
    super(leaf);
    this.store = store;
    this.searchManager = searchManager;
  }

  getViewType(): string {
    return 'memory-panel';
  }

  getDisplayText(): string {
    return '记忆';
  }

  async onOpen(): Promise<void> {
    const container = this.contentEl;
    container.innerHTML = `
      <div class="memory-panel">
        <div class="memory-header">
          <h3>记忆</h3>
          <div class="header-actions">
            <button class="add-btn" title="添加记忆">+</button>
            <button class="refresh-btn" title="刷新">↻</button>
            <button class="inject-btn" title="注入上下文">📋</button>
          </div>
        </div>
        <div class="memory-search">
          <input type="text" placeholder="搜索记忆..." />
        </div>
        <div class="memory-time-filter">
          <button class="time-btn active" data-period="all">全部</button>
          <button class="time-btn" data-period="day">今天</button>
          <button class="time-btn" data-period="week">本周</button>
          <button class="time-btn" data-period="month">本月</button>
        </div>
        <div class="memory-tabs">
          <button class="tab-btn active" data-tab="observations">观察</button>
          <button class="tab-btn" data-tab="summaries">摘要</button>
        </div>
        <div class="memory-list"></div>
        <div class="memory-footer">
          <button class="export-btn">导出记忆</button>
          <span class="status-text">上次更新：从未</span>
        </div>
      </div>
    `;

    this.memoryListEl = container.querySelector('.memory-list');
    this.searchInputEl = container.querySelector('.memory-search input');

    // Event listeners
    container.querySelector('.add-btn')?.addEventListener('click', () => this.showAddMemoryModal());
    container.querySelector('.refresh-btn')?.addEventListener('click', () => this.refreshMemories());
    container.querySelector('.inject-btn')?.addEventListener('click', () => this.injectContext());
    container.querySelector('.export-btn')?.addEventListener('click', () => this.exportMemories());

    this.searchInputEl?.addEventListener('keypress', async (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        await this.searchMemories(this.searchInputEl?.value || '');
      }
    });

    // Tab switching
    container.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const tab = target.getAttribute('data-tab');
        container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        this.currentTab = tab || 'observations';
        if (this.currentTab === 'summaries') {
          this.loadSummaries();
        } else {
          this.refreshMemories();
        }
      });
    });

    // Time filter switching
    container.querySelectorAll('.time-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const period = target.getAttribute('data-period') || 'all';
        container.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
        target.classList.add('active');
        this.currentTimePeriod = period;
        this.applyCurrentFilter();
      });
    });

    // Auto refresh every 30 seconds
    this.refreshInterval = window.setInterval(() => this.refreshMemories(), 30000);

    await this.refreshMemories();
  }

  async onClose(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  private async refreshMemories(): Promise<void> {
    if (!this.memoryListEl) return;

    let observations = await this.store.getObservations('default', 50);
    observations = this.filterByTimePeriod(observations);
    this.updateStatus('上次更新：' + new Date().toLocaleTimeString());

    if (observations.length === 0) {
      this.memoryListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🧠</div>
          <div class="empty-text">还没有记忆</div>
          <div class="empty-hint">开始在 vault 中工作，我会记住一切</div>
        </div>
      `;
      return;
    }

    this.memoryListEl.innerHTML = observations.map((obs: Observation) => this.renderObservation(obs)).join('');

    this.attachCopyHandlers();
  }

  private filterByTimePeriod(observations: Observation[]): Observation[] {
    const now = Date.now();
    const msPerDay = 24 * 60 * 60 * 1000;

    switch (this.currentTimePeriod) {
      case 'day':
        return observations.filter(o => (now - o.created_at_epoch) < msPerDay);
      case 'week':
        return observations.filter(o => (now - o.created_at_epoch) < 7 * msPerDay);
      case 'month':
        return observations.filter(o => (now - o.created_at_epoch) < 30 * msPerDay);
      default:
        return observations;
    }
  }

  private async applyCurrentFilter(): Promise<void> {
    const query = this.searchInputEl?.value?.trim() || '';
    if (query) {
      await this.searchMemories(query);
    } else {
      await this.refreshMemories();
    }
  }

  private renderObservation(obs: Observation): string {
    const date = new Date(obs.created_at).toLocaleString();
    const narrative = obs.narrative || obs.title || 'No description';

    return `
      <div class="memory-item has-delete" data-id="${obs.id}">
        <div class="memory-item-header">
          <span class="memory-type memory-type-${obs.type}">${obs.type}</span>
          <span class="memory-date">${date}</span>
        </div>
        <div class="memory-title">${this.escapeHtml(obs.title || 'Untitled')}</div>
        <div class="memory-narrative">${this.escapeHtml(narrative.substring(0, 150))}${narrative.length > 150 ? '...' : ''}</div>
        ${obs.concepts && obs.concepts.length > 0 ? `
          <div class="memory-concepts">
            ${obs.concepts.slice(0, 3).map(c => `<span class="concept-tag">${this.escapeHtml(c)}</span>`).join('')}
          </div>
        ` : ''}
        <div class="memory-actions">
          <button class="copy-btn" data-narrative="${this.escapeAttr(narrative)}">复制</button>
          <button class="delete-btn" data-id="${obs.id}">删除</button>
        </div>
      </div>
    `;
  }

  private async loadSummaries(): Promise<void> {
    if (!this.memoryListEl) return;

    const summaries = await this.store.getRecentSummaries('default', 20);

    if (summaries.length === 0) {
      this.memoryListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">📝</div>
          <div class="empty-text">还没有摘要</div>
          <div class="empty-hint">会话摘要将显示在这里</div>
        </div>
      `;
      return;
    }

    this.memoryListEl.innerHTML = summaries.map((summary: SessionSummary) => `
      <div class="memory-item summary-item" data-id="${summary.id}">
        <div class="memory-item-header">
          <span class="memory-type memory-type-summary">session</span>
          <span class="memory-date">${new Date(summary.created_at).toLocaleDateString()}</span>
        </div>
        <div class="memory-title">Session ${summary.session_id.substring(0, 8)}</div>
        ${summary.learned ? `<div class="memory-narrative">${this.escapeHtml(summary.learned.substring(0, 150))}...</div>` : ''}
      </div>
    `).join('');
  }

  private attachCopyHandlers(): void {
    this.memoryListEl?.querySelectorAll('.copy-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const narrative = target.getAttribute('data-narrative') || '';
        try {
          await navigator.clipboard.writeText(narrative);
          target.textContent = '已复制!';
          target.classList.add('copied');
          setTimeout(() => {
            target.textContent = '复制';
            target.classList.remove('copied');
          }, 1500);
        } catch (e) {
          new Notice('复制失败');
        }
      });
    });

    this.memoryListEl?.querySelectorAll('.delete-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const target = e.currentTarget as HTMLElement;
        const id = target.getAttribute('data-id');
        if (id && confirm('确定要删除这条记忆吗？')) {
          await this.deleteMemory(id);
        }
      });
    });
  }

  private async deleteMemory(id: string): Promise<void> {
    await this.store.deleteObservation(id);
    new Notice('记忆已删除');
    await this.refreshMemories();
  }

  async exportMemories(): Promise<void> {
    const observations = await this.store.getObservations('default', 1000);
    const data = JSON.stringify(observations, null, 2);
    await navigator.clipboard.writeText(data);
    new Notice('记忆已复制到剪贴板');
  }

  private async searchMemories(query: string): Promise<void> {
    if (!this.memoryListEl || !query.trim()) {
      await this.refreshMemories();
      return;
    }

    const results = await this.searchManager.search(query, { limit: 50 });
    let observations = results.map(r => r.observation).filter((o): o is Observation => o !== undefined);
    observations = this.filterByTimePeriod(observations);

    if (observations.length === 0) {
      this.memoryListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">没有找到结果</div>
          <div class="empty-hint">尝试不同的搜索词</div>
        </div>
      `;
      return;
    }

    this.memoryListEl.innerHTML = observations.map((obs: Observation) => {
      const result = results.find(r => r.observation?.id === obs.id);
      return `
        <div class="memory-item" data-id="${obs.id}">
          <div class="memory-item-header">
            <span class="memory-type memory-type-${obs.type}">${obs.type}</span>
            <span class="memory-score">相关度: ${result?.relevanceScore.toFixed(2) || 0}</span>
          </div>
          <div class="memory-title">${this.escapeHtml(obs.title || 'Untitled')}</div>
          <div class="memory-narrative">${this.escapeHtml((obs.narrative || '').substring(0, 150))}...</div>
          <div class="memory-actions">
            <button class="copy-btn" data-narrative="${this.escapeAttr(obs.narrative || obs.title || '')}">复制</button>
          </div>
        </div>
      `;
    }).join('');

    this.attachCopyHandlers();
  }

  private async injectContext(): Promise<void> {
    try {
      const context = await this.searchManager.getContextForInjection({ limit: 10 });
      await navigator.clipboard.writeText(context);
      new Notice('记忆上下文已复制到剪贴板！');
    } catch (e) {
      new Notice('注入上下文失败');
    }
  }

  private showAddMemoryModal(): void {
    const modalHtml = `
      <div class="memory-modal-overlay">
        <div class="memory-modal">
          <div class="memory-modal-header">
            <h4>添加记忆</h4>
            <button class="modal-close">×</button>
          </div>
          <div class="memory-modal-body">
            <div class="form-group">
              <label>标题</label>
              <input type="text" class="memory-title-input" placeholder="记忆标题..." />
            </div>
            <div class="form-group">
              <label>类型</label>
              <select class="memory-type-select">
                <option value="observation">观察</option>
                <option value="idea">想法</option>
                <option value="todo">待办</option>
                <option value="note">笔记</option>
              </select>
            </div>
            <div class="form-group">
              <label>内容</label>
              <textarea class="memory-content-input" placeholder="详细描述..." rows="4"></textarea>
            </div>
            <div class="form-group">
              <label>概念（逗号分隔）</label>
              <input type="text" class="memory-concepts-input" placeholder="概念1, 概念2..." />
            </div>
          </div>
          <div class="memory-modal-footer">
            <button class="modal-cancel">取消</button>
            <button class="modal-save">保存</button>
          </div>
        </div>
      </div>
    `;

    const overlay = document.createElement('div');
    overlay.innerHTML = modalHtml;
    document.body.appendChild(overlay);

    const closeModal = () => {
      document.body.removeChild(overlay);
    };

    overlay.querySelector('.modal-close')?.addEventListener('click', closeModal);
    overlay.querySelector('.modal-cancel')?.addEventListener('click', closeModal);
    overlay.querySelector('.modal-save')?.addEventListener('click', async () => {
      const titleInput = overlay.querySelector('.memory-title-input') as HTMLInputElement;
      const typeSelect = overlay.querySelector('.memory-type-select') as HTMLSelectElement;
      const contentInput = overlay.querySelector('.memory-content-input') as HTMLTextAreaElement;
      const conceptsInput = overlay.querySelector('.memory-concepts-input') as HTMLInputElement;

      const title = titleInput.value.trim();
      const content = contentInput.value.trim();

      if (!title && !content) {
        new Notice('请输入标题或内容');
        return;
      }

      const concepts = conceptsInput.value.split(',').map(c => c.trim()).filter(c => c);

      await this.addMemory({
        type: typeSelect.value,
        title: title || '无标题',
        narrative: content,
        concepts
      });

      closeModal();
      new Notice('记忆已添加');
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });
  }

  private async addMemory(data: { type: string; title: string; narrative: string; concepts: string[] }): Promise<void> {
    const observation: Observation = {
      id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      session_id: 'manual',
      project: 'default',
      type: data.type,
      title: data.title,
      narrative: data.narrative,
      facts: [],
      concepts: data.concepts,
      files_read: [],
      files_modified: [],
      created_at: new Date().toISOString(),
      created_at_epoch: Date.now()
    };

    await this.store.createObservation(observation);
    await this.refreshMemories();
  }

  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  private escapeAttr(text: string): string {
    return text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
}