import { EventEmitter } from 'events';
import { serviceRegistry } from '@aegis/runtime';
import { TrainingMetrics, TrainingJob } from '../types/index.js';

export class TrainingMonitor extends EventEmitter {
  private activeMetrics = new Map<string, TrainingMetrics[]>();

  recordMetrics(jobId: string, metrics: TrainingMetrics) {
    if (!this.activeMetrics.has(jobId)) {
      this.activeMetrics.set(jobId, []);
    }
    this.activeMetrics.get(jobId)!.push(metrics);

    // Emit event on global eventBus
    if (serviceRegistry.has('eventBus')) {
      const bus = serviceRegistry.get<any>('eventBus');
      bus.emit('training.progress', {
        jobId,
        metrics
      });
    }

    this.emit('progress', jobId, metrics);
  }

  getMetrics(jobId: string): TrainingMetrics[] {
    return this.activeMetrics.get(jobId) || [];
  }

  clear(jobId: string) {
    this.activeMetrics.delete(jobId);
  }
}

export const trainingMonitor = new TrainingMonitor();
export default trainingMonitor;
