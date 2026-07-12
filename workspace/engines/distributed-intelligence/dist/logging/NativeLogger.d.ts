import { IRuntimeContext_v1 } from '@aegis/sdk';
export declare class NativeLogger {
    private context;
    private logPrefix;
    constructor();
    setContext(context: IRuntimeContext_v1): void;
    info(msg: string, metadata?: Record<string, any>): void;
    warn(msg: string, metadata?: Record<string, any>): void;
    error(msg: string, metadata?: Record<string, any>): void;
    debug(msg: string, metadata?: Record<string, any>): void;
    private log;
}
export default NativeLogger;
//# sourceMappingURL=NativeLogger.d.ts.map