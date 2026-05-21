import os from 'os';
export class SystemTool {
    name = 'SystemTool';
    description = 'Get system stats like cpu usage, ram, and platform info. Input is ignored, just pass an empty string.';
    async execute(_input) {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const cpus = os.cpus();
        const platform = os.platform();
        const uptime = os.uptime();
        return JSON.stringify({
            platform,
            uptime: `${(uptime / 3600).toFixed(2)} hours`,
            cpu: cpus[0].model,
            cores: cpus.length,
            memory: {
                total: `${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
                free: `${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`,
            }
        }, null, 2);
    }
}
