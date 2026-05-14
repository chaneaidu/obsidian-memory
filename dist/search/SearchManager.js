"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SearchManager = void 0;
class SearchManager {
    constructor(store) {
        this.chromaAvailable = false;
        this.store = store;
    }
    async search(query, options = {}) {
        const project = options.project || 'default';
        const limit = options.limit || 20;
        // First try FTS search
        const observations = await this.store.searchObservations(query, project, limit);
        return observations.map(obs => ({
            observation: obs,
            relevanceScore: this.calculateRelevance(obs, query)
        })).sort((a, b) => b.relevanceScore - a.relevanceScore);
    }
    async getContextForInjection(options = {}) {
        const project = options.project || 'default';
        const limit = options.limit || 10;
        const observations = await this.store.getObservations(project, limit);
        const summaries = await this.store.getRecentSummaries(project, limit);
        const lines = ['## Memory Context\n'];
        if (summaries.length > 0) {
            lines.push('### Recent Sessions\n');
            for (const summary of summaries.slice(0, 5)) {
                lines.push(`- ${summary.learned || summary.request || 'Session ' + summary.id.substring(0, 8)}`);
            }
            lines.push('');
        }
        if (observations.length > 0) {
            lines.push('### Key Observations\n');
            for (const obs of observations.slice(0, 5)) {
                const title = obs.title || obs.type;
                const date = new Date(obs.created_at).toLocaleDateString();
                lines.push(`**${title}** (${date})`);
                if (obs.narrative) {
                    lines.push(obs.narrative.substring(0, 200) + (obs.narrative.length > 200 ? '...' : ''));
                }
                lines.push('');
            }
        }
        lines.push('\n---\n*From Obsidian Memory*');
        return lines.join('\n');
    }
    calculateRelevance(item, query) {
        const queryLower = query.toLowerCase();
        let score = 0;
        if ('narrative' in item && item.narrative) {
            if (item.narrative.toLowerCase().includes(queryLower))
                score += 0.5;
        }
        if ('title' in item && item.title) {
            if (item.title.toLowerCase().includes(queryLower))
                score += 0.3;
        }
        if ('learned' in item && item.learned) {
            if (item.learned.toLowerCase().includes(queryLower))
                score += 0.3;
        }
        if ('concepts' in item && item.concepts) {
            const concepts = Array.isArray(item.concepts) ? item.concepts : [];
            for (const concept of concepts) {
                if (concept.toLowerCase().includes(queryLower))
                    score += 0.2;
            }
        }
        // Recency boost
        const age = Date.now() - (item.created_at_epoch || 0);
        const daysOld = age / (1000 * 60 * 60 * 24);
        if (daysOld < 7)
            score += 0.2;
        else if (daysOld < 30)
            score += 0.1;
        return score;
    }
    async close() {
        // Cleanup resources if needed
    }
}
exports.SearchManager = SearchManager;
//# sourceMappingURL=SearchManager.js.map