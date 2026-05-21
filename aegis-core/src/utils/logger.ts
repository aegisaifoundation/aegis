import { config } from '../config/index.js';

const levels = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export const logger = {
  debug(message: string, ...args: any[]) {
    if (this.shouldLog('debug')) {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  },

  info(message: string, ...args: any[]) {
    if (this.shouldLog('info')) {
      console.log(`[INFO] ${message}`, ...args);
    }
  },

  warn(message: string, ...args: any[]) {
    if (this.shouldLog('warn')) {
      console.warn(`[WARN] ${message}`, ...args);
    }
  },

  error(message: string, ...args: any[]) {
    if (this.shouldLog('error')) {
      console.error(`[ERROR] ${message}`, ...args);
    }
  },

  shouldLog(level: LogLevel): boolean {
    const configuredLevel = (config.LOG_LEVEL || 'info') as LogLevel;
    return levels[level] >= levels[configuredLevel];
  },
};
