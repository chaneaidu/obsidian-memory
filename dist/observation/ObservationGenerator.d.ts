import { SqliteStore, MemorySession } from '../storage/SqliteStore';
import { SearchManager } from '../search/SearchManager';
export declare class ObservationGenerator {
    private store;
    private searchManager;
    private apiKey;
    constructor(store: SqliteStore, searchManager: SearchManager);
    processEvent(event: any): Promise<void>;
    private generateId;
    private inferType;
    private extractTitle;
    private generateNarrative;
    private buildNarrativePrompt;
    private callMiniMaxAPI;
    private generateFallbackNarrative;
    private extractFacts;
    private extractConcepts;
    generateSessionSummary(session: MemorySession): Promise<void>;
    private generateSessionSummaryWithAI;
}
//# sourceMappingURL=ObservationGenerator.d.ts.map