import { SqliteStore } from '../storage/SqliteStore';
import { SearchManager } from '../search/SearchManager';
import { ObservationGenerator } from '../observation/ObservationGenerator';
export declare class LifecycleManager {
    private app;
    private store;
    private searchManager;
    private observationGenerator;
    private activeSession;
    private eventQueue;
    private isProcessing;
    constructor(app: any, store: SqliteStore, searchManager: SearchManager, observationGenerator: ObservationGenerator);
    private registerEventHandlers;
    private isMarkdownFile;
    private captureFileEvent;
    private processEventQueue;
    sessionStart(): Promise<void>;
    sessionStop(): Promise<void>;
    private getProjectName;
    private generateId;
}
//# sourceMappingURL=LifecycleManager.d.ts.map