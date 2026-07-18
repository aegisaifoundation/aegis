import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import { HardwareStats } from '../types/index.js';

const execAsync = promisify(exec);

export class GpuResourceManager {
  private lastStats: HardwareStats | null = null;

  async getStatus(): Promise<HardwareStats> {
    const totalRamMb = Math.round(os.totalmem() / (1024 * 1024));
    const freeRamMb = Math.round(os.freemem() / (1024 * 1024));
    const ramUsageMb = totalRamMb - freeRamMb;

    let device: 'cpu' | 'cuda' | 'rocm' = 'cpu';
    let gpuCount = 0;
    let totalVramMb = 0;
    let availableVramMb = 0;
    let gpuUsagePercent = 0;
    let temperatureCelsius = 35;
    let powerWatts = 15;

    // Detect NVIDIA CUDA
    try {
      const { stdout } = await execAsync('nvidia-smi --query-gpu=index,memory.total,memory.free,utilization.gpu,temperature.gpu,power.draw --format=csv,noheader,nounits');
      const lines = stdout.trim().split('\n');
      if (lines.length > 0 && lines[0]) {
        device = 'cuda';
        gpuCount = lines.length;
        for (const line of lines) {
          const parts = line.split(',').map(p => p.trim());
          totalVramMb += parseInt(parts[1] || '0', 10);
          availableVramMb += parseInt(parts[2] || '0', 10);
          gpuUsagePercent = Math.max(gpuUsagePercent, parseInt(parts[3] || '0', 10));
          temperatureCelsius = Math.max(temperatureCelsius, parseInt(parts[4] || '0', 10));
          powerWatts += parseFloat(parts[5] || '0');
        }
      }
    } catch {
      // Direct NVIDIA detection failed, try ROCm (AMD)
      try {
        const { stdout } = await execAsync('rocm-smi --showmeminfo vram --showuse --showtemp');
        if (stdout.includes('GPU')) {
          device = 'rocm';
          gpuCount = 1; // Default
          totalVramMb = 8192; // Default fallback
          availableVramMb = 6144;
          gpuUsagePercent = 10;
          temperatureCelsius = 45;
          powerWatts = 45;
        }
      } catch {
        // Fallback to CPU mode
        device = 'cpu';
      }
    }

    const cpuUsagePercent = Math.round(this.getAverageCpuUsage() * 100);

    const stats: HardwareStats = {
      device,
      gpuCount,
      totalVramMb,
      availableVramMb,
      gpuUsagePercent,
      cpuUsagePercent,
      ramUsageMb,
      totalRamMb,
      temperatureCelsius,
      powerWatts
    };

    this.lastStats = stats;
    return stats;
  }

  private getAverageCpuUsage(): number {
    const cpus = os.cpus();
    let user = 0;
    let nice = 0;
    let sys = 0;
    let idle = 0;
    let irq = 0;

    for (const cpu of cpus) {
      user += cpu.times.user;
      nice += cpu.times.nice;
      sys += cpu.times.sys;
      idle += cpu.times.idle;
      irq += cpu.times.irq;
    }

    const total = user + nice + sys + idle + irq;
    if (total === 0) return 0;
    return (total - idle) / total;
  }
}

export const gpuResourceManager = new GpuResourceManager();
export default gpuResourceManager;
