import { randomUUID } from 'crypto';
export class ReflectionEngine {
    reflections = new Map();
    reflect(exp) {
        const whatSucceeded = [];
        const whatFailed = [];
        let optimizedStepsCount = exp.reasoningTrace.length;
        let alternativeToolRecommended;
        let alternativeModelRecommended;
        const reasoningImprovements = [];
        if (exp.outcome === 'success') {
            whatSucceeded.push(`Completed goal: "${exp.goal}"`);
            if (exp.executionTimeMs > 5000) {
                reasoningImprovements.push('Execution latency high. Suggest step consolidation.');
                optimizedStepsCount = Math.max(1, exp.reasoningTrace.length - 1);
            }
        }
        else {
            whatFailed.push(`Failed to achieve goal: "${exp.goal}"`);
            reasoningImprovements.push('Audit tool parameters and adjust fallback checkpoints.');
            if (exp.toolsUsed.length > 0) {
                alternativeToolRecommended = `${exp.toolsUsed[0]}_optimized`;
            }
            alternativeModelRecommended = 'gpt-4o'; // Recommend higher confidence remote fallback
        }
        const promoteToReusableKnowledge = exp.successScore > 0.8;
        const ref = {
            id: `ref-${randomUUID()}`,
            experienceId: exp.id,
            whatSucceeded,
            whatFailed,
            optimizedStepsCount,
            alternativeToolRecommended,
            alternativeModelRecommended,
            reasoningImprovements,
            promoteToReusableKnowledge
        };
        this.reflections.set(ref.id, ref);
        console.log(`[ReflectionEngine] Reflected on ${exp.id}: promoteToReusableKnowledge = ${promoteToReusableKnowledge}`);
        return ref;
    }
    getReflection(id) {
        return this.reflections.get(id);
    }
}
