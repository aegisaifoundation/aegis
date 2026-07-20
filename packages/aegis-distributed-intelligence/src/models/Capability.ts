export interface Capability {
  engineVersion: string;
  buildVersion: string;
  platform: string;
  cpuArch: string;
  supportedModules: string[];
  gpuSupport: boolean;
  cudaSupport: boolean;
  cudaVersion?: string;
  availableTransports: string[];
  enabledFeatures: string[];
  protocolVersion: string;
}
