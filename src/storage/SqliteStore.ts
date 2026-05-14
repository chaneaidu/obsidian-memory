import { App } from 'obsidian';

export interface MemorySession {
  id: string;
  content_session_id: string;
  project: string;
  started_at: string;
  started_at_epoch: number;
  completed_at?: string;
  completed_at_epoch?: number;
  status: 'active' | 'completed' | 'failed';
}

export interface Observation {
  id: string;
  session_id: string;
  project: string;
  type: string;
  title?: string;
  narrative?: string;
  facts: string[];
  concepts: string[];
  files_read: string[];
  files_modified: string[];
  created_at: string;
  created_at_epoch: number;
}

export interface SessionSummary {
  id: string;
  session_id: string;
  project: string;
  request?: string;
  investigated?: string;
  learned?: string;
  completed?: string;
  next_steps?: string;
  created_at: string;
  created_at_epoch: number;
}

interface DatabaseStore {
  sessions: MemorySession[];
  observations: Observation[];
  summaries: SessionSummary[];
}

export class SqliteStore {
  private store: DatabaseStore = { sessions: [], observations: [], summaries: [] };
  private app: App;
  private memoryDir: string = '';
  private dataFile: any = null;
  private saveInProgress: boolean = false;
  private pendingSave: boolean = false;
  private lifecycleManager: any = null;

  constructor(app: App) {
    this.app = app;
    console.log('[SqliteStore] Constructor called');
  }

  setLifecycleManager(lm: any): void {
    this.lifecycleManager = lm;
  }

  async initialize(memoryDir: string): Promise<void> {
    console.log('[SqliteStore] initialize start:', memoryDir);
    this.memoryDir = memoryDir;

    try {
      const vault = this.app.vault;

      // Skip folder creation check - it causes race conditions
      // Just check if we can access existing folder
      const dbPath = `${memoryDir}/memories.json`;
      const existingFile = vault.getAbstractFileByPath(dbPath);

      if (existingFile) {
        this.dataFile = existingFile;
        console.log('[SqliteStore] reading existing file');
        try {
          const content = await vault.read(existingFile);
          this.store = JSON.parse(content);
          console.log('[SqliteStore] loaded store with', this.store.observations.length, 'observations');
        } catch (e) {
          console.error('[SqliteStore] parse error:', e);
          this.store = { sessions: [], observations: [], summaries: [] };
        }
      } else {
        console.log('[SqliteStore] no existing file - will create on first save');
        this.store = { sessions: [], observations: [], summaries: [] };
      }
      console.log('[SqliteStore] initialize complete');
    } catch (error) {
      console.error('[SqliteStore] initialize error:', error);
      this.store = { sessions: [], observations: [], summaries: [] };
    }
  }

  private isTFile(file: any): boolean {
    return file && typeof file === 'object' && 'path' in file && 'stat' in file;
  }

  private async saveDatabase(): Promise<void> {
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

      // If we have a dataFile reference, use it directly
      if (this.dataFile) {
        await vault.modify(this.dataFile, content);
        return;
      }

      // No reference - look it up fresh
      const existingFile = vault.getAbstractFileByPath(dbPath);
      if (existingFile) {
        this.dataFile = existingFile;
        await vault.modify(this.dataFile, content);
        return;
      }

      // File doesn't exist at all - create it
      this.dataFile = await vault.create(dbPath, content);
    } catch (error) {
      // Silently fail - the in-memory store is still valid
      // This prevents console spam during concurrent plugin loads
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

  async createSession(session: MemorySession): Promise<void> {
    this.store.sessions.push(session);
    await this.saveDatabase();
  }

  async getActiveSession(project: string): Promise<MemorySession | null> {
    const active = this.store.sessions
      .filter(s => s.project === project && s.status === 'active')
      .sort((a, b) => b.started_at_epoch - a.started_at_epoch);
    return active[0] || null;
  }

  async updateSession(id: string, updates: Partial<MemorySession>): Promise<void> {
    const session = this.store.sessions.find(s => s.id === id);
    if (session) {
      Object.assign(session, updates);
      await this.saveDatabase();
    }
  }

  async createObservation(obs: Observation): Promise<void> {
    this.store.observations.push(obs);
    await this.saveDatabase();
  }

  async getObservations(project: string, limit: number = 50): Promise<Observation[]> {
    return this.store.observations
      .filter(o => o.project === project)
      .sort((a, b) => b.created_at_epoch - a.created_at_epoch)
      .slice(0, limit);
  }

  async deleteObservation(id: string): Promise<void> {
    this.store.observations = this.store.observations.filter(o => o.id !== id);
    await this.saveDatabase();
  }

  async createSummary(summary: SessionSummary): Promise<void> {
    this.store.summaries.push(summary);
    await this.saveDatabase();
  }

  async getRecentSummaries(project: string, limit: number = 10): Promise<SessionSummary[]> {
    return this.store.summaries
      .filter(s => s.project === project)
      .sort((a, b) => b.created_at_epoch - a.created_at_epoch)
      .slice(0, limit);
  }

  async searchObservations(query: string, project: string, limit: number = 20): Promise<Observation[]> {
    const q = query.toLowerCase();
    return this.store.observations
      .filter(o => {
        if (o.project !== project) return false;
        const searchable = [
          o.title, o.narrative, o.type,
          ...(Array.isArray(o.facts) ? o.facts : []),
          ...(Array.isArray(o.concepts) ? o.concepts : [])
        ].join(' ').toLowerCase();
        return searchable.includes(q);
      })
      .sort((a, b) => b.created_at_epoch - a.created_at_epoch)
      .slice(0, limit);
  }

  async close(): Promise<void> {
    await this.saveDatabase();
  }
}