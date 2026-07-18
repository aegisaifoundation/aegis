export type BuildProfile = 'Development' | 'Debug' | 'Testing' | 'Production' | 'Enterprise' | 'Research';

export type PreReleaseChannel = 'stable' | 'beta' | 'nightly' | 'canary';

export interface PackageManifest {
  id: string;
  name: string;
  version: string;
  publisher: string;
  dependencies: string[];
  optionalDependencies?: string[];
  capabilities: string[];
  permissions: string[];
  checksum: string;
  signature?: string;
}

export interface PlatformManifest {
  platformVersion: string;
  buildNumber: string;
  releaseChannel: PreReleaseChannel;
  supportedRuntimeVersion: string;
  supportedNodeVersion: string;
  minInstallerVersion: string;
  releaseDate: string;
  packages: Record<string, string>; // name -> checksum
  bundles: Record<string, string[]>; // name -> package list
}

export interface SbomEntry {
  name: string;
  version: string;
  license: string;
  hash: string;
  supplier: string;
  dependencies: string[];
}

export interface SbomMetadata {
  format: 'SPDX' | 'CycloneDX';
  version: string;
  timestamp: string;
  components: SbomEntry[];
}
