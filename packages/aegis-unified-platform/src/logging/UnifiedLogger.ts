import { serviceRegistry } from '@aegis/runtime';

export interface LogContext {
  correlationId?: string;
  sessionId?: string;
  nodeId?: string;
  [key: string]: any;
}

export class UnifiedLogger {
  private static getRuntimeLogger(): any {
    if (serviceRegistry.has('logger')) {
      return serviceRegistry.get<any>('logger');
    }
    return console;
  }

  static info(message: string, engineId: string, context?: LogContext): void {
    const logger = this.getRuntimeLogger();
    const payload = this.formatPayload(message, context);
    if (typeof logger.log === 'function') {
      logger.log('info', message, engineId, payload);
    } else {
      console.log(`[INFO] [${engineId}] ${message}`, JSON.stringify(payload));
    }
  }

  static warn(message: string, engineId: string, context?: LogContext): void {
    const logger = this.getRuntimeLogger();
    const payload = this.formatPayload(message, context);
    if (typeof logger.log === 'function') {
      logger.log('warn', message, engineId, payload);
    } else {
      console.warn(`[WARN] [${engineId}] ${message}`, JSON.stringify(payload));
    }
  }

  static error(message: string, engineId: string, error?: any, context?: LogContext): void {
    const logger = this.getRuntimeLogger();
    const payload = this.formatPayload(message, {
      ...context,
      error: error?.message || String(error),
      trace: error?.stack
    });
    if (typeof logger.log === 'function') {
      logger.log('error', message, engineId, payload);
    } else {
      console.error(`[ERROR] [${engineId}] ${message}`, JSON.stringify(payload));
    }
  }

  private static formatPayload(message: string, context?: LogContext): Record<string, any> {
    return {
      timestamp: new Date().toISOString(),
      correlationId: context?.correlationId || 'corr-none',
      sessionId: context?.sessionId || 'sess-none',
      nodeId: context?.nodeId || 'node-default',
      ...context
    };
  }
}
