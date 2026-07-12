export var MessageType;
(function (MessageType) {
    MessageType["READY"] = "READY";
    MessageType["HEARTBEAT"] = "HEARTBEAT";
    MessageType["LOG"] = "LOG";
    MessageType["WARNING"] = "WARNING";
    MessageType["ERROR"] = "ERROR";
    MessageType["METRICS"] = "METRICS";
    MessageType["CAPABILITIES"] = "CAPABILITIES";
    MessageType["CONFIG"] = "CONFIG";
    MessageType["EVENT"] = "EVENT";
    MessageType["REQUEST"] = "REQUEST";
    MessageType["RESPONSE"] = "RESPONSE";
    MessageType["SHUTDOWN"] = "SHUTDOWN";
    MessageType["PING"] = "PING";
    MessageType["PONG"] = "PONG";
})(MessageType || (MessageType = {}));
//# sourceMappingURL=MessageTypes.js.map