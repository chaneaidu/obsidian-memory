import { SqliteStore, Observation, SessionSummary } from '../storage/SqliteStore';

export interface SearchResult {
  observation?: Observation;
  summary?: SessionSummary;
  relevanceScore: number;
}

export class SearchManager {
  private store: SqliteStore;
  private chromaAvailable = false;

  constructor(store: SqliteStore) {
    this.store = store;
  }

  async search(query: string, options: { project?: string; limit?: number } = {}): Promise<SearchResult[]> {
    const project = options.project || 'default';
    const limit = options.limit || 20;

    const observations = await this.store.searchObservations(query, project, limit);

    return observations.map(obs => ({
      observation: obs,
      relevanceScore: this.calculateRelevance(obs, query)
    })).sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  async getContextForInjection(options: { project?: string; limit?: number } = {}): Promise<string> {
    const project = options.project || 'default';
    const limit = options.limit || 10;

    const observations = await this.store.getObservations(project, limit);
    const summaries = await this.store.getRecentSummaries(project, limit);

    const lines: string[] = ['# 记忆上下文\n'];

    if (summaries.length > 0) {
      lines.push('## 最近会话摘要\n');
      for (const summary of summaries.slice(0, 3)) {
        lines.push(`### 会话 ${summary.session_id.substring(0, 8)}`);
        if (summary.learned) {
          lines.push(summary.learned);
        }
        if (summary.next_steps) {
          lines.push(`**下一步**: ${summary.next_steps}`);
        }
        lines.push('');
      }
    }

    if (observations.length > 0) {
      lines.push('## 关键观察\n');
      for (const obs of observations.slice(0, 10)) {
        const title = obs.title || obs.type;
        const date = new Date(obs.created_at).toLocaleDateString();
        lines.push(`### ${title}`);
        lines.push(`*${date}*`);
        if (obs.narrative) {
          lines.push(obs.narrative);
        }
        if (obs.concepts && obs.concepts.length > 0) {
          lines.push(`**概念**: ${obs.concepts.join(', ')}`);
        }
        if (obs.files_modified && obs.files_modified.length > 0) {
          lines.push(`**修改文件**: ${obs.files_modified.join(', ')}`);
        }
        lines.push('');
      }
    }

    lines.push('\n---\n*来自 Obsidian Memory 插件*');

    return lines.join('\n');
  }

  private calculateRelevance(item: Observation | SessionSummary, query: string): number {
    const queryLower = query.toLowerCase();
    const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 0);
    let score = 0;

    // Multiple term matching for better precision
    for (const term of queryTerms) {
      if ('narrative' in item && item.narrative) {
        const narrativeLower = item.narrative.toLowerCase();
        if (narrativeLower.includes(term)) {
          score += 0.4;
          // Bonus for exact word match
          if (narrativeLower.includes(' ' + term + ' ')) score += 0.1;
        }
      }
      if ('title' in item && item.title) {
        if (item.title.toLowerCase().includes(term)) score += 0.3;
      }
      if ('learned' in item && item.learned) {
        if (item.learned.toLowerCase().includes(term)) score += 0.25;
      }
      if ('concepts' in item && item.concepts) {
        const concepts = Array.isArray(item.concepts) ? item.concepts : [];
        for (const concept of concepts) {
          if (concept.toLowerCase().includes(term)) score += 0.2;
        }
      }
    }

    // Recency boost (exponential decay)
    const age = Date.now() - (item.created_at_epoch || 0);
    const hoursOld = age / (1000 * 60 * 60);
    if (hoursOld < 1) score += 0.3;
    else if (hoursOld < 24) score += 0.2;
    else if (hoursOld < 168) score += 0.1; // 1 week
    else if (hoursOld < 720) score += 0.05; // 1 month

    return Math.min(score, 1.0);
  }

  async close(): Promise<void> {
    // Cleanup resources if needed
  }
}