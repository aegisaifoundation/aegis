import { Skill } from './Skill.js';
import { SkillState } from './SkillState.js';
export declare class SkillRegistry {
    private skills;
    private states;
    private contextCreator?;
    register(skill: Skill): void;
    unregister(name: string): boolean;
    get(name: string): Skill | undefined;
    list(): Skill[];
    setSkillState(name: string, state: SkillState): void;
    getSkillState(name: string): SkillState | undefined;
    setContextCreator(creator: (name: string) => any): void;
    executeSkill(name: string, input: any): Promise<any>;
}
export declare const skillRegistry: SkillRegistry;
