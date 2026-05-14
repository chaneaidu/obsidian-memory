"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/ui/MemoryPanel.ts
var MemoryPanel_exports = {};
__export(MemoryPanel_exports, {
  MemoryPanel: () => MemoryPanel
});
var import_obsidian2, MemoryPanel;
var init_MemoryPanel = __esm({
  "src/ui/MemoryPanel.ts"() {
    "use strict";
    import_obsidian2 = require("obsidian");
    MemoryPanel = class extends import_obsidian2.ItemView {
      constructor(leaf, store, searchManager) {
        super(leaf);
        this.memoryListEl = null;
        this.searchInputEl = null;
        this.refreshInterval = null;
        this.currentTimePeriod = "all";
        this.currentTab = "observations";
        this.store = store;
        this.searchManager = searchManager;
      }
      getViewType() {
        return "memory-panel";
      }
      getDisplayText() {
        return "\u8BB0\u5FC6";
      }
      async onOpen() {
        const container = this.contentEl;
        container.innerHTML = `
      <div class="memory-panel">
        <div class="memory-header">
          <h3>\u8BB0\u5FC6</h3>
          <div class="header-actions">
            <button class="add-btn" title="\u6DFB\u52A0\u8BB0\u5FC6">+</button>
            <button class="refresh-btn" title="\u5237\u65B0">\u21BB</button>
            <button class="inject-btn" title="\u6CE8\u5165\u4E0A\u4E0B\u6587">\u{1F4CB}</button>
          </div>
        </div>
        <div class="memory-search">
          <input type="text" placeholder="\u641C\u7D22\u8BB0\u5FC6..." />
        </div>
        <div class="memory-time-filter">
          <button class="time-btn active" data-period="all">\u5168\u90E8</button>
          <button class="time-btn" data-period="day">\u4ECA\u5929</button>
          <button class="time-btn" data-period="week">\u672C\u5468</button>
          <button class="time-btn" data-period="month">\u672C\u6708</button>
        </div>
        <div class="memory-tabs">
          <button class="tab-btn active" data-tab="observations">\u89C2\u5BDF</button>
          <button class="tab-btn" data-tab="summaries">\u6458\u8981</button>
        </div>
        <div class="memory-list"></div>
        <div class="memory-footer">
          <button class="export-btn">\u5BFC\u51FA\u8BB0\u5FC6</button>
          <span class="status-text">\u4E0A\u6B21\u66F4\u65B0\uFF1A\u4ECE\u672A</span>
        </div>
      </div>
    `;
        this.memoryListEl = container.querySelector(".memory-list");
        this.searchInputEl = container.querySelector(".memory-search input");
        container.querySelector(".add-btn")?.addEventListener("click", () => this.showAddMemoryModal());
        container.querySelector(".refresh-btn")?.addEventListener("click", () => this.refreshMemories());
        container.querySelector(".inject-btn")?.addEventListener("click", () => this.injectContext());
        container.querySelector(".export-btn")?.addEventListener("click", () => this.exportMemories());
        this.searchInputEl?.addEventListener("keypress", async (e) => {
          if (e.key === "Enter") {
            await this.searchMemories(this.searchInputEl?.value || "");
          }
        });
        container.querySelectorAll(".tab-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const target = e.currentTarget;
            const tab = target.getAttribute("data-tab");
            container.querySelectorAll(".tab-btn").forEach((b) => b.classList.remove("active"));
            target.classList.add("active");
            this.currentTab = tab || "observations";
            if (this.currentTab === "summaries") {
              this.loadSummaries();
            } else {
              this.refreshMemories();
            }
          });
        });
        container.querySelectorAll(".time-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            const target = e.currentTarget;
            const period = target.getAttribute("data-period") || "all";
            container.querySelectorAll(".time-btn").forEach((b) => b.classList.remove("active"));
            target.classList.add("active");
            this.currentTimePeriod = period;
            this.applyCurrentFilter();
          });
        });
        this.refreshInterval = window.setInterval(() => this.refreshMemories(), 3e4);
        await this.refreshMemories();
      }
      async onClose() {
        if (this.refreshInterval) {
          clearInterval(this.refreshInterval);
        }
      }
      async refreshMemories() {
        if (!this.memoryListEl) return;
        let observations = await this.store.getObservations("default", 50);
        observations = this.filterByTimePeriod(observations);
        this.updateStatus("\u4E0A\u6B21\u66F4\u65B0\uFF1A" + (/* @__PURE__ */ new Date()).toLocaleTimeString());
        if (observations.length === 0) {
          this.memoryListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">\u{1F9E0}</div>
          <div class="empty-text">\u8FD8\u6CA1\u6709\u8BB0\u5FC6</div>
          <div class="empty-hint">\u5F00\u59CB\u5728 vault \u4E2D\u5DE5\u4F5C\uFF0C\u6211\u4F1A\u8BB0\u4F4F\u4E00\u5207</div>
        </div>
      `;
          return;
        }
        this.memoryListEl.innerHTML = observations.map((obs) => this.renderObservation(obs)).join("");
        this.attachCopyHandlers();
      }
      filterByTimePeriod(observations) {
        const now = Date.now();
        const msPerDay = 24 * 60 * 60 * 1e3;
        switch (this.currentTimePeriod) {
          case "day":
            return observations.filter((o) => now - o.created_at_epoch < msPerDay);
          case "week":
            return observations.filter((o) => now - o.created_at_epoch < 7 * msPerDay);
          case "month":
            return observations.filter((o) => now - o.created_at_epoch < 30 * msPerDay);
          default:
            return observations;
        }
      }
      async applyCurrentFilter() {
        const query = this.searchInputEl?.value?.trim() || "";
        if (query) {
          await this.searchMemories(query);
        } else {
          await this.refreshMemories();
        }
      }
      renderObservation(obs) {
        const date = new Date(obs.created_at).toLocaleString();
        const narrative = obs.narrative || obs.title || "No description";
        return `
      <div class="memory-item has-delete" data-id="${obs.id}">
        <div class="memory-item-header">
          <span class="memory-type memory-type-${obs.type}">${obs.type}</span>
          <span class="memory-date">${date}</span>
        </div>
        <div class="memory-title">${this.escapeHtml(obs.title || "Untitled")}</div>
        <div class="memory-narrative">${this.escapeHtml(narrative.substring(0, 150))}${narrative.length > 150 ? "..." : ""}</div>
        ${obs.concepts && obs.concepts.length > 0 ? `
          <div class="memory-concepts">
            ${obs.concepts.slice(0, 3).map((c) => `<span class="concept-tag">${this.escapeHtml(c)}</span>`).join("")}
          </div>
        ` : ""}
        <div class="memory-actions">
          <button class="copy-btn" data-narrative="${this.escapeAttr(narrative)}">\u590D\u5236</button>
          <button class="delete-btn" data-id="${obs.id}">\u5220\u9664</button>
        </div>
      </div>
    `;
      }
      async loadSummaries() {
        if (!this.memoryListEl) return;
        const summaries = await this.store.getRecentSummaries("default", 20);
        if (summaries.length === 0) {
          this.memoryListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">\u{1F4DD}</div>
          <div class="empty-text">\u8FD8\u6CA1\u6709\u6458\u8981</div>
          <div class="empty-hint">\u4F1A\u8BDD\u6458\u8981\u5C06\u663E\u793A\u5728\u8FD9\u91CC</div>
        </div>
      `;
          return;
        }
        this.memoryListEl.innerHTML = summaries.map((summary) => `
      <div class="memory-item summary-item" data-id="${summary.id}">
        <div class="memory-item-header">
          <span class="memory-type memory-type-summary">session</span>
          <span class="memory-date">${new Date(summary.created_at).toLocaleDateString()}</span>
        </div>
        <div class="memory-title">Session ${summary.session_id.substring(0, 8)}</div>
        ${summary.learned ? `<div class="memory-narrative">${this.escapeHtml(summary.learned.substring(0, 150))}...</div>` : ""}
      </div>
    `).join("");
      }
      attachCopyHandlers() {
        this.memoryListEl?.querySelectorAll(".copy-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const target = e.currentTarget;
            const narrative = target.getAttribute("data-narrative") || "";
            try {
              await navigator.clipboard.writeText(narrative);
              target.textContent = "\u5DF2\u590D\u5236!";
              target.classList.add("copied");
              setTimeout(() => {
                target.textContent = "\u590D\u5236";
                target.classList.remove("copied");
              }, 1500);
            } catch (e2) {
              new import_obsidian2.Notice("\u590D\u5236\u5931\u8D25");
            }
          });
        });
        this.memoryListEl?.querySelectorAll(".delete-btn").forEach((btn) => {
          btn.addEventListener("click", async (e) => {
            const target = e.currentTarget;
            const id = target.getAttribute("data-id");
            if (id && confirm("\u786E\u5B9A\u8981\u5220\u9664\u8FD9\u6761\u8BB0\u5FC6\u5417\uFF1F")) {
              await this.deleteMemory(id);
            }
          });
        });
      }
      async deleteMemory(id) {
        await this.store.deleteObservation(id);
        new import_obsidian2.Notice("\u8BB0\u5FC6\u5DF2\u5220\u9664");
        await this.refreshMemories();
      }
      async exportMemories() {
        const observations = await this.store.getObservations("default", 1e3);
        const data = JSON.stringify(observations, null, 2);
        await navigator.clipboard.writeText(data);
        new import_obsidian2.Notice("\u8BB0\u5FC6\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F");
      }
      async searchMemories(query) {
        if (!this.memoryListEl || !query.trim()) {
          await this.refreshMemories();
          return;
        }
        const results = await this.searchManager.search(query, { limit: 50 });
        let observations = results.map((r) => r.observation).filter((o) => o !== void 0);
        observations = this.filterByTimePeriod(observations);
        if (observations.length === 0) {
          this.memoryListEl.innerHTML = `
        <div class="empty-state">
          <div class="empty-icon">\u{1F50D}</div>
          <div class="empty-text">\u6CA1\u6709\u627E\u5230\u7ED3\u679C</div>
          <div class="empty-hint">\u5C1D\u8BD5\u4E0D\u540C\u7684\u641C\u7D22\u8BCD</div>
        </div>
      `;
          return;
        }
        this.memoryListEl.innerHTML = observations.map((obs) => {
          const result = results.find((r) => r.observation?.id === obs.id);
          return `
        <div class="memory-item" data-id="${obs.id}">
          <div class="memory-item-header">
            <span class="memory-type memory-type-${obs.type}">${obs.type}</span>
            <span class="memory-score">\u76F8\u5173\u5EA6: ${result?.relevanceScore.toFixed(2) || 0}</span>
          </div>
          <div class="memory-title">${this.escapeHtml(obs.title || "Untitled")}</div>
          <div class="memory-narrative">${this.escapeHtml((obs.narrative || "").substring(0, 150))}...</div>
          <div class="memory-actions">
            <button class="copy-btn" data-narrative="${this.escapeAttr(obs.narrative || obs.title || "")}">\u590D\u5236</button>
          </div>
        </div>
      `;
        }).join("");
        this.attachCopyHandlers();
      }
      async injectContext() {
        try {
          const context = await this.searchManager.getContextForInjection({ limit: 10 });
          await navigator.clipboard.writeText(context);
          new import_obsidian2.Notice("\u8BB0\u5FC6\u4E0A\u4E0B\u6587\u5DF2\u590D\u5236\u5230\u526A\u8D34\u677F\uFF01");
        } catch (e) {
          new import_obsidian2.Notice("\u6CE8\u5165\u4E0A\u4E0B\u6587\u5931\u8D25");
        }
      }
      showAddMemoryModal() {
        const modalHtml = `
      <div class="memory-modal-overlay">
        <div class="memory-modal">
          <div class="memory-modal-header">
            <h4>\u6DFB\u52A0\u8BB0\u5FC6</h4>
            <button class="modal-close">\xD7</button>
          </div>
          <div class="memory-modal-body">
            <div class="form-group">
              <label>\u6807\u9898</label>
              <input type="text" class="memory-title-input" placeholder="\u8BB0\u5FC6\u6807\u9898..." />
            </div>
            <div class="form-group">
              <label>\u7C7B\u578B</label>
              <select class="memory-type-select">
                <option value="observation">\u89C2\u5BDF</option>
                <option value="idea">\u60F3\u6CD5</option>
                <option value="todo">\u5F85\u529E</option>
                <option value="note">\u7B14\u8BB0</option>
              </select>
            </div>
            <div class="form-group">
              <label>\u5185\u5BB9</label>
              <textarea class="memory-content-input" placeholder="\u8BE6\u7EC6\u63CF\u8FF0..." rows="4"></textarea>
            </div>
            <div class="form-group">
              <label>\u6982\u5FF5\uFF08\u9017\u53F7\u5206\u9694\uFF09</label>
              <input type="text" class="memory-concepts-input" placeholder="\u6982\u5FF51, \u6982\u5FF52..." />
            </div>
          </div>
          <div class="memory-modal-footer">
            <button class="modal-cancel">\u53D6\u6D88</button>
            <button class="modal-save">\u4FDD\u5B58</button>
          </div>
        </div>
      </div>
    `;
        const overlay = document.createElement("div");
        overlay.innerHTML = modalHtml;
        document.body.appendChild(overlay);
        const closeModal = () => {
          document.body.removeChild(overlay);
        };
        overlay.querySelector(".modal-close")?.addEventListener("click", closeModal);
        overlay.querySelector(".modal-cancel")?.addEventListener("click", closeModal);
        overlay.querySelector(".modal-save")?.addEventListener("click", async () => {
          const titleInput = overlay.querySelector(".memory-title-input");
          const typeSelect = overlay.querySelector(".memory-type-select");
          const contentInput = overlay.querySelector(".memory-content-input");
          const conceptsInput = overlay.querySelector(".memory-concepts-input");
          const title = titleInput.value.trim();
          const content = contentInput.value.trim();
          if (!title && !content) {
            new import_obsidian2.Notice("\u8BF7\u8F93\u5165\u6807\u9898\u6216\u5185\u5BB9");
            return;
          }
          const concepts = conceptsInput.value.split(",").map((c) => c.trim()).filter((c) => c);
          await this.addMemory({
            type: typeSelect.value,
            title: title || "\u65E0\u6807\u9898",
            narrative: content,
            concepts
          });
          closeModal();
          new import_obsidian2.Notice("\u8BB0\u5FC6\u5DF2\u6DFB\u52A0");
        });
        overlay.addEventListener("click", (e) => {
          if (e.target === overlay) closeModal();
        });
      }
      async addMemory(data) {
        const observation = {
          id: `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
          session_id: "manual",
          project: "default",
          type: data.type,
          title: data.title,
          narrative: data.narrative,
          facts: [],
          concepts: data.concepts,
          files_read: [],
          files_modified: [],
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          created_at_epoch: Date.now()
        };
        await this.store.createObservation(observation);
        await this.refreshMemories();
      }
      escapeHtml(text) {
        const div = document.createElement("div");
        div.textContent = text;
        return div.innerHTML;
      }
      escapeAttr(text) {
        return text.replace(/"/g, "&quot;").replace(/'/g, "&#39;");
      }
    };
  }
});

// src/storage/SqliteStore.ts
var SqliteStore_exports = {};
__export(SqliteStore_exports, {
  SqliteStore: () => SqliteStore
});
var SqliteStore;
var init_SqliteStore = __esm({
  "src/storage/SqliteStore.ts"() {
    "use strict";
    SqliteStore = class {
      constructor(app) {
        this.store = { sessions: [], observations: [], summaries: [] };
        this.memoryDir = "";
        this.dataFile = null;
        this.saveInProgress = false;
        this.pendingSave = false;
        this.lifecycleManager = null;
        this.app = app;
        console.log("[SqliteStore] Constructor called");
      }
      setLifecycleManager(lm) {
        this.lifecycleManager = lm;
      }
      async initialize(memoryDir) {
        console.log("[SqliteStore] initialize start:", memoryDir);
        this.memoryDir = memoryDir;
        try {
          const vault = this.app.vault;
          const dbPath = `${memoryDir}/memories.json`;
          const existingFile = vault.getAbstractFileByPath(dbPath);
          if (existingFile) {
            this.dataFile = existingFile;
            console.log("[SqliteStore] reading existing file");
            try {
              const content = await vault.read(existingFile);
              this.store = JSON.parse(content);
              console.log("[SqliteStore] loaded store with", this.store.observations.length, "observations");
            } catch (e) {
              console.error("[SqliteStore] parse error:", e);
              this.store = { sessions: [], observations: [], summaries: [] };
            }
          } else {
            console.log("[SqliteStore] no existing file - will create on first save");
            this.store = { sessions: [], observations: [], summaries: [] };
          }
          console.log("[SqliteStore] initialize complete");
        } catch (error) {
          console.error("[SqliteStore] initialize error:", error);
          this.store = { sessions: [], observations: [], summaries: [] };
        }
      }
      isTFile(file) {
        return file && typeof file === "object" && "path" in file && "stat" in file;
      }
      async saveDatabase() {
        if (this.saveInProgress) {
          this.pendingSave = true;
          return;
        }
        this.saveInProgress = true;
        if (this.lifecycleManager) {
          this.lifecycleManager.setSaving(true);
        }
        try {
          const dbPath = `${this.memoryDir}/memories.json`;
          const content = JSON.stringify(this.store, null, 2);
          const vault = this.app.vault;
          if (this.dataFile) {
            await vault.modify(this.dataFile, content);
            return;
          }
          const existingFile = vault.getAbstractFileByPath(dbPath);
          if (existingFile) {
            this.dataFile = existingFile;
            await vault.modify(this.dataFile, content);
            return;
          }
          this.dataFile = await vault.create(dbPath, content);
        } catch (error) {
        } finally {
          this.saveInProgress = false;
          if (this.lifecycleManager) {
            this.lifecycleManager.setSaving(false);
          }
          if (this.pendingSave) {
            this.pendingSave = false;
            await this.saveDatabase();
          }
        }
      }
      async createSession(session) {
        this.store.sessions.push(session);
        await this.saveDatabase();
      }
      async getActiveSession(project) {
        const active = this.store.sessions.filter((s) => s.project === project && s.status === "active").sort((a, b) => b.started_at_epoch - a.started_at_epoch);
        return active[0] || null;
      }
      async updateSession(id, updates) {
        const session = this.store.sessions.find((s) => s.id === id);
        if (session) {
          Object.assign(session, updates);
          await this.saveDatabase();
        }
      }
      async createObservation(obs) {
        this.store.observations.push(obs);
        await this.saveDatabase();
      }
      async getObservations(project, limit = 50) {
        return this.store.observations.filter((o) => o.project === project).sort((a, b) => b.created_at_epoch - a.created_at_epoch).slice(0, limit);
      }
      async deleteObservation(id) {
        this.store.observations = this.store.observations.filter((o) => o.id !== id);
        await this.saveDatabase();
      }
      async createSummary(summary) {
        this.store.summaries.push(summary);
        await this.saveDatabase();
      }
      async getRecentSummaries(project, limit = 10) {
        return this.store.summaries.filter((s) => s.project === project).sort((a, b) => b.created_at_epoch - a.created_at_epoch).slice(0, limit);
      }
      async searchObservations(query, project, limit = 20) {
        const q = query.toLowerCase();
        return this.store.observations.filter((o) => {
          if (o.project !== project) return false;
          const searchable = [
            o.title,
            o.narrative,
            o.type,
            ...Array.isArray(o.facts) ? o.facts : [],
            ...Array.isArray(o.concepts) ? o.concepts : []
          ].join(" ").toLowerCase();
          return searchable.includes(q);
        }).sort((a, b) => b.created_at_epoch - a.created_at_epoch).slice(0, limit);
      }
      async close() {
        await this.saveDatabase();
      }
    };
  }
});

// src/utils/tag-stripping.ts
function stripPrivateTags(text) {
  return text.replace(/<private>[\s\S]*?<\/private>/gi, "");
}
var init_tag_stripping = __esm({
  "src/utils/tag-stripping.ts"() {
    "use strict";
  }
});

// src/lifecycle/LifecycleManager.ts
var LifecycleManager_exports = {};
__export(LifecycleManager_exports, {
  LifecycleManager: () => LifecycleManager
});
var LifecycleManager;
var init_LifecycleManager = __esm({
  "src/lifecycle/LifecycleManager.ts"() {
    "use strict";
    init_tag_stripping();
    LifecycleManager = class {
      constructor(app, store, searchManager, observationGenerator, pollInterval = 3e4, autoCapture = true) {
        this.activeSession = null;
        this.eventQueue = [];
        this.isProcessing = false;
        this.recentEvents = /* @__PURE__ */ new Map();
        this.DEBOUNCE_MS = 2e3;
        this.isSaving = false;
        this.lastScanTime = 0;
        this.autoCapture = true;
        this.pollInterval = 3e4;
        this.pollTimer = null;
        this.app = app;
        this.store = store;
        this.searchManager = searchManager;
        this.observationGenerator = observationGenerator;
        this.pollInterval = pollInterval * 1e3;
        this.autoCapture = autoCapture;
        this.startPolling();
      }
      startPolling() {
        if (!this.autoCapture) {
          console.log("[LifecycleManager] Auto capture disabled");
          return;
        }
        this.pollTimer = window.setInterval(async () => {
          await this.scanVaultChanges();
        }, this.pollInterval);
        console.log(`[LifecycleManager] Polling started (${this.pollInterval / 1e3}s interval)`);
      }
      updateSettings(pollInterval, autoCapture) {
        this.pollInterval = pollInterval * 1e3;
        this.autoCapture = autoCapture;
        if (this.pollTimer) {
          clearInterval(this.pollTimer);
          this.pollTimer = null;
        }
        if (this.autoCapture) {
          this.pollTimer = window.setInterval(async () => {
            await this.scanVaultChanges();
          }, this.pollInterval);
        }
      }
      async scanVaultChanges() {
        if (!this.activeSession) return;
        try {
          const vault = this.app.vault;
          const now = Date.now();
          const files = vault.getFiles().filter(
            (f) => this.isMarkdownFile(f.path)
          );
          for (const file of files) {
            if (file.stat.mtime > this.lastScanTime) {
              await this.captureFileEvent(file.path, "modify");
            }
          }
          this.lastScanTime = now;
        } catch (e) {
          console.error("[LifecycleManager] scanVaultChanges error:", e);
        }
      }
      isMarkdownFile(path) {
        if (!path.endsWith(".md")) return false;
        if (path.startsWith(".obsidian-memory/")) return false;
        if (path.includes("/.obsidian-memory/")) return false;
        if (path.endsWith("memories.json")) return false;
        return true;
      }
      async captureFileEvent(filePath, eventType) {
        if (!this.activeSession) return;
        if (this.isSaving) return;
        const cleanPath = stripPrivateTags(filePath);
        if (cleanPath !== filePath) return;
        const lastProcessed = this.recentEvents.get(filePath);
        const now = Date.now();
        if (lastProcessed && now - lastProcessed < this.DEBOUNCE_MS) {
          return;
        }
        this.recentEvents.set(filePath, now);
        const cutoff = now - 3e5;
        for (const [key, ts] of this.recentEvents.entries()) {
          if (ts < cutoff) this.recentEvents.delete(key);
        }
        const event = {
          type: eventType,
          file: filePath,
          timestamp: now,
          sessionId: this.activeSession.id
        };
        this.eventQueue.push(event);
        await this.processEventQueue();
      }
      async processEventQueue() {
        if (this.isProcessing || this.eventQueue.length === 0) return;
        this.isProcessing = true;
        const events = [...this.eventQueue];
        this.eventQueue = [];
        for (const event of events) {
          try {
            await this.observationGenerator.processEvent(event);
          } catch (e) {
            console.error("[LifecycleManager] processEvent error:", e);
          }
        }
        this.isProcessing = false;
      }
      // Called by SqliteStore before saving
      setSaving(saving) {
        this.isSaving = saving;
      }
      async sessionStart() {
        try {
          const project = this.getProjectName();
          let session = await this.store.getActiveSession(project);
          if (!session) {
            session = {
              id: this.generateId(),
              content_session_id: this.generateId(),
              project,
              started_at: (/* @__PURE__ */ new Date()).toISOString(),
              started_at_epoch: Date.now(),
              status: "active"
            };
            await this.store.createSession(session);
          }
          this.activeSession = session;
          this.lastScanTime = Date.now();
          console.log(`[LifecycleManager] Session started: ${session.id}`);
        } catch (e) {
          console.error("[LifecycleManager] sessionStart error:", e);
        }
      }
      async sessionStop() {
        if (!this.activeSession) return;
        try {
          await this.processEventQueue();
          await this.observationGenerator.generateSessionSummary(this.activeSession);
          await this.store.updateSession(this.activeSession.id, {
            completed_at: (/* @__PURE__ */ new Date()).toISOString(),
            completed_at_epoch: Date.now(),
            status: "completed"
          });
        } catch (e) {
          console.error("[LifecycleManager] sessionStop error:", e);
        }
        this.activeSession = null;
      }
      getProjectName() {
        try {
          return this.app.vault.getName();
        } catch (e) {
          console.error("[LifecycleManager] getProjectName error:", e);
          return "default";
        }
      }
      generateId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
      }
    };
  }
});

// src/search/SearchManager.ts
var SearchManager_exports = {};
__export(SearchManager_exports, {
  SearchManager: () => SearchManager
});
var SearchManager;
var init_SearchManager = __esm({
  "src/search/SearchManager.ts"() {
    "use strict";
    SearchManager = class {
      constructor(store) {
        this.chromaAvailable = false;
        this.store = store;
      }
      async search(query, options = {}) {
        const project = options.project || "default";
        const limit = options.limit || 20;
        const observations = await this.store.searchObservations(query, project, limit);
        return observations.map((obs) => ({
          observation: obs,
          relevanceScore: this.calculateRelevance(obs, query)
        })).sort((a, b) => b.relevanceScore - a.relevanceScore);
      }
      async getContextForInjection(options = {}) {
        const project = options.project || "default";
        const limit = options.limit || 10;
        const observations = await this.store.getObservations(project, limit);
        const summaries = await this.store.getRecentSummaries(project, limit);
        const lines = ["# \u8BB0\u5FC6\u4E0A\u4E0B\u6587\n"];
        if (summaries.length > 0) {
          lines.push("## \u6700\u8FD1\u4F1A\u8BDD\u6458\u8981\n");
          for (const summary of summaries.slice(0, 3)) {
            lines.push(`### \u4F1A\u8BDD ${summary.session_id.substring(0, 8)}`);
            if (summary.learned) {
              lines.push(summary.learned);
            }
            if (summary.next_steps) {
              lines.push(`**\u4E0B\u4E00\u6B65**: ${summary.next_steps}`);
            }
            lines.push("");
          }
        }
        if (observations.length > 0) {
          lines.push("## \u5173\u952E\u89C2\u5BDF\n");
          for (const obs of observations.slice(0, 10)) {
            const title = obs.title || obs.type;
            const date = new Date(obs.created_at).toLocaleDateString();
            lines.push(`### ${title}`);
            lines.push(`*${date}*`);
            if (obs.narrative) {
              lines.push(obs.narrative);
            }
            if (obs.concepts && obs.concepts.length > 0) {
              lines.push(`**\u6982\u5FF5**: ${obs.concepts.join(", ")}`);
            }
            if (obs.files_modified && obs.files_modified.length > 0) {
              lines.push(`**\u4FEE\u6539\u6587\u4EF6**: ${obs.files_modified.join(", ")}`);
            }
            lines.push("");
          }
        }
        lines.push("\n---\n*\u6765\u81EA Obsidian Memory \u63D2\u4EF6*");
        return lines.join("\n");
      }
      calculateRelevance(item, query) {
        const queryLower = query.toLowerCase();
        const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 0);
        let score = 0;
        for (const term of queryTerms) {
          if ("narrative" in item && item.narrative) {
            const narrativeLower = item.narrative.toLowerCase();
            if (narrativeLower.includes(term)) {
              score += 0.4;
              if (narrativeLower.includes(" " + term + " ")) score += 0.1;
            }
          }
          if ("title" in item && item.title) {
            if (item.title.toLowerCase().includes(term)) score += 0.3;
          }
          if ("learned" in item && item.learned) {
            if (item.learned.toLowerCase().includes(term)) score += 0.25;
          }
          if ("concepts" in item && item.concepts) {
            const concepts = Array.isArray(item.concepts) ? item.concepts : [];
            for (const concept of concepts) {
              if (concept.toLowerCase().includes(term)) score += 0.2;
            }
          }
        }
        const age = Date.now() - (item.created_at_epoch || 0);
        const hoursOld = age / (1e3 * 60 * 60);
        if (hoursOld < 1) score += 0.3;
        else if (hoursOld < 24) score += 0.2;
        else if (hoursOld < 168) score += 0.1;
        else if (hoursOld < 720) score += 0.05;
        return Math.min(score, 1);
      }
      async close() {
      }
    };
  }
});

