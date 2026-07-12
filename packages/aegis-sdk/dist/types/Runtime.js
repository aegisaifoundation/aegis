export var RuntimeLockState;
(function (RuntimeLockState) {
    RuntimeLockState["IDLE"] = "IDLE";
    RuntimeLockState["SWITCHING"] = "SWITCHING";
    RuntimeLockState["RECOVERING"] = "RECOVERING";
    RuntimeLockState["SHUTTING_DOWN"] = "SHUTTING_DOWN";
})(RuntimeLockState || (RuntimeLockState = {}));
export var BootMode;
(function (BootMode) {
    BootMode["RESTORE_PREVIOUS"] = "RESTORE_PREVIOUS";
    BootMode["SAFE_MODE"] = "SAFE_MODE";
    BootMode["RECOVERY_MODE"] = "RECOVERY_MODE";
    BootMode["CLEAN_BOOT"] = "CLEAN_BOOT";
})(BootMode || (BootMode = {}));
export var CheckoutStage;
(function (CheckoutStage) {
    CheckoutStage["VALIDATING"] = "VALIDATING";
    CheckoutStage["PERSISTING_CURRENT"] = "PERSISTING_CURRENT";
    CheckoutStage["UNMOUNTING"] = "UNMOUNTING";
    CheckoutStage["RESTORING_TARGET"] = "RESTORING_TARGET";
    CheckoutStage["VALIDATING_TARGET"] = "VALIDATING_TARGET";
    CheckoutStage["MOUNTING"] = "MOUNTING";
    CheckoutStage["FINALIZING"] = "FINALIZING";
    CheckoutStage["ROLLING_BACK"] = "ROLLING_BACK";
})(CheckoutStage || (CheckoutStage = {}));
export var RuntimeHealthStatus;
(function (RuntimeHealthStatus) {
    RuntimeHealthStatus["HEALTHY"] = "HEALTHY";
    RuntimeHealthStatus["DEGRADED"] = "DEGRADED";
    RuntimeHealthStatus["RECOVERING"] = "RECOVERING";
    RuntimeHealthStatus["CORRUPTED"] = "CORRUPTED";
    RuntimeHealthStatus["SAFE_MODE"] = "SAFE_MODE";
})(RuntimeHealthStatus || (RuntimeHealthStatus = {}));
export var RuntimeMode;
(function (RuntimeMode) {
    RuntimeMode["NORMAL"] = "NORMAL";
    RuntimeMode["MAINTENANCE"] = "MAINTENANCE";
    RuntimeMode["DIAGNOSTIC"] = "DIAGNOSTIC";
    RuntimeMode["FEDERATION"] = "FEDERATION";
    RuntimeMode["ISOLATED"] = "ISOLATED";
})(RuntimeMode || (RuntimeMode = {}));
export var SessionLifecycleState;
(function (SessionLifecycleState) {
    SessionLifecycleState["ACTIVE"] = "ACTIVE";
    SessionLifecycleState["INACTIVE"] = "INACTIVE";
    SessionLifecycleState["ARCHIVED"] = "ARCHIVED";
    SessionLifecycleState["RESTORED"] = "RESTORED";
    SessionLifecycleState["LOCKED"] = "LOCKED";
    SessionLifecycleState["CORRUPTED"] = "CORRUPTED";
    SessionLifecycleState["DELETED"] = "DELETED";
})(SessionLifecycleState || (SessionLifecycleState = {}));
export var MemoryLifecycleState;
(function (MemoryLifecycleState) {
    MemoryLifecycleState["ACTIVE"] = "ACTIVE";
    MemoryLifecycleState["STALE"] = "STALE";
    MemoryLifecycleState["ARCHIVED"] = "ARCHIVED";
    MemoryLifecycleState["EXPIRED"] = "EXPIRED";
    MemoryLifecycleState["CORRUPTED"] = "CORRUPTED";
    MemoryLifecycleState["LOCKED"] = "LOCKED";
    MemoryLifecycleState["REFINING"] = "REFINING";
    MemoryLifecycleState["DELETED"] = "DELETED";
})(MemoryLifecycleState || (MemoryLifecycleState = {}));
