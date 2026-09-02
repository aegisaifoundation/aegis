export var MessageDeliveryState;
(function (MessageDeliveryState) {
    MessageDeliveryState["CREATED"] = "CREATED";
    MessageDeliveryState["VALIDATED"] = "VALIDATED";
    MessageDeliveryState["ROUTING"] = "ROUTING";
    MessageDeliveryState["LOCAL_DELIVERY"] = "LOCAL_DELIVERY";
    MessageDeliveryState["REMOTE_DELIVERY"] = "REMOTE_DELIVERY";
    MessageDeliveryState["WAITING_FOR_ACK"] = "WAITING_FOR_ACK";
    MessageDeliveryState["ACKNOWLEDGED"] = "ACKNOWLEDGED";
    MessageDeliveryState["COMPLETED"] = "COMPLETED";
    MessageDeliveryState["FAILED"] = "FAILED";
    MessageDeliveryState["EXPIRED"] = "EXPIRED";
})(MessageDeliveryState || (MessageDeliveryState = {}));
export var MessagePriority;
(function (MessagePriority) {
    MessagePriority[MessagePriority["CRITICAL"] = 0] = "CRITICAL";
    MessagePriority[MessagePriority["HIGH"] = 1] = "HIGH";
    MessagePriority[MessagePriority["NORMAL"] = 2] = "NORMAL";
    MessagePriority[MessagePriority["LOW"] = 3] = "LOW";
})(MessagePriority || (MessagePriority = {}));
export var MessageRoute;
(function (MessageRoute) {
    MessageRoute["LOCAL"] = "LOCAL";
    MessageRoute["DIRECT"] = "DIRECT";
    MessageRoute["MULTICAST"] = "MULTICAST";
    MessageRoute["BROADCAST"] = "BROADCAST";
})(MessageRoute || (MessageRoute = {}));
export var MessageTypeCategory;
(function (MessageTypeCategory) {
    MessageTypeCategory["SYSTEM"] = "SYSTEM";
    MessageTypeCategory["NETWORK"] = "NETWORK";
    MessageTypeCategory["ENGINE"] = "ENGINE";
    MessageTypeCategory["REQUEST"] = "REQUEST";
    MessageTypeCategory["RESPONSE"] = "RESPONSE";
    MessageTypeCategory["EVENT"] = "EVENT";
    MessageTypeCategory["ACK"] = "ACK";
    MessageTypeCategory["ERROR"] = "ERROR";
})(MessageTypeCategory || (MessageTypeCategory = {}));
export var CommunicationErrorCode;
(function (CommunicationErrorCode) {
    CommunicationErrorCode["INVALID_MESSAGE"] = "INVALID_MESSAGE";
    CommunicationErrorCode["INVALID_NODE_ID"] = "INVALID_NODE_ID";
    CommunicationErrorCode["MESSAGE_EXPIRED"] = "MESSAGE_EXPIRED";
    CommunicationErrorCode["DUPLICATE_MESSAGE"] = "DUPLICATE_MESSAGE";
    CommunicationErrorCode["TARGET_UNAVAILABLE"] = "TARGET_UNAVAILABLE";
    CommunicationErrorCode["CONNECTION_UNAVAILABLE"] = "CONNECTION_UNAVAILABLE";
    CommunicationErrorCode["ENGINE_NOT_FOUND"] = "ENGINE_NOT_FOUND";
    CommunicationErrorCode["ENGINE_HANDLER_FAILED"] = "ENGINE_HANDLER_FAILED";
    CommunicationErrorCode["REQUEST_TIMEOUT"] = "REQUEST_TIMEOUT";
    CommunicationErrorCode["ACK_TIMEOUT"] = "ACK_TIMEOUT";
    CommunicationErrorCode["DELIVERY_FAILED"] = "DELIVERY_FAILED";
    CommunicationErrorCode["PROTOCOL_MISMATCH"] = "PROTOCOL_MISMATCH";
    CommunicationErrorCode["COMMUNICATION_CAPACITY_EXCEEDED"] = "COMMUNICATION_CAPACITY_EXCEEDED";
})(CommunicationErrorCode || (CommunicationErrorCode = {}));
export class CommunicationError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[AEGIS Communication] ${code}: ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'CommunicationError';
    }
}
