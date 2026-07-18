import { EventEmitter } from 'events';
import { serviceRegistry } from '@aegis/runtime';
export class TrainingMonitor extends EventEmitter {
    activeMetrics = new Map();
    recordMetrics(jobId, metrics) {
        if (!this.activeMetrics.has(jobId)) {
            this.activeMetrics.set(jobId, []);
        }
        this.activeMetrics.get(jobId).push(metrics);
        // Emit event on global eventBus
        if (serviceRegistry.has('eventBus')) {
            const bus = serviceRegistry.get('eventBus');
            bus.emit('training.progress', {
                jobId,
                metrics
            });
        }
        this.emit('progress', jobId, metrics);
    }
    getMetrics(jobId) {
        return this.activeMetrics.get(jobId) || [];
    }
    clear(jobId) {
        this.activeMetrics.delete(jobId);
    }
}
export const trainingMonitor = new TrainingMonitor();
export default trainingMonitor;
//# sourceMappingURL=TrainingMonitor.js.map