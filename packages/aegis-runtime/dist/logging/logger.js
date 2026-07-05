import { config } from '../config/index.js';
const levels = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};
export const logger = {
    debug(message, ...args) {
        if (this.shouldLog('debug')) {
            console.log(`[DEBUG] ${message}`, ...args);
        }
    },
    info(message, ...args) {
        if (this.shouldLog('info')) {
            console.log(`[INFO] ${message}`, ...args);
        }
    },
    warn(message, ...args) {
        if (this.shouldLog('warn')) {
            console.warn(`[WARN] ${message}`, ...args);
        }
    },
    error(message, ...args) {
        if (this.shouldLog('error')) {
            console.error(`[ERROR] ${message}`, ...args);
        }
    },
    shouldLog(level) {
        const configuredLevel = (config.LOG_LEVEL || 'info');
        return levels[level] >= levels[configuredLevel];
    },
};
