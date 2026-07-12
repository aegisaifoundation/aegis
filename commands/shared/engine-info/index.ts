import net from 'net';
import path from 'path';

const CURRENT_IPC_VERSION = '1.0.0';

function formatUptime(ms: number | undefined): string {
  if (!ms) return '—';
  const secs = Math.floor(ms / 1000);
  const mins = Math.floor(secs / 60);
  const hrs  = Math.floor(mins / 60);
  if (hrs > 0) return `${hrs}h ${mins % 60}m`;
  if (mins > 0) return `${mins}m ${secs % 60}s`;
  return `${secs}s`;
}

async function sendIpc(workspacePath: string, command: string, payload: any = {}): Promise<any> {
  const ipcFile = process.platform === 'win32'
    ? path.join(workspacePath, 'runtime', 'ipc.pipe')
    : path.join(workspacePath, 'runtime', 'ipc.sock');

  return new Promise((resolve, reject) => {
    const socket = net.createConnection(ipcFile, () => {
      socket.write(JSON.stringify({ version: CURRENT_IPC_VERSION, requestId: `req-${Date.now()}`, command, payload }));
    });
    let buf = '';
    socket.on('data', (d) => { buf += d.toString(); });
    socket.on('end', () => {
      try { resolve(JSON.parse(buf)); } catch { reject(new Error('Invalid IPC response')); }
    });
    socket.on('error', reject);
  });
}

export default {
  name: 'engine info',
  description: 'Show detailed runtime information for a specific engine.',

  async execute(input: string, context: any): Promise<string> {
    const engineId = input.trim();
    if (!engineId) {
      return '  Usage: engine info <engine-id>\n  Example: engine info distributed-intelligence';
    }

    const workspacePath = context?.getWorkspacePath?.() ?? process.cwd();

    let resp: any;
    try {
      resp = await sendIpc(workspacePath, 'engineInfo', { engineId });
    } catch (err: any) {
      return `❌ Could not connect to Runtime IPC channel: ${err.message}`;
    }

    if (!resp.result?.success) {
      return `❌ ${resp.error ?? 'Engine not found or not loaded.'}`;
    }

    const { metadata, health, state, pid, uptimeMs, restartCount, startedAt } = resp.result.info;

    const healthEmoji = health.status === 'HEALTHY' ? '✅' : health.status === 'DEGRADED' ? '⚠️' : '❌';

    return [
      '',
      `  ═══════════════════════════════════════════`,
      `  Engine: ${metadata.displayName}`,
      `  ═══════════════════════════════════════════`,
      `  ID             ${metadata.id}`,
      `  Version        ${metadata.version}`,
      `  Kernel API     ${metadata.kernelApiVersion}`,
      `  Priority       ${metadata.priority}`,
      `  Auto-Start     ${metadata.autoStart}`,
      `  Singleton      ${metadata.singleton}`,
      `  Permissions    ${(metadata.permissions ?? []).join(', ') || '—'}`,
      `  Dependencies   ${(metadata.dependencies ?? []).join(', ') || 'none'}`,
      `  ───────────────────────────────────────────`,
      `  State          ${state}`,
      `  Health         ${healthEmoji} ${health.status}  (${health.latencyMs}ms)`,
      health.message ? `  Health Msg     ${health.message}` : null,
      `  PID            ${pid ?? '—'}`,
      `  Uptime         ${formatUptime(uptimeMs)}`,
      `  Started At     ${startedAt ? new Date(startedAt).toLocaleString() : '—'}`,
      `  Restarts       ${restartCount}`,
      '',
    ].filter(l => l !== null).join('\n');
  }
};
