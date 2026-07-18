import { EventEmitter } from 'events';
import { TrainingMetrics } from '../types/index.js';
export declare class TrainingMonitor extends EventEmitter {
    private activeMetrics;
    recordMetrics(jobId: string, metrics: TrainingMetrics): void;
    getMetrics(jobId: string): TrainingMetrics[];
    clear(jobId: string): void;
}
export declare const trainingMonitor: TrainingMonitor;
export default trainingMonitor;
