export interface ToolCall {
    name: string;
    input: string;
}
export declare class ToolParser {
    private escapeJSONNewlines;
    parse(text: string): ToolCall[];
    private attemptJSONRepair;
}
export declare const toolParser: ToolParser;
