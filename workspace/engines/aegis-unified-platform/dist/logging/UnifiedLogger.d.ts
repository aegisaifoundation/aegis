export interface LogContext {
    correlationId?: string;
    sessionId?: string;
    nodeId?: string;
    [key: string]: any;
}
export declare class UnifiedLogger {
    private static getRuntimeLogger;
    static info(message: string, engineId: string, context?: LogContext): void;
    static warn(message: string, engineId: string, context?: LogContext): void;
    static error(message: string, engineId: string, error?: any, context?: LogContext): void;
    private static formatPayload;
}
