export interface ILogger {
    debug(message: string, context?: any): void;
    info(message: string, context?: any): void;
    warn(message: string, context?: any): void;
    error(message: string, error?: any, context?: any): void;
    fatal(message: string, error?: any, context?: any): void;
}
