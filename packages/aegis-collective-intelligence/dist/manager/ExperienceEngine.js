import { randomUUID } from 'crypto';
export class ExperienceEngine {
    experiences = new Map();
    recordExperience(taskId, goal, reasoningTrace, toolsUsed, modelsUsed, policiesApplied, outcome, executionTimeMs, successScore, confidence, feedback) {
        const id = `exp-${randomUUID()}`;
        const exp = {
            id,
            taskId,
            goal,
            reasoningTrace,
            toolsUsed,
            modelsUsed,
            policiesApplied,
            outcome,
            executionTimeMs,
            successScore,
            confidence,
            feedback,
            timestamp: new Date()
        };
        this.experiences.set(id, exp);
        console.log(`[ExperienceEngine] Logged experience ${id} (successScore: ${successScore.toFixed(2)})`);
        return exp;
    }
    getExperience(id) {
        return this.experiences.get(id);
    }
    listExperiences() {
        return Array.from(this.experiences.values());
    }
}
