"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservationGenerator = void 0;
const MINIMAX_API_KEY = 'sk-cp-pFX8U1zq2vVWDKAMGd5_vMoAOzxrN8oDQO_SQ_zn2vg4I78ZJiqsyLCOehyIHithGzuHRawr9-wVyS6GM6vY99b5KQjXPEtYGmVvm2GflGMG8E7L6OlcaW8';
const MINIMAX_API_URL = 'https://api.minimax.chat/v1/text/chatcompletion_v2';
class ObservationGenerator {
    constructor(store, searchManager) {
        this.store = store;
        this.searchManager = searchManager;
        this.apiKey = MINIMAX_API_KEY;
    }
    async processEvent(event) {
        // Generate narrative with fallback
        let narrative = this.generateFallbackNarrative(event);
        try {
            narrative = await this.generateNarrative(event);
        }
        catch (e) {
            console.error('[ObsidianMemory] Failed to generate AI narrative:', e);
        }
        const observation = {
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
    generateId() {
        return `obs_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    }
    inferType(event) {
        const path = event.file.toLowerCase();
        if (path.includes('bug') || path.includes('fix'))
            return 'bugfix';
        if (path.includes('feature'))
            return 'feature';
        if (path.includes('decision') || path.includes('architecture'))
            return 'decision';
        return 'change';
    }
    extractTitle(event) {
        const parts = event.file.split('/');
        const filename = parts[parts.length - 1] || 'Untitled';
        return filename.replace('.md', '').replace(/[-_]/g, ' ');
    }
    async generateNarrative(event) {
        const prompt = this.buildNarrativePrompt(event);
        try {
            const response = await this.callMiniMaxAPI(prompt);
            return response;
        }
        catch (error) {
            console.error('[ObsidianMemory] MiniMax API error:', error);
            return this.generateFallbackNarrative(event);
        }
    }
    buildNarrativePrompt(event) {
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
    async callMiniMaxAPI(prompt) {
        const messages = [
            { role: 'user', content: prompt }
        ];
        const response = await fetch(MINIMAX_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: 'MiniMax-Text-01',
                messages: messages,
                max_tokens: 256,
                temperature: 0.7
            })
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MiniMax API error: ${response.status} - ${errorText}`);
        }
        const data = (await response.json());
        const content = data.choices?.[0]?.message?.content;
        if (!content) {
            throw new Error('No content in MiniMax response');
        }
        return content.trim();
    }
    generateFallbackNarrative(event) {
        const typeLabels = {
            'bugfix': 'Fixed a bug',
            'feature': 'Implemented a feature',
            'decision': 'Made an architectural decision',
            'change': 'Made changes to'
        };
        const action = typeLabels[event.type] || 'Modified';
        const filename = event.file.split('/').pop() || 'file';
        return `${action} ${filename}. This ${event.type} operation was recorded by Obsidian Memory plugin.`;
    }
    extractFacts(event) {
        const facts = [];
        const filename = event.file.split('/').pop() || '';
        if (filename) {
            facts.push(`File: ${filename}`);
        }
        facts.push(`Operation: ${event.type}`);
        facts.push(`Timestamp: ${new Date(event.timestamp).toISOString()}`);
        return facts;
    }
    extractConcepts(event) {
        const concepts = [];
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
    async generateSessionSummary(session) {
        try {
            const observations = await this.store.getObservations(session.project, 20);
            // Generate summary using AI
            let learned = '';
            try {
                learned = await this.generateSessionSummaryWithAI(observations);
            }
            catch (error) {
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
        }
        catch (error) {
            console.error('[ObsidianMemory] Failed to generate session summary:', error);
        }
    }
    async generateSessionSummaryWithAI(observations) {
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
            return await this.callMiniMaxAPI(prompt);
        }
        catch {
            return `Captured ${observations.length} observations during this session.`;
        }
    }
}
exports.ObservationGenerator = ObservationGenerator;
//# sourceMappingURL=ObservationGenerator.js.map