import { ExperienceObject, ReflectionSuggestion } from '../types/index.js';
export declare class ReflectionEngine {
    private reflections;
    reflect(exp: ExperienceObject): ReflectionSuggestion;
    getReflection(id: string): ReflectionSuggestion | undefined;
}
