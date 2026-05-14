"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const obsidian_1 = require("obsidian");
class ObsidianMemoryPlugin extends obsidian_1.Plugin {
    constructor() {
        super(...arguments);
        this.memoryPanel = null;
        this.memoryPanelClass = null;
    }
    async onload() {
        console.log('[ObsidianMemory] onload start');
        try {
            // Dynamically load modules
            console.log('[ObsidianMemory] Loading modules...');
            const [MemoryPanelModule, SqliteStoreModule, LifecycleManagerModule, SearchManagerModule, ObservationGeneratorModule] = await Promise.all([
                Promise.resolve().then(() => __importStar(require('./ui/MemoryPanel'))),
                Promise.resolve().then(() => __importStar(require('./storage/SqliteStore'))),
                Promise.resolve().then(() => __importStar(require('./lifecycle/LifecycleManager'))),
                Promise.resolve().then(() => __importStar(require('./search/SearchManager'))),
                Promise.resolve().then(() => __importStar(require('./observation/ObservationGenerator')))
            ]);
            console.log('[ObsidianMemory] Modules loaded');
            this.memoryPanelClass = MemoryPanelModule.MemoryPanel;
            const SqliteStore = SqliteStoreModule.SqliteStore;
            const SearchManager = SearchManagerModule.SearchManager;
            const ObservationGenerator = ObservationGeneratorModule.ObservationGenerator;
            const LifecycleManager = LifecycleManagerModule.LifecycleManager;
            // Initialize services
            const sqliteStore = new SqliteStore(this.app);
            await sqliteStore.initialize('.obsidian-memory');
            const searchManager = new SearchManager(sqliteStore);
            const observationGenerator = new ObservationGenerator(sqliteStore, searchManager);
            const lifecycleManager = new LifecycleManager(this.app, sqliteStore, searchManager, observationGenerator);
            console.log('[ObsidianMemory] Services initialized');
            // Register UI
            this.addRibbonIcon('brain', 'Memory', async () => {
                try {
                    await this.toggleMemoryPanel();
                }
                catch (e) {
                    console.error('[ObsidianMemory] togglePanel error:', e);
                }
            });
            this.registerView('memory-panel', (leaf) => {
                try {
                    this.memoryPanel = new this.memoryPanelClass(leaf, sqliteStore, searchManager);
                    return this.memoryPanel;
                }
                catch (e) {
                    console.error('[ObsidianMemory] registerView error:', e);
                    return null;
                }
            });
            // Register commands
            this.addCommand({
                id: 'search-memory',
                name: 'Search Memory',
                callback: async () => {
                    try {
                        const query = (prompt('Search memory:') || '');
                        if (query && searchManager) {
                            const results = await searchManager.search(query, { limit: 20 });
                            console.log('[ObsidianMemory] Search results:', results);
                        }
                    }
                    catch (e) {
                        console.error('[ObsidianMemory] search command error:', e);
                    }
                }
            });
            this.addCommand({
                id: 'inject-memory-context',
                name: 'Inject Memory Context',
                callback: async () => {
                    try {
                        if (searchManager) {
                            const context = await searchManager.getContextForInjection();
                            await navigator.clipboard.writeText(context);
                            new obsidian_1.Notice('Memory context copied!');
                        }
                    }
                    catch (e) {
                        console.error('[ObsidianMemory] inject command error:', e);
                    }
                }
            });
            // Start session
            await lifecycleManager.sessionStart();
            console.log('[ObsidianMemory] Session started');
            console.log('[ObsidianMemory] onload complete');
        }
        catch (error) {
            console.error('[ObsidianMemory] Load error:', error);
        }
    }
    async onunload() {
        console.log('[ObsidianMemory] onunload');
    }
    async toggleMemoryPanel() {
        try {
            const workspace = this.app.workspace;
            const existing = workspace.getLeavesOfType('memory-panel');
            if (existing.length > 0) {
                workspace.revealLeaf(existing[0]);
                return;
            }
            const leaf = workspace.getLeftLeaf(false);
            if (leaf) {
                await leaf.setViewState({ type: 'memory-panel' });
                workspace.revealLeaf(leaf);
            }
        }
        catch (e) {
            console.error('[ObsidianMemory] toggleMemoryPanel error:', e);
        }
    }
}
exports.default = ObsidianMemoryPlugin;
//# sourceMappingURL=main.js.map