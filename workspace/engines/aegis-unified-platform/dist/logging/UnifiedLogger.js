import { serviceRegistry } from '@aegis/runtime';
export class UnifiedLogger {
    static getRuntimeLogger() {
        if (serviceRegistry.has('logger')) {
            return serviceRegistry.get('logger');
        }
        return console;
    }
    static info(message, engineId, context) {
        const logger = this.getRuntimeLogger();
        const payload = this.formatPayload(message, context);
        if (typeof logger.log === 'function') {
            logger.log('info', message, engineId, payload);
        }
        else {
            console.log(`[INFO] [${engineId}] ${message}`, JSON.stringify(payload));
        }
    }
    static warn(message, engineId, context) {
        const logger = this.getRuntimeLogger();
        const payload = this.formatPayload(message, context);
        if (typeof logger.log === 'function') {
            logger.log('warn', message, engineId, payload);
        }
        else {
            console.warn(`[WARN] [${engineId}] ${message}`, JSON.stringify(payload));
        }
    }
    static error(message, engineId, error, context) {
        const logger = this.getRuntimeLogger();
        const payload = this.formatPayload(message, {
            ...context,
            error: error?.message || String(error),
            trace: error?.stack
        });
        if (typeof logger.log === 'function') {
            logger.log('error', message, engineId, payload);
        }
        else {
            console.error(`[ERROR] [${engineId}] ${message}`, JSON.stringify(payload));
        }
    }
    static formatPayload(message, context) {
        return {
            timestamp: new Date().toISOString(),
            correlationId: context?.correlationId || 'corr-none',
            sessionId: context?.sessionId || 'sess-none',
            nodeId: context?.nodeId || 'node-default',
            ...context
        };
    }
}
