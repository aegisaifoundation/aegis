import fs from 'fs';

export interface PreflightReport {
  passed: boolean;
  errors: string[];
  warnings: string[];
}

export class StartupDiagnostics {
  static runPreflightChecks(executablePath: string): PreflightReport {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Path check
    if (!executablePath) {
      errors.push('Executable path is not configured.');
      return { passed: false, errors, warnings };
    }

    // 2. Existence check
    if (!fs.existsSync(executablePath)) {
      errors.push(`Executable file does not exist at "${executablePath}".`);
      return { passed: false, errors, warnings };
    }

    // 3. Stat check (type & size)
    try {
      const stats = fs.statSync(executablePath);
      if (!stats.isFile()) {
        errors.push(`Path "${executablePath}" is not a file.`);
      }
      if (stats.size === 0) {
        errors.push(`Executable file at "${executablePath}" is empty (0 bytes).`);
      }
    } catch (e: any) {
      errors.push(`Failed to read file stats for "${executablePath}": ${e.message}`);
    }

    // 4. Permissions check (OS specific warning/error)
    try {
      fs.accessSync(executablePath, fs.constants.R_OK);
    } catch {
      errors.push(`No read permissions on executable file at "${executablePath}".`);
    }

    if (process.platform !== 'win32') {
      try {
        fs.accessSync(executablePath, fs.constants.X_OK);
      } catch {
        errors.push(`No execute permissions on executable file at "${executablePath}".`);
      }
    }

    return {
      passed: errors.length === 0,
      errors,
      warnings
    };
  }
}
export default StartupDiagnostics;
