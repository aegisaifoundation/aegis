export class ReasoningEvolutionEngine {
    detectImprovements(experiences) {
        const insights = [];
        const failures = experiences.filter(e => e.outcome === 'failure');
        const successes = experiences.filter(e => e.outcome === 'success');
        // Detect repeated patterns
        if (failures.length >= 2) {
            const toolFailureMap = new Map();
            for (const f of failures) {
                for (const t of f.toolsUsed) {
                    toolFailureMap.set(t, (toolFailureMap.get(t) || 0) + 1);
                }
            }
            for (const [tool, count] of toolFailureMap.entries()) {
                if (count >= 2) {
                    insights.push(`Tool [${tool}] failed repeatedly in ${count} tasks. Suggest parameters or schema audit.`);
                }
            }
        }
        if (successes.length >= 3) {
            insights.push('High volume of success runs in domain. Pipeline layout validated.');
        }
        return insights;
    }
}
