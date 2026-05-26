import { runtimeStateManager } from '../../../aegis-core/src/runtime/RuntimeStateManager.js';
import { memoryGateway } from '../../../aegis-core/src/memory/MemoryGateway.js';
export default async function execute(input, context) {
    try {
        const state = await runtimeStateManager.loadState();
        const activeId = state.activeSessionId;
        if (!activeId) {
            return {
                success: true,
                message: 'No active session is currently mounted.'
            };
        }
        const meta = await memoryGateway.loadSession(activeId, 'user');
        let sessionMem = '';
        let workingMem = '';
        let historyCount = 0;
        try {
            sessionMem = await memoryGateway.getSessionMemory(activeId, 'user');
        }
        catch { }
        try {
            workingMem = await memoryGateway.getWorkingMemory(activeId, 'user');
        }
        catch { }
        try {
            const history = await memoryGateway.getHistory(activeId, 'user');
            historyCount = history.length;
        }
        catch { }
        const lines = [
            `=== Active Cognitive Session ===`,
            `Session ID:   ${meta.sessionId}`,
            `Display Name: ${meta.displayName || 'None'}`,
            `Description:  ${meta.description || 'None'}`,
            `State:        ${meta.lifecycleState}`,
            `Importance:   ${meta.sessionImportance !== undefined ? meta.sessionImportance : '0.0'}`,
            `Tags:         [${(meta.tags || []).join(', ')}]`,
            ``,
            `=== Runtime Context ===`,
            `Runtime ID:   ${state.runtimeId}`,
            `Cluster ID:   ${state.runtimeClusterId}`,
            `Epoch:        ${state.runtimeEpoch}`,
            `Generation:   ${state.mountGeneration}`,
            `Health:       ${state.runtimeHealthStatus}`,
            `Mode:         ${state.runtimeMode}`,
            ``,
            `=== Cognitive Workflows & Tasks ===`,
            `Active Workflows: [${(meta.activeWorkflows || []).join(', ')}]`,
            `Pending Tasks:    [${(meta.pendingTasks || []).join(', ')}]`,
            `Cognitive Load:   ${meta.sessionCognitiveLoad !== undefined ? meta.sessionCognitiveLoad : 'N/A'}`,
            `Semantic Drift:   ${meta.semanticDriftScore !== undefined ? meta.semanticDriftScore : 'N/A'}`,
            ``,
            `=== Memory Metrics ===`,
            `Session Memory size: ${sessionMem.length} chars (${sessionMem.split(/\s+/).filter(Boolean).length} words)`,
            `Working Memory size: ${workingMem.length} chars (${workingMem.split(/\s+/).filter(Boolean).length} words)`,
            `History Messages:    ${historyCount}`
        ];
        return {
            success: true,
            message: lines.join('\n')
        };
    }
    catch (err) {
        return {
            success: false,
            message: `Failed to retrieve current session information: ${err.message}`
        };
    }
}
