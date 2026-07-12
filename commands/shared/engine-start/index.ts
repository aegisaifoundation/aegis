import net from 'net';
import path from 'path';

const CURRENT_IPC_VERSION = '1.0.0';

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
  name: 'engine start',
  description: 'Start a registered engine by its ID.',

  async execute(input: string, context: any): Promise<string> {
    const engineId = input.trim();
    if (!engineId) {
      return '  Usage: engine start <engine-id>\n  Example: engine start distributed-intelligence';
    }

    const workspacePath = context?.getWorkspacePath?.() ?? process.cwd();

    let resp: any;
    try {
      resp = await sendIpc(workspacePath, 'startEngine', { engineId });
    } catch (err: any) {
      return `❌ Could not connect to Runtime IPC channel: ${err.message}`;
    }

    if (resp.result?.success) {
      return `✅ ${resp.result.message}`;
    }
    return `❌ ${resp.error ?? 'Failed to start engine.'}`;
  }
};