// src/observation/ObservationGenerator.ts
var ObservationGenerator_exports = {};
__export(ObservationGenerator_exports, {
  ObservationGenerator: () => ObservationGenerator
});
var MINIMAX_API_URL, ObservationGenerator;
var init_ObservationGenerator = __esm({
  "src/observation/ObservationGenerator.ts"() {
    "use strict";
    MINIMAX_API_URL = "https://api.minimax.chat/v1/text/chatcompletion_v2";
    ObservationGenerator = class {
      constructor(store, searchManager, apiKey) {
        this.store = store;
        this.searchManager = searchManager;
        this.apiKey = apiKey;
      }
      async processEvent(event) {
        let narrative = this.generateFallbackNarrative(event);
        try {
          narrative = await this.generateNarrative(event);
        } catch (e) {
          console.error("[ObsidianMemory] Failed to generate AI narrative:", e);
        }
        const observation = {
          id: this.generateId(),
          session_id: event.sessionId,
          project: "default",
          type: this.inferType(event),
          title: this.extractTitle(event),
          narrative,
          facts: this.extractFacts(event),
          concepts: this.extractConcepts(event),
          files_read: event.type === "create" || event.type === "modify" ? [event.file] : [],
          files_modified: event.type === "modify" ? [event.file] : [],
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          created_at_epoch: Date.now()
        };
        await this.store.createObservation(observation);
        console.log(`[ObsidianMemory] Created observation: ${observation.id}`);
      }
      generateId() {
        return `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      }
      inferType(event) {
        const path = event.file.toLowerCase();
        if (path.includes("bug") || path.includes("fix")) return "bugfix";
        if (path.includes("feature")) return "feature";
        if (path.includes("decision") || path.includes("architecture")) return "decision";
        return "change";
      }
      extractTitle(event) {
        const parts = event.file.split("/");
        const filename = parts[parts.length - 1] || "Untitled";
        return filename.replace(".md", "").replace(/[-_]/g, " ");
      }
      async generateNarrative(event) {
        const prompt = this.buildNarrativePrompt(event);
        try {
          const response = await this.callMiniMaxAPI(prompt);
          return response;
        } catch (error) {
          console.error("[ObsidianMemory] MiniMax API error:", error);
          return this.generateFallbackNarrative(event);
        }
      }
      buildNarrativePrompt(event) {
        const filename = event.file.split("/").pop() || "unknown";
        const operation = event.type;
        const type = this.inferType(event);
        return `You are an intelligent note-taking assistant. Generate a concise, informative narrative (2-3 sentences) describing what happened in this Obsidian vault operation.

Operation: ${operation}
File: ${filename}
Type: ${type}

Focus on:
- What was the purpose/action
- Key details about the content or context
- Why it might be important

Format: Just the narrative text, no labels or prefixes.`;
      }
      async callMiniMaxAPI(prompt, retries = 3) {
        const messages = [
          { role: "user", content: prompt }
        ];
        for (let attempt = 0; attempt <= retries; attempt++) {
          try {
            const response = await fetch(MINIMAX_API_URL, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiKey}`
              },
              body: JSON.stringify({
                model: "MiniMax-Text-01",
                messages,
                max_tokens: 256,
                temperature: 0.7
              })
            });
            if (response.ok) {
              const data = await response.json();
              const content = data.choices?.[0]?.message?.content;
              if (content) return content.trim();
            }
            if (attempt < retries) {
              const delay = Math.min(1e3 * Math.pow(2, attempt), 1e4);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw new Error(`API error: ${response.status}`);
          } catch (e) {
            if (attempt < retries) {
              const delay = Math.min(1e3 * Math.pow(2, attempt), 1e4);
              await new Promise((resolve) => setTimeout(resolve, delay));
              continue;
            }
            throw e;
          }
        }
        throw new Error("MiniMax API failed after retries");
      }
      generateFallbackNarrative(event) {
        const typeLabels = {
          "bugfix": "Fixed a bug",
          "feature": "Implemented a feature",
          "decision": "Made an architectural decision",
          "change": "Made changes to"
        };
        const action = typeLabels[event.type] || "Modified";
        const filename = event.file.split("/").pop() || "file";
        return `${action} ${filename}. This ${event.type} operation was recorded by Obsidian Memory plugin.`;
      }
      extractFacts(event) {
        const facts = [];
        const filename = event.file.split("/").pop() || "";
        if (filename) {
          facts.push(`File: ${filename}`);
        }
        facts.push(`Operation: ${event.type}`);
        facts.push(`Timestamp: ${new Date(event.timestamp).toISOString()}`);
        return facts;
      }
      extractConcepts(event) {
        const concepts = [];
        const parts = event.file.split("/");
        for (const part of parts) {
          if (part.length > 3 && part !== "md" && !part.match(/^\d+$/)) {
            concepts.push(part.replace(/[-_]/g, " "));
          }
        }
        return concepts.slice(0, 5);
      }
      async generateSessionSummary(session) {
        try {
          const observations = await this.store.getObservations(session.project, 20);
          let learned = "";
          try {
            learned = await this.generateSessionSummaryWithAI(observations);
          } catch (error) {
            console.error("[ObsidianMemory] Failed to generate AI summary:", error);
            learned = observations.length > 0 ? `Captured ${observations.length} observations during this session` : "No observations captured";
          }
          const summary = {
            id: `summary_${Date.now()}`,
            session_id: session.id,
            project: session.project,
            request: `Session ${session.id.substring(0, 8)} in ${session.project}`,
            investigated: observations.map((o) => o.narrative).join("\n"),
            learned,
            completed: "Session completed normally",
            next_steps: "",
            created_at: (/* @__PURE__ */ new Date()).toISOString(),
            created_at_epoch: Date.now()
          };
          await this.store.createSummary(summary);
          console.log(`[ObsidianMemory] Created session summary: ${summary.id}`);
        } catch (error) {
          console.error("[ObsidianMemory] Failed to generate session summary:", error);
        }
      }
      async generateSessionSummaryWithAI(observations) {
        if (observations.length === 0) {
          return "No observations captured during this session.";
        }
        const obsList = observations.slice(0, 10).map((o, i) => `${i + 1}. ${o.narrative}`).join("\n");
        const prompt = `You are an intelligent assistant summarizing user activity in an Obsidian vault. Based on the following observations, generate a concise summary (1-2 sentences) of what the user accomplished:

Observations:
${obsList}

Format: Just the summary text, no labels or prefixes.`;
        try {
          return await this.callMiniMaxAPI(prompt);
        } catch {
          return `Captured ${observations.length} observations during this session.`;
        }
      }
    };
  }
});

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ObsidianMemoryPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/settings/SettingsManager.ts
var DEFAULT_SETTINGS = {
  miniMaxApiKey: "",
  pollIntervalSeconds: 30,
  autoCapture: true,
  defaultTimeFilter: "all"
};
var SettingsManager = class {
  constructor(plugin) {
    this.plugin = plugin;
    this.settings = { ...DEFAULT_SETTINGS };
  }
  async load() {
    const loaded = await this.plugin.loadData();
    if (loaded) {
      this.settings = { ...DEFAULT_SETTINGS, ...loaded };
    }
  }
  async save() {
    await this.plugin.saveData(this.settings);
  }
  get(key) {
    return this.settings[key];
  }
  async set(key, value) {
    this.settings[key] = value;
    await this.save();
  }
};

