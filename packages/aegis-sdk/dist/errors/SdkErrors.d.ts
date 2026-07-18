export declare class AegisError extends Error {
    code: string;
    constructor(code: string, message: string);
}
export declare class RuntimeUnavailable extends AegisError {
    constructor(message?: string);
}
export declare class NodeOffline extends AegisError {
    constructor(message?: string);
}
export declare class PackageNotInstalled extends AegisError {
    constructor(packageId: string);
}
export declare class EngineUnavailable extends AegisError {
    constructor(engineId: string);
}
export declare class PolicyViolation extends AegisError {
    constructor(message?: string);
}
export declare class PermissionDenied extends AegisError {
    constructor(message?: string);
}
export declare class DatasetValidationFailed extends AegisError {
    constructor(message?: string);
}
export declare class TrainingFailed extends AegisError {
    constructor(message?: string);
}
export declare class InferenceFailed extends AegisError {
    constructor(message?: string);
}
export declare class NetworkTimeout extends AegisError {
    constructor(message?: string);
}
export declare class ConsensusFailed extends AegisError {
    constructor(message?: string);
}
export declare class FeatureUnavailable extends AegisError {
    constructor(feature: string);
}
export declare function mapErrorCodeToException(code: string, message: string): AegisError;
