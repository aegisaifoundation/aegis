import type { RuntimeServices } from '../RuntimeServices.js';

export interface CommandContext {
  services: RuntimeServices;
  permissions: string[];
}
