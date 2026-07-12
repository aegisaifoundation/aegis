import path from 'path';

export function getIpcPath(workspacePath: string): string {
  if (process.platform === 'win32') {
    return '\\\\.\\pipe\\aegis_kernel_v1';
  } else {
    return path.join(workspacePath, 'runtime', 'aegis_kernel_v1.sock');
  }
}
