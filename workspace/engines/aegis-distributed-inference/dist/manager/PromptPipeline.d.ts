export declare class PromptPipeline {
    processPrompt(prompt: string, sessionId: string): Promise<string>;
    private applyPrivacyFilter;
}
