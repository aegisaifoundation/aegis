export class MemoryConflictResolver {
    static instance = new MemoryConflictResolver();
    static getInstance() {
        return this.instance;
    }
    resolve(localState, remoteState) {
        const conflicts = [];
        const mergedState = { ...localState };
        const localTime = new Date(localState.lastUpdatedAt || 0).getTime();
        const remoteTime = new Date(remoteState.lastUpdatedAt || 0).getTime();
        const useRemote = (remoteState.checkpointVersion || 0) > (localState.checkpointVersion || 0) || remoteTime > localTime;
        if (localState.currentObjective !== remoteState.currentObjective && remoteState.currentObjective) {
            if (useRemote) {
                mergedState.currentObjective = remoteState.currentObjective;
            }
            else {
                conflicts.push('currentObjective');
            }
        }
        if (localState.goal !== remoteState.goal && remoteState.goal) {
            if (useRemote) {
                mergedState.goal = remoteState.goal;
            }
            else {
                conflicts.push('goal');
            }
        }
        const mergeLists = (listA = [], listB = []) => {
            return Array.from(new Set([...listA, ...listB]));
        };
        mergedState.activeTasks = mergeLists(localState.activeTasks, remoteState.activeTasks);
        mergedState.stableFacts = mergeLists(localState.stableFacts, remoteState.stableFacts);
        mergedState.tasks = mergeLists(localState.tasks, remoteState.tasks);
        const localPrefs = localState.preferences || {};
        const remotePrefs = remoteState.preferences || {};
        const mergedPrefs = { ...localPrefs };
        for (const key of Object.keys(remotePrefs)) {
            if (key in localPrefs) {
                if (Array.isArray(localPrefs[key]) && Array.isArray(remotePrefs[key])) {
                    mergedPrefs[key] = Array.from(new Set([...localPrefs[key], ...remotePrefs[key]]));
                }
                else if (localPrefs[key] !== remotePrefs[key]) {
                    if (useRemote) {
                        mergedPrefs[key] = remotePrefs[key];
                    }
                    else {
                        conflicts.push(`preferences.${key}`);
                    }
                }
            }
            else {
                mergedPrefs[key] = remotePrefs[key];
            }
        }
        mergedState.preferences = mergedPrefs;
        const localContext = localState.temporaryExecutionContext || {};
        const remoteContext = remoteState.temporaryExecutionContext || {};
        const mergedContext = { ...localContext };
        for (const key of Object.keys(remoteContext)) {
            if (key in localContext) {
                if (localContext[key] !== remoteContext[key]) {
                    if (useRemote) {
                        mergedContext[key] = remoteContext[key];
                    }
                    else {
                        conflicts.push(`temporaryExecutionContext.${key}`);
                    }
                }
            }
            else {
                mergedContext[key] = remoteContext[key];
            }
        }
        mergedState.temporaryExecutionContext = mergedContext;
        mergedState.checkpointVersion = Math.max(localState.checkpointVersion || 0, remoteState.checkpointVersion || 0) + 1;
        mergedState.lastUpdatedAt = new Date().toISOString();
        return {
            mergedState,
            hasConflicts: conflicts.length > 0,
            conflicts
        };
    }
}
export const memoryConflictResolver = MemoryConflictResolver.getInstance();
