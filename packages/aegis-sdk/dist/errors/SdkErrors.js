export class AegisError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}
export class RuntimeUnavailable extends AegisError {
    constructor(message = 'The AEGIS Runtime microkernel is not responding.') {
        super('RuntimeUnavailable', message);
    }
}
export class NodeOffline extends AegisError {
    constructor(message = 'The target swarm node is offline or unreachable.') {
        super('NodeOffline', message);
    }
}
export class PackageNotInstalled extends AegisError {
    constructor(packageId) {
        super('PackageNotInstalled', `The required engine package "${packageId}" is not installed.`);
    }
}
export class EngineUnavailable extends AegisError {
    constructor(engineId) {
        super('EngineUnavailable', `The underlying engine service "${engineId}" is unavailable or disabled.`);
    }
}
export class PolicyViolation extends AegisError {
    constructor(message = 'Action rejected due to active node/network policy rule.') {
        super('PolicyViolation', message);
    }
}
export class PermissionDenied extends AegisError {
    constructor(message = 'Insufficient security credentials to perform operation.') {
        super('PermissionDenied', message);
    }
}
export class DatasetValidationFailed extends AegisError {
    constructor(message = 'Dataset validation schema verification failed.') {
        super('DatasetValidationFailed', message);
    }
}
export class TrainingFailed extends AegisError {
    constructor(message = 'Local optimization or training job execution failed.') {
        super('TrainingFailed', message);
    }
}
export class InferenceFailed extends AegisError {
    constructor(message = 'Model generation or embedding inference request failed.') {
        super('InferenceFailed', message);
    }
}
export class NetworkTimeout extends AegisError {
    constructor(message = 'Request to peer node timed out.') {
        super('NetworkTimeout', message);
    }
}
export class ConsensusFailed extends AegisError {
    constructor(message = 'Swarm consensus agreement failed.') {
        super('ConsensusFailed', message);
    }
}
export class FeatureUnavailable extends AegisError {
    constructor(feature) {
        super('FeatureUnavailable', `The requested capability "${feature}" is unavailable due to absent or disabled engines.`);
    }
}
export function mapErrorCodeToException(code, message) {
    switch (code) {
        case 'RuntimeUnavailable': return new RuntimeUnavailable(message);
        case 'NodeOffline': return new NodeOffline(message);
        case 'PackageNotInstalled': return new PackageNotInstalled(message);
        case 'EngineUnavailable': return new EngineUnavailable(message);
        case 'PolicyViolation': return new PolicyViolation(message);
        case 'PermissionDenied': return new PermissionDenied(message);
        case 'DatasetValidationFailed': return new DatasetValidationFailed(message);
        case 'TrainingFailed': return new TrainingFailed(message);
        case 'InferenceFailed': return new InferenceFailed(message);
        case 'NetworkTimeout': return new NetworkTimeout(message);
        case 'ConsensusFailed': return new ConsensusFailed(message);
        case 'FeatureUnavailable': return new FeatureUnavailable(message);
        default: return new AegisError(code, message);
    }
}
