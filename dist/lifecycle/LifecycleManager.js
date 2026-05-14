"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LifecycleManager = void 0;
const tag_stripping_1 = require("../utils/tag-stripping");
class LifecycleManager {
    constructor(app, store, searchManager, observationGenerator) {
        this.activeSession = null;
        this.eventQueue = [];
        this.isProcessing = false;
        this.app = app;
        this.store = store;
        this.searchManager = searchManager;
        this.observationGenerator = observationGenerator;
        this.registerEventHandlers();
    }
    registerEventHandlers() {
        try {
            const vault = this.app.vault;
            if (!vault) {
                console.log('[LifecycleManager] No vault available');
                return;
            }
            // Capture file modifications
            vault.on('modify', async (file) => {
                if (this.isMarkdownFile(file.path)) {
                    await this.captureFileEvent(file.path, 'modify');
                }
            });
            // Capture file creations
            vault.on('create', async (file) => {
                if (this.isMarkdownFile(file.path)) {
                    await this.captureFileEvent(file.path, 'create');
                }
            });
            // Capture file deletions
            vault.on('delete', async (file) => {
                if (this.isMarkdownFile(file.path)) {
                    await this.captureFileEvent(file.path, 'delete');
                }
            });
            console.log('[LifecycleManager] Event handlers registered');
        }
        catch (e) {
            console.error('[LifecycleManager] registerEventHandlers error:', e);
        }
    }
    isMarkdownFile(path) {
        return path.endsWith('.md') && !path.startsWith('.obsidian-memory/');
    }
    async captureFileEvent(filePath, eventType) {
        if (!this.activeSession)
            return;
        // Strip private tags before processing
        const cleanPath = (0, tag_stripping_1.stripPrivateTags)(filePath);
        if (cleanPath !== filePath)
            return;
        const event = {
            type: eventType,
            file: filePath,
            timestamp: Date.now(),
            sessionId: this.activeSession.id
        };
        this.eventQueue.push(event);
        await this.processEventQueue();
    }
    async processEventQueue() {
        if (this.isProcessing || this.eventQueue.length === 0)
            return;
        this.isProcessing = true;
        const events = [...this.eventQueue];
        this.eventQueue = [];
        for (const event of events) {
            try {
                await this.observationGenerator.processEvent(event);
            }
            catch (e) {
                console.error('[LifecycleManager] processEvent error:', e);
            }
        }
        this.isProcessing = false;
    }
    async sessionStart() {
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
            console.log(`[LifecycleManager] Session started: ${session.id}`);
        }
        catch (e) {
            console.error('[LifecycleManager] sessionStart error:', e);
        }
    }
    async sessionStop() {
        if (!this.activeSession)
            return;
        try {
            await this.processEventQueue();
            await this.observationGenerator.generateSessionSummary(this.activeSession);
            await this.store.updateSession(this.activeSession.id, {
                completed_at: new Date().toISOString(),
                completed_at_epoch: Date.now(),
                status: 'completed'
            });
        }
        catch (e) {
            console.error('[LifecycleManager] sessionStop error:', e);
        }
        this.activeSession = null;
    }
    getProjectName() {
        try {
            return this.app.vault.getName();
        }
        catch (e) {
            console.error('[LifecycleManager] getProjectName error:', e);
            return 'default';
        }
    }
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    }
}
exports.LifecycleManager = LifecycleManager;
//# sourceMappingURL=LifecycleManager.js.map