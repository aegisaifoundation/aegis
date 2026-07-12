import { IRuntimeContext_v1 } from '@aegis/sdk';
import { LogFormatter } from './LogFormatter.js';

export class NativeLogger {
  private context: IRuntimeContext_v1 | null = null;
  private logPrefix = 'distributed-intelligence';

  constructor() {}

  setContext(context: IRuntimeContext_v1): void {
    this.context = context;
  }

  info(msg: string, metadata?: Record<string, any>): void {
    this.log('info', msg, metadata);
  }

  warn(msg: string, metadata?: Record<string, any>): void {
    this.log('warn', msg, metadata);
  }

  error(msg: string, metadata?: Record<string, any>): void {
    this.log('error', msg, metadata);
  }

  debug(msg: string, metadata?: Record<string, any>): void {
    this.log('debug', msg, metadata);
  }

  private log(level: 'info' | 'warn' | 'error' | 'debug', msg: string, metadata?: Record<string, any>): void {
    const formatted = LogFormatter.format(msg, metadata);
    const logger = this.context?.getLogger();

    if (logger) {
      const logMethod = logger[level] ? level : 'info';
      logger[logMethod](formatted, this.logPrefix);
    } else {
      const consoleMethod = level === 'debug' ? 'log' : level;
      console[consoleMethod](`[${this.logPrefix.toUpperCase()}] ${formatted}`);
    }
  }
}
export default NativeLogger;
