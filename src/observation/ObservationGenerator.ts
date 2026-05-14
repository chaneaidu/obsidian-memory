import { SqliteStore, Observation, MemorySession } from '../storage/SqliteStore';
import { SearchManager } from '../search/SearchManager';

const DEFAULT_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
const DEFAULT_MODEL = 'MiniMax-Text-01';

interface AIConfig {
  apiKey: string;
  apiUrl?: string;
  model?: string;
}

interface MiniMaxMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface MiniMaxResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class ObservationGenerator {
  private store: SqliteStore;
  private searchManager: SearchManager;
  private config: AIConfig;

  constructor(store: SqliteStore, searchManager: SearchManager, config: AIConfig) {
    this.store = store;
    this.searchManager = searchManager;
    this.config = {
      apiKey: config.apiKey,
      apiUrl: config.apiUrl || DEFAULT_API_URL,
      model: config.model || DEFAULT_MODEL
    };
  }

  setApiKey(apiKey: string): void {
    this.config.apiKey = apiKey;
  }

  setApiUrl(apiUrl: string): void {
    this.config.apiUrl = apiUrl;
  }

  setModel(model: string): void {
    this.config.model = model;
  }

  getConfig(): AIConfig {
    return { ...this.config };
  }

  async processEvent(event: any): Promise<void> {
    // Generate narrative with fallback
    let narrative = this.generateFallbackNarrative(event);
    try {
      narrative = await this.generateNarrative(event);
    } catch (e) {
      console.error('[ObsidianMemory] Failed to generate AI narrative:', e);
    }

    const observation: Observation = {
      id: this.generateId(),
      session_id: event.sessionId,
      project: 'default',
      type: this.inferType(event),
      title: this.extractTitle(event),
      narrative: narrative,
      facts: this.extractFacts(event),
      concepts: this.extractConcepts(event),
      files_read: event.type === 'create' || event.type === 'modify' ? [event.file] : [],
      files_modified: event.type === 'modify' ? [event.file] : [],
      created_at: new Date().toISOString(),
      created_at_epoch: Date.now()
    };

    await this.store.createObservation(observation);
    console.log(`[ObsidianMemory] Created observation: ${observation.id}`);
  }

  private generateId(): string {
    return `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private inferType(event: any): string {
    const path = event.file.toLowerCase();
    if (path.includes('bug') || path.includes('fix')) return 'bugfix';
    if (path.includes('feature')) return 'feature';
    if (path.includes('decision') || path.includes('architecture')) return 'decision';
    return 'change';
  }

  private extractTitle(event: any): string {
    const parts = event.file.split('/');
    const filename = parts[parts.length - 1] || 'Untitled';
    return filename.replace('.md', '').replace(/[-_]/g, ' ');
  }

  private async generateNarrative(event: any): Promise<string> {
    const prompt = this.buildNarrativePrompt(event);

    try {
      const response = await this.callAIAPI(prompt);
      return response;
    } catch (error) {
      console.error('[ObsidianMemory] AI API error:', error);
      return this.generateFallbackNarrative(event);
    }
  }

  private buildNarrativePrompt(event: any): string {
    const filename = event.file.split('/').pop() || 'unknown';
    const operation = event.type;
    const type = this.inferType(event);

    return `You are an intelligent note-taking assistant. Generate a concise, informative narrative (2-3 sentences) describing what happened in this Obsidian vault operation.

Operation: ${operation}
File: ${filename}
Type: ${type}

Focus on:
- What was the purpose/action
- Key details about the content or context
- Why it might be important

Format: Just the narrative text, no labels or prefixes.`;
  }

  private async callAIAPI(prompt: string, retries = 3): Promise<string> {
    if (!this.config.apiKey) {
      throw new Error('No API key configured');
    }

    const messages: any[] = [
      { role: 'user', content: prompt }
    ];

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await fetch(this.config.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.config.apiKey}`
          },
          body: JSON.stringify({
            model: this.config.model,
            messages: messages,
            max_tokens: 256,
            temperature: 0.7
          })
        });

        if (response.ok) {
          const data = (await response.json()) as any;
          const content = data.choices?.[0]?.message?.content;
          if (content) return content.trim();
        }

        // Non-ok response or empty content
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        throw new Error(`API error: ${response.status}`);
      } catch (e) {
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw e;
      }
    }
    throw new Error('AI API failed after retries');
  }

  private generateFallbackNarrative(event: any): string {
    const typeLabels: Record<string, string> = {
      'bugfix': 'Fixed a bug',
      'feature': 'Implemented a feature',
      'decision': 'Made an architectural decision',
      'change': 'Made changes to'
    };

    const action = typeLabels[event.type] || 'Modified';
    const filename = event.file.split('/').pop() || 'file';

    return `${action} ${filename}. This ${event.type} operation was recorded by Obsidian Memory plugin.`;
  }

  private extractFacts(event: any): string[] {
    const facts: string[] = [];
    const filename = event.file.split('/').pop() || '';

    if (filename) {
      facts.push(`File: ${filename}`);
    }
    facts.push(`Operation: ${event.type}`);
    facts.push(`Timestamp: ${new Date(event.timestamp).toISOString()}`);

    return facts;
  }

  private extractConcepts(event: any): string[] {
    const concepts: string[] = [];

    // Extract folder-based concepts
    const parts = event.file.split('/');
    for (const part of parts) {
      if (part.length > 3 && part !== 'md' && !part.match(/^\d+$/)) {
        concepts.push(part.replace(/[-_]/g, ' '));
      }
    }

    // Limit to 5 concepts
    return concepts.slice(0, 5);
  }

  async generateSessionSummary(session: MemorySession): Promise<void> {
    try {
      const observations = await this.store.getObservations(session.project, 20);

      // Generate summary using AI
      let learned = '';
      try {
        learned = await this.generateSessionSummaryWithAI(observations);
      } catch (error) {
        console.error('[ObsidianMemory] Failed to generate AI summary:', error);
        learned = observations.length > 0
          ? `Captured ${observations.length} observations during this session`
          : 'No observations captured';
      }

      const summary = {
        id: `summary_${Date.now()}`,
        session_id: session.id,
        project: session.project,
        request: `Session ${session.id.substring(0, 8)} in ${session.project}`,
        investigated: observations.map(o => o.narrative).join('\n'),
        learned: learned,
        completed: 'Session completed normally',
        next_steps: '',
        created_at: new Date().toISOString(),
        created_at_epoch: Date.now()
      };

      await this.store.createSummary(summary);
      console.log(`[ObsidianMemory] Created session summary: ${summary.id}`);
    } catch (error) {
      console.error('[ObsidianMemory] Failed to generate session summary:', error);
    }
  }

  private async generateSessionSummaryWithAI(observations: Observation[]): Promise<string> {
    if (observations.length === 0) {
      return 'No observations captured during this session.';
    }

    const obsList = observations
      .slice(0, 10)
      .map((o, i) => `${i + 1}. ${o.narrative}`)
      .join('\n');

    const prompt = `You are an intelligent assistant summarizing user activity in an Obsidian vault. Based on the following observations, generate a concise summary (1-2 sentences) of what the user accomplished:

Observations:
${obsList}

Format: Just the summary text, no labels or prefixes.`;

    try {
      return await this.callAIAPI(prompt);
    } catch {
      return `Captured ${observations.length} observations during this session.`;
    }
  }
}