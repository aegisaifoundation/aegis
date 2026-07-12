import { LogFormatter } from './LogFormatter.js';
export class NativeLogger {
    context = null;
    logPrefix = 'distributed-intelligence';
    constructor() { }
    setContext(context) {
        this.context = context;
    }
    info(msg, metadata) {
        this.log('info', msg, metadata);
    }
    warn(msg, metadata) {
        this.log('warn', msg, metadata);
    }
    error(msg, metadata) {
        this.log('error', msg, metadata);
    }
    debug(msg, metadata) {
        this.log('debug', msg, metadata);
    }
    log(level, msg, metadata) {
        const formatted = LogFormatter.format(msg, metadata);
        const logger = this.context?.getLogger();
        if (logger) {
            const logMethod = logger[level] ? level : 'info';
            logger[logMethod](formatted, this.logPrefix);
        }
        else {
            const consoleMethod = level === 'debug' ? 'log' : level;
            console[consoleMethod](`[${this.logPrefix.toUpperCase()}] ${formatted}`);
        }
    }
}
export default NativeLogger;
//# sourceMappingURL=NativeLogger.js.map