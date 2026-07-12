import os from 'os';

export interface HardwareProfile {
  cpu: string;
  cores: number;
  ramGb: number;
  cudaEnabled: boolean;
}

export function detectHardware(): HardwareProfile {
  const cpus = os.cpus();
  const cpuModel = cpus.length > 0 ? cpus[0].model : 'Unknown';
  const totalMemGb = Math.round(os.totalmem() / (1024 * 1024 * 1024));
  const cudaEnabled = process.env.AEGIS_CUDA_ENABLED === 'true';

  return {
    cpu: cpuModel,
    cores: cpus.length,
    ramGb: totalMemGb,
    cudaEnabled
  };
}

export function detectOS(): string {
  return os.platform();
}

export function detectArch(): string {
  return os.arch();
}
