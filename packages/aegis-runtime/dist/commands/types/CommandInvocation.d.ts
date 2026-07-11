export interface CommandInvocation {
    command: string;
    args: string[];
    rawInput?: string;
    source?: string;
}
