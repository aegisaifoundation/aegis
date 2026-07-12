// ipc-status.mjs — Query Runtime engine status via IPC
import net from 'net';

const PIPE = '\\\\.\\pipe\\aegis_kernel_v1';

const sock = net.createConnection(PIPE, () => {
  sock.write(JSON.stringify({ version: '1.0.0', requestId: 'status-1', command: 'status', payload: {} }));
});

let buf = '';
sock.on('data', d => { buf += d.toString(); });
sock.on('end', () => {
  const resp = JSON.parse(buf);
  if (!resp.result?.success) { console.error('Error:', resp.error); process.exit(1); }
  const engines = resp.result.engines;
  console.log(`\n  AEGIS Engine Status — ${engines.length} engine(s) registered\n`);
  for (const e of engines) {
    const state = e.state ?? 'UNKNOWN';
    const uptime = e.uptimeMs ? `${Math.floor(e.uptimeMs/1000)}s` : '—';
    console.log(`  ┌─ ${e.displayName}`);
    console.log(`  │  ID:       ${e.id}`);
    console.log(`  │  Version:  ${e.version}`);
    console.log(`  │  State:    ${state}`);
    console.log(`  │  PID:      ${e.pid ?? '—'}`);
    console.log(`  └─ Uptime:   ${uptime}\n`);
  }
});
sock.on('error', e => { console.error('[IPC] Error:', e.message); });
