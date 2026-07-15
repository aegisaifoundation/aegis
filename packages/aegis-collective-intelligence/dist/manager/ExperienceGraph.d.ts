export interface ExperienceNode {
    readonly taskId: string;
    readonly experienceId: string;
    readonly knowledgeId?: string;
    readonly outcome: string;
    readonly domain: string;
}
export declare class ExperienceGraph {
    private graph;
    linkExperience(taskId: string, experienceId: string, domain: string, outcome: string, knowledgeId?: string): void;
    getTrace(taskId: string): ExperienceNode | undefined;
    listTraces(): ExperienceNode[];
}
