import { Skill } from './Skill.js';
import { SkillContext } from './SkillContext.js';
export declare class SkillLoader {
    constructor();
    private getAegisCoreRoot;
    getWorkspaceRoot(): string;
    getSkillsDir(): string;
    loadSkill(skillPath: string): Promise<Skill>;
    createContext(name: string): SkillContext;
    initializeSkill(name: string): Promise<void>;
    shutdownSkill(name: string): Promise<void>;
}
export declare const skillLoader: SkillLoader;
