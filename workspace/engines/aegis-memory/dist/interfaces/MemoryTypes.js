import { RuntimeLockState, BootMode, CheckoutStage, RuntimeHealthStatus, RuntimeMode, MemoryLifecycleState, SessionLifecycleState } from '@aegis/sdk';
export { RuntimeLockState, BootMode, CheckoutStage, RuntimeHealthStatus, RuntimeMode, MemoryLifecycleState, SessionLifecycleState };
export var MemoryType;
(function (MemoryType) {
    MemoryType["SESSION"] = "SESSION";
    MemoryType["WORKING"] = "WORKING";
})(MemoryType || (MemoryType = {}));
export var SessionRestoreMode;
(function (SessionRestoreMode) {
    SessionRestoreMode["COLD_RESTORE"] = "COLD_RESTORE";
    SessionRestoreMode["WARM_RESTORE"] = "WARM_RESTORE";
    SessionRestoreMode["SAFE_RESTORE"] = "SAFE_RESTORE";
})(SessionRestoreMode || (SessionRestoreMode = {}));
export var MountIntent;
(function (MountIntent) {
    MountIntent["USER_RESTORE"] = "USER_RESTORE";
    MountIntent["AUTONOMOUS_RESTORE"] = "AUTONOMOUS_RESTORE";
    MountIntent["RECOVERY_RESTORE"] = "RECOVERY_RESTORE";
    MountIntent["REPLAY_RESTORE"] = "REPLAY_RESTORE";
    MountIntent["FEDERATION_RESTORE"] = "FEDERATION_RESTORE";
})(MountIntent || (MountIntent = {}));