// src/settings/SettingsTab.ts
var import_obsidian = require("obsidian");
var MemorySettingsTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, manager) {
    super(app, manager.plugin);
    this.manager = manager;
    this.plugin = manager.plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "\u8BB0\u5FC6\u63D2\u4EF6\u8BBE\u7F6E" });
    new import_obsidian.Setting(containerEl).setName("MiniMax API Key").setDesc("\u7528\u4E8E AI \u751F\u6210\u8BB0\u5FC6\u63CF\u8FF0\u7684 API Key").addText((text) => text.setPlaceholder("sk-...").setValue(this.manager.settings.miniMaxApiKey).onChange(async (value) => {
      await this.manager.set("miniMaxApiKey", value);
    }));
    new import_obsidian.Setting(containerEl).setName("\u81EA\u52A8\u5237\u65B0\u95F4\u9694").setDesc("\u8BBE\u7F6E\u8BB0\u5FC6\u81EA\u52A8\u626B\u63CF\u7684\u65F6\u95F4\u95F4\u9694\uFF08\u79D2\uFF09").addText((text) => text.setPlaceholder("30").setValue(String(this.manager.settings.pollIntervalSeconds)).onChange(async (value) => {
      const num = parseInt(value, 10);
      if (num > 0) {
        await this.manager.set("pollIntervalSeconds", num);
        this.applyRuntimeSettings();
      }
    }));
    new import_obsidian.Setting(containerEl).setName("\u81EA\u52A8\u6355\u83B7").setDesc("\u662F\u5426\u81EA\u52A8\u6355\u83B7 vault \u4E2D\u7684\u6587\u4EF6\u53D8\u5316").addToggle((toggle) => toggle.setValue(this.manager.settings.autoCapture).onChange(async (value) => {
      await this.manager.set("autoCapture", value);
      this.applyRuntimeSettings();
    }));
    new import_obsidian.Setting(containerEl).setName("\u9ED8\u8BA4\u65F6\u95F4\u8FC7\u6EE4").setDesc("\u8BB0\u5FC6\u5217\u8868\u7684\u9ED8\u8BA4\u65F6\u95F4\u8FC7\u6EE4").addDropdown((dropdown) => dropdown.addOption("all", "\u5168\u90E8").addOption("day", "\u4ECA\u5929").addOption("week", "\u672C\u5468").addOption("month", "\u672C\u6708").setValue(this.manager.settings.defaultTimeFilter).onChange(async (value) => {
      await this.manager.set("defaultTimeFilter", value);
    }));
  }
  applyRuntimeSettings() {
    if (this.plugin.lifecycleManager) {
      const pollInterval = this.manager.get("pollIntervalSeconds");
      const autoCapture = this.manager.get("autoCapture");
      this.plugin.lifecycleManager.updateSettings(pollInterval, autoCapture);
    }
  }
};

