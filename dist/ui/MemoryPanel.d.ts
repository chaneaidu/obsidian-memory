import { ItemView, WorkspaceLeaf } from 'obsidian';
import { SqliteStore } from '../storage/SqliteStore';
import { SearchManager } from '../search/SearchManager';
export declare class MemoryPanel extends ItemView {
    private store;
    private searchManager;
    private memoryListEl;
    constructor(leaf: WorkspaceLeaf, store: SqliteStore, searchManager: SearchManager);
    getViewType(): string;
    getDisplayText(): string;
    onOpen(): Promise<void>;
    onClose(): Promise<void>;
    private refreshMemories;
    private searchMemories;
}
//# sourceMappingURL=MemoryPanel.d.ts.map