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
export declare class SqliteStore {
    private store;
    private app;
    private memoryDir;
    private dataFile;
    constructor(app: App);
    initialize(memoryDir: string): Promise<void>;
    private isTFile;
    private saveDatabase;
    createSession(session: MemorySession): Promise<void>;
    getActiveSession(project: string): Promise<MemorySession | null>;
    updateSession(id: string, updates: Partial<MemorySession>): Promise<void>;
    createObservation(obs: Observation): Promise<void>;
    getObservations(project: string, limit?: number): Promise<Observation[]>;
    createSummary(summary: SessionSummary): Promise<void>;
    getRecentSummaries(project: string, limit?: number): Promise<SessionSummary[]>;
    searchObservations(query: string, project: string, limit?: number): Promise<Observation[]>;
    close(): Promise<void>;
}
//# sourceMappingURL=SqliteStore.d.ts.map