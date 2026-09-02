export declare enum MessageDeliveryState {
    CREATED = "CREATED",
    VALIDATED = "VALIDATED",
    ROUTING = "ROUTING",
    LOCAL_DELIVERY = "LOCAL_DELIVERY",
    REMOTE_DELIVERY = "REMOTE_DELIVERY",
    WAITING_FOR_ACK = "WAITING_FOR_ACK",
    ACKNOWLEDGED = "ACKNOWLEDGED",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    EXPIRED = "EXPIRED"
}
export declare enum MessagePriority {
    CRITICAL = 0,
    HIGH = 1,
    NORMAL = 2,
    LOW = 3
}
export declare enum MessageRoute {
    LOCAL = "LOCAL",
    DIRECT = "DIRECT",
    MULTICAST = "MULTICAST",
    BROADCAST = "BROADCAST"
}
export declare enum MessageTypeCategory {
    SYSTEM = "SYSTEM",
    NETWORK = "NETWORK",
    ENGINE = "ENGINE",
    REQUEST = "REQUEST",
    RESPONSE = "RESPONSE",
    EVENT = "EVENT",
    ACK = "ACK",
    ERROR = "ERROR"
}
export interface IAegisMessageEnvelope<T = unknown> {
    protocolVersion: string;
    messageId: string;
    correlationId?: string;
    acknowledgedMessageId?: string;
    messageType: string;
    senderNodeId: string;
    targetNodeId?: string;
    sourceEngine?: string;
    targetEngine?: string;
    route?: MessageRoute;
    timestamp: number;
    ttl?: number;
    expiresAt?: number;
    priority?: MessagePriority;
    requiresAck?: boolean;
    signature?: string;
    payload: T;
}
export declare enum CommunicationErrorCode {
    INVALID_MESSAGE = "INVALID_MESSAGE",
    INVALID_NODE_ID = "INVALID_NODE_ID",
    MESSAGE_EXPIRED = "MESSAGE_EXPIRED",
    DUPLICATE_MESSAGE = "DUPLICATE_MESSAGE",
    TARGET_UNAVAILABLE = "TARGET_UNAVAILABLE",
    CONNECTION_UNAVAILABLE = "CONNECTION_UNAVAILABLE",
    ENGINE_NOT_FOUND = "ENGINE_NOT_FOUND",
    ENGINE_HANDLER_FAILED = "ENGINE_HANDLER_FAILED",
    REQUEST_TIMEOUT = "REQUEST_TIMEOUT",
    ACK_TIMEOUT = "ACK_TIMEOUT",
    DELIVERY_FAILED = "DELIVERY_FAILED",
    PROTOCOL_MISMATCH = "PROTOCOL_MISMATCH",
    COMMUNICATION_CAPACITY_EXCEEDED = "COMMUNICATION_CAPACITY_EXCEEDED"
}
export declare class CommunicationError extends Error {
    readonly code: CommunicationErrorCode;
    readonly details?: Record<string, any> | undefined;
    constructor(code: CommunicationErrorCode, message: string, details?: Record<string, any> | undefined);
}
