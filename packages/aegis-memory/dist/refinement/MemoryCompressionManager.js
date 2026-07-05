import { providerManager } from '@aegis/providers';
export class MemoryCompressionManager {
    static instance = new MemoryCompressionManager();
    static getInstance() {
        return this.instance;
    }
    async compressHistory(sessionId, messages) {
        if (messages.length === 0) {
            return { goals: [], facts: [], decisions: [], risks: [] };
        }
        try {
            const isAvailable = await providerManager.checkModelAvailability();
            if (isAvailable) {
                const historyText = messages.map(m => `[${m.role}] ${m.content}`).join('\n');
                const prompt = `You are a medical AI memory compressor. Summarize the following dialogue into a structured JSON block containing:
- "goals": active goals or objectives discussed
- "facts": clinical facts or constraints mentioned
- "decisions": key steps taken or resolved tasks
- "risks": any execution errors or clinical concerns

Dialogue:
${historyText}

Output strictly valid JSON only:`;
                const response = await providerManager.generate(prompt);
                const cleaned = response.replace(/```json/g, '').replace(/```/g, '').trim();
                const summary = JSON.parse(cleaned);
                if (summary.goals && summary.facts && summary.decisions && summary.risks) {
                    return summary;
                }
            }
        }
        catch (err) {
            // Fallback on failures
        }
        return this.fallbackParse(messages);
    }
    fallbackParse(messages) {
        const goals = [];
        const facts = [];
        const decisions = [];
        const risks = [];
        for (const msg of messages) {
            const contentLower = msg.content.toLowerCase();
            if (msg.role === 'user') {
                if (contentLower.includes('goal') || contentLower.includes('objective') || contentLower.includes('plan')) {
                    goals.push(`Goal: ${msg.content}`);
                }
                else if (contentLower.includes('prefer') || contentLower.includes('remember') || contentLower.includes('always')) {
                    facts.push(`Preference: ${msg.content}`);
                }
            }
            if (msg.role === 'assistant') {
                if (contentLower.includes('resolved') || contentLower.includes('completed') || contentLower.includes('decision')) {
                    decisions.push(`Decision: ${msg.content}`);
                }
            }
            if (contentLower.includes('failed') || contentLower.includes('error') || contentLower.includes('timeout')) {
                risks.push(`Risk identified: ${msg.content.substring(0, 80)}...`);
            }
        }
        if (goals.length === 0)
            goals.push("Maintain dialogue session state.");
        if (facts.length === 0)
            facts.push("Standard medical data processing guidelines.");
        if (decisions.length === 0)
            decisions.push("Initialized memory context.");
        if (risks.length === 0)
            risks.push("None detected.");
        return {
            goals: Array.from(new Set(goals)),
            facts: Array.from(new Set(facts)),
            decisions: Array.from(new Set(decisions)),
            risks: Array.from(new Set(risks))
        };
    }
}
export const memoryCompressionManager = MemoryCompressionManager.getInstance();
