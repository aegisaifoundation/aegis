import { SkillContext } from './SkillContext.js';
export interface Skill {
    name: string;
    version: string;
    category: string;
    description: string;
    permissions?: string[];
    entryPath?: string;
    skillPath?: string;
    initialize?(context: SkillContext): Promise<void>;
    shutdown?(context: SkillContext): Promise<void>;
    execute(input: any, context: SkillContext): Promise<any>;
    [key: string]: any;
}
