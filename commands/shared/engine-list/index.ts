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

function padEnd(s: string, len: number): string {
  return s.length >= len ? s : s + ' '.repeat(len - s.length);
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
  name: 'engine list',
  description: 'List all registered engines with their runtime status.',

  async execute(_input: string, context: any): Promise<string> {
    const workspacePath = context?.getWorkspacePath?.() ?? process.cwd();

    let resp: any;
    try {
      resp = await sendIpc(workspacePath, 'status');
    } catch (err: any) {
      return `❌ Could not connect to Runtime IPC channel: ${err.message}\n   Is the Runtime running? (npm run start in packages/aegis-runtime)`;
    }

    if (!resp.result?.success) {
      return `❌ IPC error: ${resp.error ?? 'Unknown error'}`;
    }

    const engines: any[] = resp.result.engines ?? [];
    if (engines.length === 0) {
      return '  No engines are currently registered.';
    }

    const header = [
      padEnd('ID', 36),
      padEnd('Display Name', 34),
      padEnd('Version', 10),
      padEnd('State', 12),
      padEnd('PID', 8),
      'Uptime',
    ].join('  ');

    const divider = '─'.repeat(header.length);

    const rows = engines.map((e: any) => [
      padEnd(e.id ?? '—', 36),
      padEnd(e.displayName ?? '—', 34),
      padEnd(e.version ?? '—', 10),
      padEnd(e.state ?? 'UNKNOWN', 12),
      padEnd(String(e.pid ?? '—'), 8),
      formatUptime(e.uptimeMs),
    ].join('  '));

    return [
      '',
      `  AEGIS Engine Registry`,
      `  ${divider}`,
      `  ${header}`,
      `  ${divider}`,
      ...rows.map(r => `  ${r}`),
      `  ${divider}`,
      `  ${engines.length} engine(s) registered.`,
      '',
    ].join('\n');
  }
};
