import os from 'os';
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const cpus = os.cpus();
  const platform = os.platform();
  const uptime = os.uptime();

  return JSON.stringify({
    platform,
    uptime: `${(uptime / 3600).toFixed(2)} hours`,
    cpu: cpus.length > 0 ? cpus[0].model : 'Unknown',
    cores: cpus.length,
    memory: {
      total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
      free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
    }
  }, null, 2);
}
