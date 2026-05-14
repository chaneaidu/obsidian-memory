import { App } from 'obsidian';
import { SqliteStore, MemorySession } from '../storage/SqliteStore';
import { SearchManager } from '../search/SearchManager';
import { ObservationGenerator } from '../observation/ObservationGenerator';
import { stripPrivateTags } from '../utils/tag-stripping';

export class LifecycleManager {
  private app: any;
  private store: SqliteStore;
  private searchManager: SearchManager;
  private observationGenerator: ObservationGenerator;
  private activeSession: MemorySession | null = null;
  private eventQueue: any[] = [];
  private isProcessing = false;
  private recentEvents: Map<string, number> = new Map();
  private readonly DEBOUNCE_MS = 2000;
  private isSaving: boolean = false;
  private lastScanTime: number = 0;
  private autoCapture: boolean = true;
  private pollInterval: number = 30000;
  private pollTimer: number | null = null;

  constructor(
    app: any,
    store: SqliteStore,
    searchManager: SearchManager,
    observationGenerator: ObservationGenerator,
    pollInterval: number = 30000,
    autoCapture: boolean = true
  ) {
    this.app = app;
    this.store = store;
    this.searchManager = searchManager;
    this.observationGenerator = observationGenerator;
    this.pollInterval = pollInterval * 1000; // Convert to ms
    this.autoCapture = autoCapture;
    this.startPolling();
  }

  private startPolling(): void {
    if (!this.autoCapture) {
      console.log('[LifecycleManager] Auto capture disabled');
      return;
    }
    // Poll at configured interval instead of listening to vault events
    this.pollTimer = window.setInterval(async () => {
      await this.scanVaultChanges();
    }, this.pollInterval);
    console.log(`[LifecycleManager] Polling started (${this.pollInterval / 1000}s interval)`);
  }

  updateSettings(pollInterval: number, autoCapture: boolean): void {
    this.pollInterval = pollInterval * 1000;
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

  private async scanVaultChanges(): Promise<void> {
    if (!this.activeSession) return;

    try {
      const vault = this.app.vault;
      const now = Date.now();

      // Get all markdown files
      const files = vault.getFiles().filter(f =>
        this.isMarkdownFile(f.path)
      );

      for (const file of files) {
        // Only process files modified since last scan
        if (file.stat.mtime > this.lastScanTime) {
          await this.captureFileEvent(file.path, 'modify');
        }
      }

      this.lastScanTime = now;
    } catch (e) {
      console.error('[LifecycleManager] scanVaultChanges error:', e);
    }
  }

  private isMarkdownFile(path: string): boolean {
    if (!path.endsWith('.md')) return false;
    if (path.startsWith('.obsidian-memory/')) return false;
    if (path.includes('/.obsidian-memory/')) return false;
    if (path.endsWith('memories.json')) return false;
    return true;
  }

  private async captureFileEvent(filePath: string, eventType: string): Promise<void> {
    if (!this.activeSession) return;
    if (this.isSaving) return; // Skip if we're currently saving

    // Strip private tags before processing
    const cleanPath = stripPrivateTags(filePath);
    if (cleanPath !== filePath) return;

    // Debounce: skip if same file processed within DEBOUNCE_MS window
    const lastProcessed = this.recentEvents.get(filePath);
    const now = Date.now();
    if (lastProcessed && (now - lastProcessed) < this.DEBOUNCE_MS) {
      return;
    }
    this.recentEvents.set(filePath, now);

    // Cleanup old entries to prevent memory leak (keep only last 5 minutes)
    const cutoff = now - 300000;
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

  private async processEventQueue(): Promise<void> {
    if (this.isProcessing || this.eventQueue.length === 0) return;

    this.isProcessing = true;
    const events = [...this.eventQueue];
    this.eventQueue = [];

    for (const event of events) {
      try {
        await this.observationGenerator.processEvent(event);
      } catch (e) {
        console.error('[LifecycleManager] processEvent error:', e);
      }
    }

    this.isProcessing = false;
  }

  // Called by SqliteStore before saving
  setSaving(saving: boolean): void {
    this.isSaving = saving;
  }

  async sessionStart(): Promise<void> {
    try {
      const project = this.getProjectName();
      let session = await this.store.getActiveSession(project);

      if (!session) {
        session = {
          id: this.generateId(),
          content_session_id: this.generateId(),
          project: project,
          started_at: new Date().toISOString(),
          started_at_epoch: Date.now(),
          status: 'active'
        };
        await this.store.createSession(session);
      }

      this.activeSession = session;
      this.lastScanTime = Date.now();
      console.log(`[LifecycleManager] Session started: ${session.id}`);
    } catch (e) {
      console.error('[LifecycleManager] sessionStart error:', e);
    }
  }

  async sessionStop(): Promise<void> {
    if (!this.activeSession) return;

    try {
      await this.processEventQueue();
      await this.observationGenerator.generateSessionSummary(this.activeSession);
      await this.store.updateSession(this.activeSession.id, {
        completed_at: new Date().toISOString(),
        completed_at_epoch: Date.now(),
        status: 'completed'
      });
    } catch (e) {
      console.error('[LifecycleManager] sessionStop error:', e);
    }

    this.activeSession = null;
  }

  private getProjectName(): string {
    try {
      return this.app.vault.getName();
    } catch (e) {
      console.error('[LifecycleManager] getProjectName error:', e);
      return 'default';
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}