import { Container } from '../di/Container.js';
import { IKernelAPI_v1, KernelStatus, EventEnvelope } from '@aegis/sdk';
export declare class KernelAPI implements IKernelAPI_v1 {
    private container;
    readonly version = "1.0.0";
    private _status;
    constructor(container: Container);
    get status(): KernelStatus;
    setStatus(status: KernelStatus): void;
    resolve<T>(serviceName: string): T;
    publishEvent(envelope: EventEnvelope): void;
    scheduleTask(task: any): string;
    shutdown(): Promise<void>;
}
export declare class Bootloader {
    static boot(): Promise<KernelAPI>;
}
