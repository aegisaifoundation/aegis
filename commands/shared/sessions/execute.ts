import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
import { runtimeSessionManager } from '../../../aegis-core/src/runtime/RuntimeSessionManager.js';
import { SessionLifecycleState } from '../../../aegis-core/src/memory/interfaces/MemoryTypes.js';

export default async function execute(input: string, context: CommandContext): Promise<CommandResult> {
  try {
    const list = await runtimeSessionManager.listSessions();
    const args = input.trim().split(/\s+/).filter(Boolean);

    const activeFilter = args.includes('--active');
    const archivedFilter = args.includes('--archived');
    const deletedFilter = args.includes('--deleted');

    let tagFilter: string | null = null;
    const tagIdx = args.indexOf('--tag');
    if (tagIdx >= 0 && args[tagIdx + 1]) {
      tagFilter = args[tagIdx + 1];
    }

    let importanceFilter: number | null = null;
    const impIdx = args.indexOf('--importance');
    if (impIdx >= 0 && args[impIdx + 1]) {
      const rawImp = args[impIdx + 1].replace(/[<>=\s]/g, '');
      importanceFilter = parseFloat(rawImp);
    }

    let sortKey: string | null = null;
    const sortIdx = args.indexOf('--sort');
    if (sortIdx >= 0 && args[sortIdx + 1]) {
      sortKey = args[sortIdx + 1];
    }

    // Filter
    let filtered = [...list];

    if (activeFilter) {
      filtered = filtered.filter(s => s.lifecycleState === SessionLifecycleState.ACTIVE);
    }
    if (archivedFilter) {
      filtered = filtered.filter(s => s.lifecycleState === SessionLifecycleState.ARCHIVED);
    }
    if (deletedFilter) {
      filtered = filtered.filter(s => s.lifecycleState === SessionLifecycleState.DELETED);
    }
    if (tagFilter) {
      filtered = filtered.filter(s => s.tags && s.tags.includes(tagFilter!));
    }
    if (importanceFilter !== null) {
      filtered = filtered.filter(s => s.sessionImportance !== undefined && s.sessionImportance >= importanceFilter!);
    }

    // Sort
    if (sortKey) {
      filtered.sort((a, b) => {
        if (sortKey === 'updated') {
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        } else if (sortKey === 'created') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sortKey === 'mounted') {
          return new Date(b.lastMountedAt || 0).getTime() - new Date(a.lastMountedAt || 0).getTime();
        } else if (sortKey === 'accessed') {
          return new Date(b.lastAccessedAt || 0).getTime() - new Date(a.lastAccessedAt || 0).getTime();
        } else if (sortKey === 'importance') {
          return (b.sessionImportance || 0) - (a.sessionImportance || 0);
        }
        return 0;
      });
    }

    const outputLines = filtered.map(s => {
      const activeMark = s.lifecycleState === SessionLifecycleState.ACTIVE ? ' [*] ' : ' [ ] ';
      return `${activeMark}ID: ${s.sessionId} | State: ${s.lifecycleState} | Tags: [${(s.tags || []).join(', ')}] | Importance: ${s.sessionImportance || 0.0} | Updated: ${s.updatedAt}`;
    });

    return {
      success: true,
      message: outputLines.length > 0 
        ? `Found ${outputLines.length} session(s):\n${outputLines.join('\n')}`
        : 'No matching sessions found.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Failed to list sessions: ${err.message}`
    };
  }
}
