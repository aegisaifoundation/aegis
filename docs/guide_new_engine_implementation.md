# Developer Guide: How to Implement a New Engine

This guide walks through creating, registering, compiling, and deploying a brand-new engine in the AEGIS ecosystem.

---

## 1. Create the Package Directory

All engines live inside the `packages/` directory in the monorepo. Create a new directory for your engine:

```bash
mkdir packages/aegis-my-new-engine
cd packages/aegis-my-new-engine
```

Create a standard `package.json` for compilation:
```json
{
  "name": "@aegis/my-new-engine",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "scripts": {
    "build": "tsc"
  },
  "dependencies": {
    "@aegis/sdk": "workspace:*"
  }
}
```

Add a `tsconfig.json` to configure TypeScript compilation:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}
```

---

## 2. Declare the Engine Manifest

Create an `engine.json` manifest at the package root to define the engine identity, lifecycle parameters, target API, dependencies, and permissions:

```json
{
  "id": "aegis-my-new-engine",
  "displayName": "AEGIS My New Engine",
  "version": "1.0.0",
  "kernelApiVersion": "1.0.0",
  "entrypoint": "dist/index.js",
  "autoStart": true,
  "dependencies": ["aegis-data"],
  "permissions": ["fs:read"]
}
```

---

## 3. Implement the Engine Lifecycle Class

Implement the `IEngine` interface. Every engine must export a class implementing `initialize`, `configure`, `start`, `shutdown`, and `health` methods:

Create `packages/aegis-my-new-engine/src/index.ts`:

```typescript
import { IEngine, IEngineMetadata, IRuntimeContext_v1, EngineHealthReport } from '@aegis/sdk';
import { serviceRegistry } from '@aegis/runtime';

export class MyNewEngine implements IEngine {
  readonly metadata: IEngineMetadata = {
    id: 'aegis-my-new-engine',
    displayName: 'AEGIS My New Engine',
    version: '1.0.0',
    kernelApiVersion: '1.0.0',
    dependencies: ['aegis-data'],
    priority: 50,
    autoStart: true,
    singleton: true,
    permissions: ['fs:read']
  };

  private context!: IRuntimeContext_v1;
  private active = false;

  async initialize(context: IRuntimeContext_v1): Promise<void> {
    this.context = context;
    context.getLogger().info('Initializing My New Engine...', 'new-engine');
    
    // Register your services here
    serviceRegistry.register('aegis-my-new-engine:service', this);
  }

  async configure(config: Record<string, any>): Promise<void> {
    this.context.getLogger().info('Configuring My New Engine...', 'new-engine');
  }

  async start(): Promise<void> {
    this.context.getLogger().info('Starting My New Engine...', 'new-engine');
    this.active = true;
  }

  async shutdown(): Promise<void> {
    this.context.getLogger().info('Shutting down My New Engine...', 'new-engine');
    this.active = false;
  }

  async pause(): Promise<void> {}
  async resume(): Promise<void> {}
  async reload(): Promise<void> {
    await this.shutdown();
    await this.start();
  }
  async dispose(): Promise<void> {
    await this.shutdown();
  }

  async health(): Promise<EngineHealthReport> {
    return {
      status: this.active ? 'HEALTHY' : 'UNHEALTHY',
      latencyMs: 0,
      details: { uptimeSeconds: process.uptime() }
    };
  }

  // --- Engine Business APIs ---
  public doAwesomeLogic() {
    return 'Success!';
  }
}

export default MyNewEngine;
```

---

## 4. Build the Engine

Add the package workspace to the root `package.json` workspaces list, then run build from the monorepo root:

```bash
npm run build --workspace=@aegis/my-new-engine
```

---

## 5. Register the Engine in the Registry

To tell the microkernel to discover and load this engine:

1. Copy the built files and manifest to `workspace/engines/aegis-my-new-engine/`.
2. Add your engine profile entry to the `workspace/registry/engines.json` file.

Alternatively, you can automate registration by appending the engine mapping details to `register-default-engines.mjs` and running:
```bash
node register-default-engines.mjs
```

The next time you boot the runtime daemon using `aegis-cli runtime start`, the microkernel will automatically discover, instantiate, start, and audit your new engine package.
