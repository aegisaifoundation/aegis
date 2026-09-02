export var TaskState;
(function (TaskState) {
    TaskState["CREATED"] = "CREATED";
    TaskState["QUEUED"] = "QUEUED";
    TaskState["SCHEDULING"] = "SCHEDULING";
    TaskState["ASSIGNED"] = "ASSIGNED";
    TaskState["ACCEPTED"] = "ACCEPTED";
    TaskState["RUNNING"] = "RUNNING";
    TaskState["COMPLETED"] = "COMPLETED";
    TaskState["FAILED"] = "FAILED";
    TaskState["CANCELLED"] = "CANCELLED";
    TaskState["EXPIRED"] = "EXPIRED";
})(TaskState || (TaskState = {}));
export var TaskPriority;
(function (TaskPriority) {
    TaskPriority[TaskPriority["CRITICAL"] = 0] = "CRITICAL";
    TaskPriority[TaskPriority["HIGH"] = 1] = "HIGH";
    TaskPriority[TaskPriority["NORMAL"] = 2] = "NORMAL";
    TaskPriority[TaskPriority["LOW"] = 3] = "LOW";
})(TaskPriority || (TaskPriority = {}));
export var CoordinationErrorCode;
(function (CoordinationErrorCode) {
    CoordinationErrorCode["INVALID_TASK"] = "INVALID_TASK";
    CoordinationErrorCode["INVALID_TASK_STATE"] = "INVALID_TASK_STATE";
    CoordinationErrorCode["TASK_NOT_FOUND"] = "TASK_NOT_FOUND";
    CoordinationErrorCode["TASK_EXPIRED"] = "TASK_EXPIRED";
    CoordinationErrorCode["TASK_NOT_SUPPORTED"] = "TASK_NOT_SUPPORTED";
    CoordinationErrorCode["TASK_REQUIREMENTS_NOT_MET"] = "TASK_REQUIREMENTS_NOT_MET";
    CoordinationErrorCode["NO_ELIGIBLE_NODE"] = "NO_ELIGIBLE_NODE";
    CoordinationErrorCode["TASK_ASSIGNMENT_TIMEOUT"] = "TASK_ASSIGNMENT_TIMEOUT";
    CoordinationErrorCode["TASK_REJECTED"] = "TASK_REJECTED";
    CoordinationErrorCode["TASK_EXECUTION_FAILED"] = "TASK_EXECUTION_FAILED";
    CoordinationErrorCode["TASK_EXECUTION_TIMEOUT"] = "TASK_EXECUTION_TIMEOUT";
    CoordinationErrorCode["TASK_LEASE_EXPIRED"] = "TASK_LEASE_EXPIRED";
    CoordinationErrorCode["TASK_CANCELLED"] = "TASK_CANCELLED";
    CoordinationErrorCode["TASK_CAPACITY_EXCEEDED"] = "TASK_CAPACITY_EXCEEDED";
    CoordinationErrorCode["TASK_DUPLICATE_EXECUTION"] = "TASK_DUPLICATE_EXECUTION";
})(CoordinationErrorCode || (CoordinationErrorCode = {}));
export class CoordinationError extends Error {
    code;
    details;
    constructor(code, message, details) {
        super(`[AEGIS Coordination] ${code}: ${message}`);
        this.code = code;
        this.details = details;
        this.name = 'CoordinationError';
    }
}
