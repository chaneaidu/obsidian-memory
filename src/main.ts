import { Notice, Plugin } from 'obsidian';
import { SettingsManager } from './settings/SettingsManager';
import { MemorySettingsTab } from './settings/SettingsTab';

export default class ObsidianMemoryPlugin extends Plugin {
  private memoryPanel: any = null;
  private memoryPanelClass: any = null;
  private settingsManager!: SettingsManager;
  public lifecycleManager: any = null;

  async onload() {
    console.log('[ObsidianMemory] onload start');

    try {
      // Initialize settings
      this.settingsManager = new SettingsManager(this);
      await this.settingsManager.load();
      this.addSettingTab(new MemorySettingsTab(this.app, this.settingsManager));

      // Dynamically load modules
      console.log('[ObsidianMemory] Loading modules...');

      const [MemoryPanelModule, SqliteStoreModule, LifecycleManagerModule, SearchManagerModule, ObservationGeneratorModule] = await Promise.all([
        import('./ui/MemoryPanel'),
        import('./storage/SqliteStore'),
        import('./lifecycle/LifecycleManager'),
        import('./search/SearchManager'),
        import('./observation/ObservationGenerator')
      ]);

      console.log('[ObsidianMemory] Modules loaded');

      this.memoryPanelClass = MemoryPanelModule.MemoryPanel;
      const SqliteStore = SqliteStoreModule.SqliteStore;
      const SearchManager = SearchManagerModule.SearchManager;
      const ObservationGenerator = ObservationGeneratorModule.ObservationGenerator;
      const LifecycleManager = LifecycleManagerModule.LifecycleManager;

      // Initialize services
      const sqliteStore = new SqliteStore((this as any).app);
      await sqliteStore.initialize('.obsidian-memory');
      const searchManager = new SearchManager(sqliteStore);

      // Get API key from settings - user MUST configure their own key
      const apiKey = this.settingsManager.get('miniMaxApiKey');
      if (!apiKey) {
        console.log('[ObsidianMemory] Warning: No API Key configured. AI generation will use fallback narratives.');
      }

      const observationGenerator = new ObservationGenerator(sqliteStore, searchManager, {
        apiKey: apiKey || '',
        apiUrl: this.settingsManager.get('apiUrl'),
        model: this.settingsManager.get('model')
      });

      const pollInterval = this.settingsManager.get('pollIntervalSeconds');
      const autoCapture = this.settingsManager.get('autoCapture');

      const lifecycleManager = new LifecycleManager(
        (this as any).app,
        sqliteStore,
        searchManager,
        observationGenerator,
        pollInterval,
        autoCapture
      );
      sqliteStore.setLifecycleManager(lifecycleManager);
      this.lifecycleManager = lifecycleManager;

      console.log('[ObsidianMemory] Services initialized');

      // Register UI
      this.addRibbonIcon('lightbulb', 'Memory', async () => {
        try {
          await this.toggleMemoryPanel();
        } catch (e) {
          console.error('[ObsidianMemory] togglePanel error:', e);
        }
      });

      this.registerView('memory-panel', (leaf: any) => {
        try {
          this.memoryPanel = new this.memoryPanelClass(leaf, sqliteStore, searchManager);
          return this.memoryPanel;
        } catch (e) {
          console.error('[ObsidianMemory] registerView error:', e);
          return null;
        }
      });

      // Register commands
      this.addCommand({
        id: 'search-memory',
        name: '搜索记忆',
        callback: async () => {
          this.toggleMemoryPanel();
        }
      });

      this.addCommand({
        id: 'inject-memory-context',
        name: '注入记忆上下文',
        callback: async () => {
          try {
            if (searchManager) {
              const context = await searchManager.getContextForInjection();
              await navigator.clipboard.writeText(context);
              new Notice('记忆上下文已复制！');
            }
          } catch (e) {
            console.error('[ObsidianMemory] inject command error:', e);
          }
        }
      });

      // Start session
      await lifecycleManager.sessionStart();
      console.log('[ObsidianMemory] Session started');

      console.log('[ObsidianMemory] onload complete');
    } catch (error) {
      console.error('[ObsidianMemory] Load error:', error);
    }
  }

  async onunload() {
    console.log('[ObsidianMemory] onunload');
  }

  private async toggleMemoryPanel(): Promise<void> {
    try {
      const workspace = (this as any).app.workspace;
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
    } catch (e) {
      console.error('[ObsidianMemory] toggleMemoryPanel error:', e);
    }
  }
}