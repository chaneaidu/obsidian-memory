"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SqliteStore = void 0;
class SqliteStore {
    constructor(app) {
        this.store = { sessions: [], observations: [], summaries: [] };
        this.memoryDir = '';
        this.dataFile = null;
        this.app = app;
        console.log('[SqliteStore] Constructor called');
    }
    async initialize(memoryDir) {
        console.log('[SqliteStore] initialize start:', memoryDir);
        this.memoryDir = memoryDir;
        try {
            // Ensure directory exists
            const vault = this.app.vault;
            const existingDir = vault.getAbstractFileByPath(memoryDir);
            console.log('[SqliteStore] vault check:', existingDir ? 'exists' : 'not exists');
            if (!existingDir) {
                await vault.createFolder(memoryDir);
                console.log('[SqliteStore] folder created');
            }
            const dbPath = `${memoryDir}/memories.json`;
            const existingFile = vault.getAbstractFileByPath(dbPath);
            if (existingFile && this.isTFile(existingFile)) {
                this.dataFile = existingFile;
                console.log('[SqliteStore] reading existing file');
                try {
                    const content = await vault.read(existingFile);
                    this.store = JSON.parse(content);
                    console.log('[SqliteStore] loaded store with', this.store.observations.length, 'observations');
                }
                catch (e) {
                    console.error('[SqliteStore] parse error:', e);
                    this.store = { sessions: [], observations: [], summaries: [] };
                }
            }
            else {
                console.log('[SqliteStore] creating new file');
                await this.saveDatabase();
            }
            console.log('[SqliteStore] initialize complete');
        }
        catch (error) {
            console.error('[SqliteStore] initialize error:', error);
            this.store = { sessions: [], observations: [], summaries: [] };
        }
    }
    isTFile(file) {
        return file && typeof file === 'object' && 'path' in file && 'stat' in file;
    }
    async saveDatabase() {
        try {
            const dbPath = `${this.memoryDir}/memories.json`;
            const content = JSON.stringify(this.store, null, 2);
            const vault = this.app.vault;
            if (this.dataFile) {
                await vault.modify(this.dataFile, content);
            }
            else {
                this.dataFile = await vault.create(dbPath, content);
            }
        }
        catch (error) {
            console.error('[SqliteStore] saveDatabase error:', error);
        }
    }
    async createSession(session) {
        this.store.sessions.push(session);
        await this.saveDatabase();
    }
    async getActiveSession(project) {
        const active = this.store.sessions
            .filter(s => s.project === project && s.status === 'active')
            .sort((a, b) => b.started_at_epoch - a.started_at_epoch);
        return active[0] || null;
    }
    async updateSession(id, updates) {
        const session = this.store.sessions.find(s => s.id === id);
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
        return this.store.observations
            .filter(o => o.project === project)
            .sort((a, b) => b.created_at_epoch - a.created_at_epoch)
            .slice(0, limit);
    }
    async createSummary(summary) {
        this.store.summaries.push(summary);
        await this.saveDatabase();
    }
    async getRecentSummaries(project, limit = 10) {
        return this.store.summaries
            .filter(s => s.project === project)
            .sort((a, b) => b.created_at_epoch - a.created_at_epoch)
            .slice(0, limit);
    }
    async searchObservations(query, project, limit = 20) {
        const q = query.toLowerCase();
        return this.store.observations
            .filter(o => {
            if (o.project !== project)
                return false;
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
    async close() {
        await this.saveDatabase();
    }
}
exports.SqliteStore = SqliteStore;
//# sourceMappingURL=SqliteStore.js.map