// ipc-engine-info.mjs — Query detailed engine info via IPC
import net from 'net';

const PIPE = '\\\\.\\pipe\\aegis_kernel_v1';
const engineId = process.argv[2] || 'distributed-intelligence';

const sock = net.createConnection(PIPE, () => {
  sock.write(JSON.stringify({ version: '1.0.0', requestId: 'info-1', command: 'engineInfo', payload: { engineId } }));
});

let buf = '';
sock.on('data', d => { buf += d.toString(); });
sock.on('end', () => {
  try {
    const resp = JSON.parse(buf);
    if (!resp.result?.success) { console.error('Error:', resp.error); return; }
    const { metadata, health, state, pid, uptimeMs, restartCount, startedAt } = resp.result.info;
    const uptime = uptimeMs ? `${Math.floor(uptimeMs / 1000)}s` : '—';
    const healthIcon = health.status === 'HEALTHY' ? '✅' : health.status === 'DEGRADED' ? '⚠️ ' : '❌';
    console.log(`\n  ═══════════════════════════════════════`);
    console.log(`  ${metadata.displayName}`);
    console.log(`  ═══════════════════════════════════════`);
    console.log(`  ID          ${metadata.id}`);
    console.log(`  Version     ${metadata.version}`);
    console.log(`  Kernel API  ${metadata.kernelApiVersion}`);
    console.log(`  ───────────────────────────────────────`);
    console.log(`  State       ${state}`);
    console.log(`  Health      ${healthIcon} ${health.status}  (${health.latencyMs}ms)`);
    console.log(`  PID         ${pid ?? '—'}`);
    console.log(`  Uptime      ${uptime}`);
    console.log(`  Started     ${startedAt ? new Date(startedAt).toLocaleString() : '—'}`);
    console.log(`  Restarts    ${restartCount}`);
    console.log(`  ═══════════════════════════════════════\n`);
  } catch (e) { console.log('Raw:', buf); }
});
sock.on('error', e => { console.error('[IPC] Error:', e.message); });
