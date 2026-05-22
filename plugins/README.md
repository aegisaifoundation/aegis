# AEGIS Plugins

Welcome to the **AEGIS Plugins** directory. This folder houses background infrastructure extensions (Plugins) that observe, secure, and hook into the lifecycle events of the AEGIS Core runtime.

---

## 💡 What is a Plugin?

In the AEGIS architecture, **Plugins** provide foundational, non-blocking background utilities (such as auditing, caching, metric logging, state synchronization, encryption, and telemetry). 

Unlike **Tools** (which execute specific actions for the LLM) or **Commands** (which allow user-facing orchestration), Plugins run behind the scenes by:
- Listening to events emitted by the central `EventBus`.
- Hooking into runtime lifecycle states (`initialize` and `shutdown`).
- Providing infrastructure support to other layers (e.g., decrypting configuration payloads).

---

## 📁 Directory Structure

Plugins are categorized inside subdirectories under `plugins/shared/` or other domain-specific namespaces:

```
plugins/
└── shared/
    ├── logging/          # General event/action execution logging
    ├── telemetry/        # Model provider invocation metrics and latency tracking
    ├── encryption/       # File payload and key encryption mechanisms
    ├── monitoring/       # Health checks and resource monitoring
    ├── cache/            # Key-value response and workspace query caching
    ├── auth/             # Service authentication boundaries
    ├── persistence/      # Local database and ledger storage bindings
    ├── synchronization/  # Workspace file mirroring and server coordination
    ├── notifications/    # External communication alerts
    └── analytics/        # Performance profiling utilities
```

### Typical Plugin Layout
Each plugin directory contains:
*   `plugin.json`: Metadata configuration defining its name, category, and version.
*   `permissions.json`: Declares sandbox permissions (e.g. `event_bus` or `filesystem`).
*   `index.ts`: Module entrypoint exporting the plugin manifest and hook mappings.
*   `initialize.ts`: Setup logic executed when the plugin loads (typically registers EventBus listeners).
*   `shutdown.ts`: Cleanup logic executed when the plugin is unloaded (typically cleans up open listeners and caches).

---

## 🚀 Dynamic Plugin Management

Plugins can be managed dynamically from the AEGIS CLI interface without restarting the kernel:

*   **List Active Plugins:**
    ```bash
    /plugins
    ```
*   **Add/Load a Plugin:**
    ```bash
    /add plugin shared/my-plugin
    ```
*   **Remove/Unload a Plugin:**
    ```bash
    /remove plugin shared/my-plugin
    ```
*   **Update/Reload a Plugin:**
    ```bash
    /update plugin shared/my-plugin
    ```

---

## 🛠️ Building Custom Plugins

To develop custom infrastructure extensions, follow the guidelines and copy the template:
👉 [Plugin Development Guide & Template](../templates/plugin/README.md)
