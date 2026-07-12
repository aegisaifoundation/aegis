export type PackageType = 
  | 'Runtime' 
  | 'Engine' 
  | 'Skill' 
  | 'Tool' 
  | 'Plugin' 
  | 'Model' 
  | 'Application' 
  | 'Template' 
  | 'Configuration' 
  | 'Bundle';

export interface PackageManifest {
  id: string;
  name: string;
  version: string;
  type: PackageType;
  entrypoint?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  runtimeVersionConstraint?: {
    min?: string;
    max?: string;
  };
  kernelApiVersion?: string;
  sdkVersion?: string;
  supportedPlatforms?: string[];
  supportedArchitectures?: string[];
  permissions?: string[];
  checksums?: {
    files: Record<string, string>;
    manifest: string;
  };
  signature?: string;
}

export interface PackageInfo {
  id: string;
  name: string;
  version: string;
  type: PackageType;
  installationDate: string;
  installationPath: string;
  dependencies: Record<string, string>;
  reverseDependencies: string[];
  checksum: string;
  signatureStatus: 'VERIFIED' | 'UNSIGNED' | 'INVALID';
  repositorySource: string;
  installationState: 'INSTALLED' | 'DEGRADED' | 'BROKEN';
  updateChannel: 'stable' | 'beta' | 'nightly';
  healthState: 'HEALTHY' | 'UNHEALTHY';
  enabled?: boolean;
}

export interface PackageDatabaseSchema {
  packages: Record<string, PackageInfo>;
  repositories: Array<{
    id: string;
    type: 'local' | 'git' | 'http' | 'offline';
    url: string;
  }>;
  transactionHistory: Array<{
    txId: string;
    action: string;
    timestamp: string;
    status: 'COMMITTED' | 'ROLLED_BACK' | 'FAILED';
  }>;
}

export interface TransactionJournal {
  txId: string;
  state: 'STARTED' | 'BACKED_UP' | 'EXTRACTING' | 'REGISTERING' | 'COMMITTING' | 'COMMITTED' | 'ROLLING_BACK' | 'ROLLED_BACK';
  timestamp: string;
  packageId: string;
  action: 'install' | 'remove' | 'update';
  backups: Array<{
    originalPath: string;
    backupPath: string;
  }>;
  addedFiles: string[];
  addedDirs: string[];
  originalConfig: any;
}
