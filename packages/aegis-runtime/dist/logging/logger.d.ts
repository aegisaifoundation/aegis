type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export declare const logger: {
    debug(message: string, ...args: any[]): void;
    info(message: string, ...args: any[]): void;
    warn(message: string, ...args: any[]): void;
    error(message: string, ...args: any[]): void;
    shouldLog(level: LogLevel): boolean;
};
export {};
