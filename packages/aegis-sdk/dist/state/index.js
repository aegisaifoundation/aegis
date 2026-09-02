export var AegisStateScope;
(function (AegisStateScope) {
    AegisStateScope["LOCAL"] = "LOCAL";
    AegisStateScope["NODE"] = "NODE";
    AegisStateScope["DISTRIBUTED"] = "DISTRIBUTED";
})(AegisStateScope || (AegisStateScope = {}));
export var StateSyncStatus;
(function (StateSyncStatus) {
    StateSyncStatus["IDLE"] = "IDLE";
    StateSyncStatus["SYNCING"] = "SYNCING";
    StateSyncStatus["SYNCHRONIZED"] = "SYNCHRONIZED";
    StateSyncStatus["DEGRADED"] = "DEGRADED";
    StateSyncStatus["FAILED"] = "FAILED";
})(StateSyncStatus || (StateSyncStatus = {}));
export var StateConflictStrategy;
(function (StateConflictStrategy) {
    StateConflictStrategy["REJECT"] = "REJECT";
    StateConflictStrategy["LAST_WRITE_WINS"] = "LAST_WRITE_WINS";
    StateConflictStrategy["APPLICATION_DEFINED"] = "APPLICATION_DEFINED";
})(StateConflictStrategy || (StateConflictStrategy = {}));
export var StateReplicationStrategy;
(function (StateReplicationStrategy) {
    StateReplicationStrategy["NONE"] = "NONE";
    StateReplicationStrategy["SELECTED_NODES"] = "SELECTED_NODES";
    StateReplicationStrategy["BEST_EFFORT"] = "BEST_EFFORT";
})(StateReplicationStrategy || (StateReplicationStrategy = {}));
export var StateWriteConsistency;
(function (StateWriteConsistency) {
    StateWriteConsistency["LOCAL_ONLY"] = "LOCAL_ONLY";
    StateWriteConsistency["BEST_EFFORT"] = "BEST_EFFORT";
    StateWriteConsistency["REQUIRE_TARGET_ACK"] = "REQUIRE_TARGET_ACK";
})(StateWriteConsistency || (StateWriteConsistency = {}));
export var StateErrorCode;
(function (StateErrorCode) {
    StateErrorCode["INVALID_STATE_KEY"] = "INVALID_STATE_KEY";
    StateErrorCode["INVALID_STATE_RECORD"] = "INVALID_STATE_RECORD";
    StateErrorCode["STATE_NOT_FOUND"] = "STATE_NOT_FOUND";
    StateErrorCode["STATE_ALREADY_EXISTS"] = "STATE_ALREADY_EXISTS";
    StateErrorCode["STATE_VERSION_CONFLICT"] = "STATE_VERSION_CONFLICT";
    StateErrorCode["STATE_CONFLICT"] = "STATE_CONFLICT";
    StateErrorCode["STATE_EXPIRED"] = "STATE_EXPIRED";
    StateErrorCode["STATE_STORAGE_FAILURE"] = "STATE_STORAGE_FAILURE";
    StateErrorCode["STATE_SERIALIZATION_FAILURE"] = "STATE_SERIALIZATION_FAILURE";
    StateErrorCode["STATE_DESERIALIZATION_FAILURE"] = "STATE_DESERIALIZATION_FAILURE";
    StateErrorCode["STATE_REPLICATION_FAILURE"] = "STATE_REPLICATION_FAILURE";
    StateErrorCode["STATE_SYNC_FAILURE"] = "STATE_SYNC_FAILURE";
    StateErrorCode["STATE_SCOPE_VIOLATION"] = "STATE_SCOPE_VIOLATION";
    StateErrorCode["STATE_NOT_PERSISTENT"] = "STATE_NOT_PERSISTENT";
    StateErrorCode["STATE_SIZE_EXCEEDED"] = "STATE_SIZE_EXCEEDED";
    StateErrorCode["INVALID_REPLICATION_POLICY"] = "INVALID_REPLICATION_POLICY";
})(StateErrorCode || (StateErrorCode = {}));
export class StateError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[AEGIS State] ${code}: ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'StateError';
    }
}
