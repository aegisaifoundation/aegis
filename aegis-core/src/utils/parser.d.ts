export declare const parser: {
    safeParseJSON<T = any>(text: string, fallback: T): T;
    stripHTMLTags(text: string): string;
};