// src/main.ts
var ObsidianMemoryPlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.memoryPanel = null;
    this.memoryPanelClass = null;
    this.lifecycleManager = null;
  }
  async onload() {
    console.log("[ObsidianMemory] onload start");
    try {
      this.settingsManager = new SettingsManager(this);
      await this.settingsManager.load();
      this.addSettingTab(new MemorySettingsTab(this.app, this.settingsManager));
      console.log("[ObsidianMemory] Loading modules...");
      const [MemoryPanelModule, SqliteStoreModule, LifecycleManagerModule, SearchManagerModule, ObservationGeneratorModule] = await Promise.all([
        Promise.resolve().then(() => (init_MemoryPanel(), MemoryPanel_exports)),
        Promise.resolve().then(() => (init_SqliteStore(), SqliteStore_exports)),
        Promise.resolve().then(() => (init_LifecycleManager(), LifecycleManager_exports)),
        Promise.resolve().then(() => (init_SearchManager(), SearchManager_exports)),
        Promise.resolve().then(() => (init_ObservationGenerator(), ObservationGenerator_exports))
      ]);
      console.log("[ObsidianMemory] Modules loaded");
      this.memoryPanelClass = MemoryPanelModule.MemoryPanel;
      const SqliteStore2 = SqliteStoreModule.SqliteStore;
      const SearchManager2 = SearchManagerModule.SearchManager;
      const ObservationGenerator2 = ObservationGeneratorModule.ObservationGenerator;
      const LifecycleManager2 = LifecycleManagerModule.LifecycleManager;
      const sqliteStore = new SqliteStore2(this.app);
      await sqliteStore.initialize(".obsidian-memory");
      const searchManager = new SearchManager2(sqliteStore);
      const apiKey = this.settingsManager.get("miniMaxApiKey");
      if (!apiKey) {
        console.log("[ObsidianMemory] Warning: No API Key configured. AI generation will use fallback narratives.");
      }
      const observationGenerator = new ObservationGenerator2(sqliteStore, searchManager, apiKey || "");
      const pollInterval = this.settingsManager.get("pollIntervalSeconds");
      const autoCapture = this.settingsManager.get("autoCapture");
      const lifecycleManager = new LifecycleManager2(
        this.app,
        sqliteStore,
        searchManager,
        observationGenerator,
        pollInterval,
        autoCapture
      );
      sqliteStore.setLifecycleManager(lifecycleManager);
      this.lifecycleManager = lifecycleManager;
      console.log("[ObsidianMemory] Services initialized");
      this.addRibbonIcon("lightbulb", "Memory", async () => {
        try {
          await this.toggleMemoryPanel();
        } catch (e) {
          console.error("[ObsidianMemory] togglePanel error:", e);
        }
      });
      this.registerView("memory-panel", (leaf) => {
        try {
          this.memoryPanel = new this.memoryPanelClass(leaf, sqliteStore, searchManager);
          return this.memoryPanel;
        } catch (e) {
          console.error("[ObsidianMemory] registerView error:", e);
          return null;
        }
      });
      this.addCommand({
        id: "search-memory",
        name: "\u641C\u7D22\u8BB0\u5FC6",
        callback: async () => {
          this.toggleMemoryPanel();
        }
      });
      this.addCommand({
        id: "inject-memory-context",
        name: "\u6CE8\u5165\u8BB0\u5FC6\u4E0A\u4E0B\u6587",
        callback: async () => {
          try {
            if (searchManager) {
              const context = await searchManager.getContextForInjection();
              await navigator.clipboard.writeText(context);
              new import_obsidian3.Notice("\u8BB0\u5FC6\u4E0A\u4E0B\u6587\u5DF2\u590D\u5236\uFF01");
            }
          } catch (e) {
            console.error("[ObsidianMemory] inject command error:", e);
          }
        }
      });
      await lifecycleManager.sessionStart();
      console.log("[ObsidianMemory] Session started");
      console.log("[ObsidianMemory] onload complete");
    } catch (error) {
      console.error("[ObsidianMemory] Load error:", error);
    }
  }
  async onunload() {
    console.log("[ObsidianMemory] onunload");
  }
  async toggleMemoryPanel() {
    try {
      const workspace = this.app.workspace;
      const existing = workspace.getLeavesOfType("memory-panel");
      if (existing.length > 0) {
        workspace.revealLeaf(existing[0]);
        return;
      }
      const leaf = workspace.getLeftLeaf(false);
      if (leaf) {
        await leaf.setViewState({ type: "memory-panel" });
        workspace.revealLeaf(leaf);
      }
    } catch (e) {
      console.error("[ObsidianMemory] toggleMemoryPanel error:", e);
    }
  }
};
//# sourceMappingURL=bundle.js.map
