# AEGIS Plugin Development Guide & Template

Welcome to the AEGIS Plugin development template. This guide explains how to construct, configure, and register custom plugins to extend the core infrastructure of the AEGIS runtime.

---

## 💡 What is a Plugin?

In the AEGIS architecture, **Plugins** are runtime infrastructure extensions (e.g. logging, telemetry, security utilities, caches). Unlike **Tools** (which perform actions for the AI agent) or **Commands** (which allow users to orchestrate the CLI runtime), Plugins work behind the scenes by:
- Monitoring runtime lifecycle events.
- Interacting with central services.
- Providing helper utilities to other layers.

---

## 📁 File Structure

A standard AEGIS plugin contains the following files:

```
templates/plugin/
├── plugin.json         # Plugin metadata configuration
├── permissions.json    # Requested service permissions
├── index.ts            # Entrypoint exporting the plugin manifest
├── initialize.ts       # Setup logic executed on load
├── shutdown.ts         # Cleanup logic executed on unload
└── README.md           # This guide
```

---

## ⚙️ Configuration & Metadata

### 1. `plugin.json`
Defines metadata about the plugin module.
- `name`: Unique name for the plugin.
- `category`: Category of the plugin (normally `"shared"`).
- `description`: A brief summary of what the plugin does.
- `version`: SemVer version string.
- `entry`: Entrypoint file path (usually `"index.ts"`).

```json
{
  "name": "TemplatePlugin",
  "category": "shared",
  "description": "Boilerplate description for the Template Plugin",
  "version": "1.0.0",
  "entry": "index.ts"
}
```

### 2. `permissions.json`
To maintain a safe sandbox environment, plugins must explicitly request permission to access core AEGIS services:
- `event_bus`: To listen to or publish events.
- `workspace`: To retrieve the workspace directory path.
- `filesystem`: To perform raw file reads/writes on disk.
- `configuration`: To view or update the system configuration.
- `registry`: To view or search loaded tools or command definitions.
- `model_provider`: To interact with the conversational AI models.

```json
{
  "permissions": [
    "event_bus",
    "workspace",
    "filesystem"
  ]
}
```

---

## 🚀 Lifecycle Hooks

Plugins are strictly managed by their lifecycle hooks.

### `initialize(context)`
Executed when the plugin is loaded dynamically. Use this hook to listen to the `eventBus` or bootstrap databases/files.
- **Always** save a reference to any event handlers on the context object (e.g., `(context as any)._handlers`) so you can cleanly unsubscribe during the shutdown phase.

### `shutdown(context)`
Executed when the plugin is unloaded or updated.
- **Always** unsubscribe all event listeners from the `eventBus` to prevent memory leaks and clean up any open file descriptors or timers.

---

## 🛠️ Accessing Core Services

The `context` parameter passed to both hooks provides access to approved services:
```typescript
import type { PluginContext } from '@aegis/plugins';

export default async function initialize(context: PluginContext): Promise<void> {
  // Get the centralized Logger
  const logger = context.services.getLogger();
  logger.info('Initializing...');

  // Get the Event Bus
  const eventBus = context.services.getEventBus();
  
  // Get the Workspace Path
  const workspacePath = context.services.getWorkspacePath();
  
  // Access plugin-specific configurations
  const pluginConfig = context.config;
}
```

> ⚠️ **Always use `import type { PluginContext } from '@aegis/plugins'`**  
> Never import from relative `aegis-core` paths — that directory does not exist.
> Never use `import { PluginContext }` (value import) — always `import type` to avoid ESM errors.

---

## 🔄 Dynamic Management Commands

To run your plugin, copy its folder into the `plugins/` directory (e.g., `plugins/shared/my-plugin`).

From the AEGIS command line, manage it dynamically:

- **Add/Load a Plugin:**
  ```bash
  /add plugin shared/my-plugin
  ```
- **Remove/Unload a Plugin:**
  ```bash
  /remove plugin shared/my-plugin
  ```
- **Update/Reload a Plugin:**
  ```bash
  /update plugin shared/my-plugin
  ```
- **View Active Plugins:**
  ```bash
  /plugins
  ```
