// ipc-reload.mjs — Trigger Runtime hot-reload via IPC Named Pipe
import net from 'net';

const PIPE = '\\\\.\\pipe\\aegis_kernel_v1';

const sock = net.createConnection(PIPE, () => {
  console.log('[IPC] Connected. Sending reload command...');
  sock.write(JSON.stringify({ version: '1.0.0', requestId: 'reload-die', command: 'reload', payload: {} }));
});

let buf = '';
sock.on('data', d => { buf += d.toString(); });
sock.on('end', () => {
  try {
    const resp = JSON.parse(buf);
    console.log('[IPC] Response:', JSON.stringify(resp, null, 2));
  } catch (e) {
    console.log('[IPC] Raw:', buf);
  }
});
sock.on('error', e => {
  console.error('[IPC] Error:', e.message);
  process.exit(1);
});
