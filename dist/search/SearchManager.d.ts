import { SqliteStore, Observation, SessionSummary } from '../storage/SqliteStore';
export interface SearchResult {
    observation?: Observation;
    summary?: SessionSummary;
    relevanceScore: number;
}
export declare class SearchManager {
    private store;
    private chromaAvailable;
    constructor(store: SqliteStore);
    search(query: string, options?: {
        project?: string;
        limit?: number;
    }): Promise<SearchResult[]>;
    getContextForInjection(options?: {
        project?: string;
        limit?: number;
    }): Promise<string>;
    private calculateRelevance;
    close(): Promise<void>;
}
//# sourceMappingURL=SearchManager.d.ts.map