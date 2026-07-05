/**
 * Called by tool/plugin loading code to invalidate the cached system prompt
 * when the registry changes.
 */
export declare function invalidateSystemPromptCache(): void;
export declare class PromptBuilder {
    buildSystemPrompt(): string;
}
export declare const promptBuilder: PromptBuilder;
