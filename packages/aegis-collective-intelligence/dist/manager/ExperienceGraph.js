export class ExperienceGraph {
    graph = new Map();
    linkExperience(taskId, experienceId, domain, outcome, knowledgeId) {
        this.graph.set(taskId, {
            taskId,
            experienceId,
            knowledgeId,
            outcome,
            domain
        });
    }
    getTrace(taskId) {
        return this.graph.get(taskId);
    }
    listTraces() {
        return Array.from(this.graph.values());
    }
}
