# AEGIS Platform Specification v1.0
## The Engineering Constitution for Installation, Execution, Extension, and Recovery

---

## 1. Final Platform Architecture

The AEGIS Platform is organized into seven distinct, isolated layers. Each layer communicating with the one directly below it through stable, unidirectional interfaces:

```
┌────────────────────────────────────────────────────────┐
│ Layer 7: Applications (Dashboard, CLI, Desktop app)    │
├────────────────────────────────────────────────────────┤
│ Layer 6: Installed Engines (Agent, Memory, API, RAG)   │
├────────────────────────────────────────────────────────┤
│ Layer 5: SDK (@aegis/sdk - Stable Contract Layer)      │
├────────────────────────────────────────────────────────┤
│ Layer 4: AEGIS Runtime (Kernel Infrastructure)         │
├────────────────────────────────────────────────────────┤
│ Layer 3: Bootloader (Single Execution Entry Point)     │
├────────────────────────────────────────────────────────┤
│ Layer 2: AEGIS Installer (Profiling & Env Preparation) │
├────────────────────────────────────────────────────────┤
│ Layer 1: Operating System & Hardware (Win/Linux/Jetson)│
└────────────────────────────────────────────────────────┘
```

### Boundary Constraints:
-   **Upper-Layer Isolation:** Layer 7 (Applications) and Layer 6 (Engines) are strictly prohibited from importing classes or calling internal methods from Layer 4 (Runtime).
-   **SDK Boundary:** All engine-to-runtime, engine-to-engine, and application-to-runtime boundaries must cross through Layer 5 (SDK).
-   **Infrastructure-Only Kernel:** Layer 4 contains no business or AI domains. It regulates workspaces, scheduling, transactions, and lifecycles.

---

## 2. Final Directory Structure

```text
aegis/
├── config/                          # PLATFORM CONFIGURATIONS (GLOBAL)
│   ├── runtime.json                 # Hardware profile, workspace routes, autoload logs
│   └── keys/                        # RSA validation key pairs
│
├── workspace/                       # DECLARED RUNSPACE SANDBOX
│   ├── sessions/                    # Local EHR session transaction stores
│   │   └── session_1783513491979/
│   │       ├── session-state.json   # Auth and checkpoint logs
│   │       └── history.json         # Session transaction histories
│   ├── temporary/                   # Rollback transaction buffers (.tmp)
│   ├── quarantine/                  # Isolated corrupted session records
│   └── logs/                        # Machine-readable output logging
│       ├── runtime.log
│       └── crash-dumps/             # Context diagnostics dumps
│
├── packages/                        # MONOREPO WORSPACES
│   ├── aegis-sdk/                   # Layer 5: Standard Contract SDK
│   │   └── src/                     # IKernelAPI, IRuntimeContext, IEngine
│   ├── aegis-runtime/               # Layer 4: Microkernel Implementation
│   │   └── src/                     # Bootloader, Container, EventBus, Security
│   └── aegis-engines/               # Layer 6: Dynamic Pluggable Modules
│       ├── aegis-agent/             # AI Planner and ReAct reasoning engine
│       ├── aegis-memory/            # Vector, BM25, and Graph cognitive memory
│       └── aegis-api/               # REST/SSE external web server
│
├── install.ps1                      # Layer 2: PowerShell Windows Deployment Installer
└── install.sh                       # Layer 2: Bash Linux/macOS/Jetson Deployment Installer
```

---

## 3. Final Package Responsibilities

1.  **`@aegis/sdk`:**
    -   Defines compilation contracts.
    -   Guarantees no runtime dependencies.
    -   Exposes type definitions for logger pings, config registries, and workspace resolving.
2.  **`@aegis/runtime`:**
    -   Implements Phase 1-5 boot cycles.
    -   Manages sandbox boundaries and token authentications.
    -   Tracks system resource consumption (CPU/RAM metrics).
3.  **Installed Engines (`@aegis/agent`, `@aegis/memory`, `@aegis/api`):**
    -   Implement the `IEngine` lifecycle.
    -   Extend the platform with custom REST connections, planning loops, and database drivers.

---

## 4. Final Installation Architecture

The Platform Installer separates environment preparation from code execution.

### Setup and Verification Pipeline:
1.  **System Profiling:** Detects CPU cores, RAM gigabytes, OS platform, and NVIDIA CUDA cores or Jetson modules.
2.  **Dependency Alignment:** Validates NodeJS version compatibility.
3.  **Directory Mounts:** Generates clean folders (`workspace/`, `config/`).
4.  **Credential Generation:** Emits local RSA key pairs for node-to-node security signatures.
5.  **Service Enrollment:** Configures startup system services (e.g. systemd service file on Linux, or standard Windows Service entry).
6.  **Diagnostic Verification:** Executes `npm run build` and runs a mock diagnostic boot.

---

## 5. Final Boot Architecture

Every application (CLI, Dashboard, REST API server, Cloud worker, or unit test) boots the runtime using the same deterministic Bootloader pipeline:

```
[Application Init]
       │
       ▼
[Bootloader.boot()]
       │
       ▼
 1. Platform Detection (CPU/RAM/GPU/OS)
 2. Load Configuration (runtime.json & Secrets)
 3. Instantiates DI Container (Service Registry bindings)
 4. Recovery Sweep (Evaluates checkpoints, resolves journals)
 5. Engine Mounting (Topological DFS sort & lifecycle boot)
       │
       ▼
[System Ready State]
```

No alternate execution entries or sub-bootstrap bypass routines are allowed.

---

## 6. Final Runtime Architecture

The Core Kernel acts as an infrastructure manager:
*   **Non-Singleton DI Container:** Resolves service tokens recursively.
*   **Wildcard Event Channels:** Separates system alerts (`system.*`), I/O changes (`store.*`), capability logs (`engine.*`), and security pings (`security.*`).
*   **Security Interceptor:** Intercepts filesystem, network, or process execution attempts, validating caller credentials against policies.

---

## 7. Final SDK Architecture

The `@aegis/sdk` represents the exclusive compilation boundary. 

-   **Zero Implementation Rules:** The SDK contains interfaces, enums, schemas, and type descriptors. It contains no executable classes or database adapters.
-   **Context-Driven Passing:** All resources are injected into engines via the scoped `IRuntimeContext_v1` parameter. Importing globals is prohibited.

---

## 8. Final Engine Architecture

Engines are pluggable capabilities registered under the kernel `EngineManager`.

### Standard Engine Manifesto (`engine.json`):
```json
{
  "id": "aegis-agent",
  "displayName": "AI Agent Engine",
  "version": "1.0.0",
  "kernelApiVersion": "1.0.0",
  "dependencies": ["aegis-memory"],
  "priority": 10,
  "autoStart": true,
  "singleton": true,
  "permissions": ["fs:read", "fs:write", "net:connect"]
}
```

---

## 9. Final Update Architecture

The platform supports hot upgrades and atomic data rollbacks:
1.  **Incremental Updating:** New engines are downloaded to a cache folder (`workspace/temporary/update-cache/`).
2.  **Compatibility Lock:** The engine manifest is validated against the active kernel API version.
3.  **Atomic Swap:** The old build folder is renamed to `.bak`, and the new build is mounted.
4.  **Database Migration:** If config changes are detected, Schema Migration scripts are executed.
5.  **Rollback Safeguard:** If the new version crashes on diagnostics boot, the kernel restores the `.bak` folder automatically.

---

## 10. Final Recovery Architecture

The kernel assumes failures can occur at any execution checkpoint:
-   **Write Buffering (Atomic Journals):** Changes are written to `.tmp` files. On success, the file replaces the target database. If a crash occurs mid-write, the kernel uses transaction journals to revert state.
-   **Unclean Shutdown Check:** If `runtime-state.json` contains no clean-shutdown signature on boot, the kernel recovers from the latest `.snap` checkpoint.
-   **Safe Mode Boot:** If recovery loops fail 3 consecutive times, the kernel enters `SAFE_MODE`, disabling non-essential engines.

---

## 11. Final Workspace Architecture

The workspace is virtualized to prevent directory traversal attacks:
-   **Relative Path Interceptors:** Subsystems resolve paths via `WorkspaceManager.safeResolve()`.
-   **Isolated Zones:** The workspace directory enforces separation of directories (`sessions/`, `temporary/`, `quarantine/`, `logs/`).
-   **Quarantine Isolation:** Corrupted EHR data is moved to `quarantine/` for forensics.

---

## 12. Final Configuration Architecture

Configuration resides in `config/runtime.json`.
-   **Pre-Flight Schema Validation:** Config modifications are tested against JSON schemas.
-   **Immutability:** Structural settings (workspace locations, keys, logs) require a system reboot. Performance settings can be hot-reloaded dynamically.

---

## 13. Final Installer Design

The setup script (PowerShell for Windows, bash for UNIX-like systems) is responsible for provisioning the environment. It must profile hardware (RAM, CPU cores, GPU models) to output a customized `runtime.json` before booting.

---

## 14. Final Deployment Model

1.  **Single-Node Edge Node:** Deployed via installer setup script on hospitals or local edge systems.
2.  **Dockerized Deployment:** Bundled inside a multi-arch container (`aegis/platform`) running headless.
3.  **Cloud VM / Kubernetes:** Orchestrated as dynamic node clusters using helm charts.

---

## 15. Final Cross-Platform Strategy

Portability is achieved by decoupling OS-specific dependencies:
*   **Abstract File Paths:** Standard node `path.sep` and `path.resolve` calls isolate file routing from OS-specific syntax.
*   **Hardware Capabilities Abstracting:** GPU models (CUDA vs NEON) are detected by the installer, which downloads the matching engine compiled binaries (e.g. CUDA-accelerated `llama.cpp` wrapper vs CPU-fallback).

---

## 16. Final Package Manager Strategy

AEGIS implements a CLI-based package manager to register, update, and remove engines without modifying runtime code:
*   `aegis install [engine-name]`
*   `aegis update [engine-name]`
*   `aegis remove [engine-name]`
*   `aegis list`

The package manager resolves dependency sorting, pulls matches from registry repositories, and writes configurations to `runtime.json`.

---

## 17. Final Versioning Policy

The kernel, SDK, and engines follow **Semantic Versioning 2.0.0 (SemVer)**:
-   **SDK Breaking Changes:** Major version increments (e.g. `v1.0` -> `v2.0`) indicate contract changes. Engines must be re-compiled.
-   **Kernel Internal Refactorings:** Minor/Patch increments indicate performance tuning. Engines run compatibly without updates.

---

## 18. Final Compatibility Policy

*   **API Version Tagging:** The engine manifest declares required `kernelApiVersion` parameters.
*   **Deprecation Policy:** Deprecated SDK features remain functional for at least one major version cycle, printing structured logs.

---

## 19. Final Development Roadmap

```
Phase 1: SDK & Contracts ➔ Phase 2: Core Kernel Services ➔ Phase 3: DI & Bootloader ➔ Phase 4: Recovery & Sandboxes ➔ Phase 5: Engine Manager ➔ Phase 6: Decouple Pluggable Engines ➔ Phase 7: Deployment Installers ➔ Phase 8: Verification Checks
```

### Phase Details:
1.  **Phase 1 (SDK):** Build `@aegis/sdk` contracts.
2.  **Phase 2 (Core Services):** Build logging, config managers, and EventBus.
3.  **Phase 3 (DI & Bootloader):** Build recursive container resolving and the 5-phase deterministic Bootloader.
4.  **Phase 4 (Recovery & Sandboxes):** Build transactional write journals, checksum validation, and safe path resolvers.
5.  **Phase 5 (Engine Manager):** Build DFS topological dependency resolution and lifecycles.
6.  **Phase 6 (Engines):** Decouple agent planners, cognitive memory stores, and REST endpoints into pluggable engines.
7.  **Phase 7 (Installers):** Write platform setup scripts (`install.ps1`, `install.sh`) detecting hardware profiles and registering OS system services.
8.  **Phase 8 (Verification):** Run self-diagnostics and pass 100% of validation test suites.

---

## 20. AEGIS Package Manager Architecture

The Package Manager (`aegis-pkg`) is a standalone command-line binary decoupled from the runtime. It is responsible for parsing package identifiers, querying the central package registry index, resolving recursive dependency graphs, verifying cryptographic package signatures, unpacking archives, and writing autoload mappings back to `config/runtime.json`.

---

## 21. AEGIS Registry Architecture

The AEGIS Registry is a decentralized, secure content-addressable registry. Packages (engines, plugins, tools) are signed with a GPG release key and stored as `.tar.gz` tarballs alongside their `.sha256` checksums and manifest details. The registry exposes endpoints for searching catalogs, resolving package dependency tags, and downloading signed binaries.

---

## 22. Installer Responsibilities vs. Package Manager Responsibilities

-   **Installer (`install.ps1`/`install.sh`):** Installs the base platform itself. Prepares Layer 1 and 2 (detects OS, RAM, CPU cores, registers systemd/service daemons, creates initial global configurations, and populates the base directories). It runs once.
-   **Package Manager (`aegis-pkg`):** Operates *after* installation. Manages Layer 6 and 7 packages. It handles installing/updating/removing pluggable engines and model weights.

---

## 23. Runtime Responsibilities vs. Installer Responsibilities

-   **Runtime (Kernel):** Owns system execution in memory (dependency injection resolution, active workspace sandbox validations, routing event buses, tracking thread health, and managing atomic transactions). It does NOT write setup config configurations or register host system daemons.
-   **Installer:** Preparatory shell execution outside of node runspace. Configures file permission ownerships on directories, establishes environmental environment variables (like `PATH`), and checks node installations.

---

## 24. Package Lifecycle

```
[Unpublished] ➔ [Signed/Published] ➔ [Indexed in Catalog] ➔ [Downloaded] ➔ [Verified] ➔ [Extracted] ➔ [Autoloaded]
                                                                                                 │ (Removed)
                                                                                                 ▼
                                                                                            [Uninstalled]
```

---

## 25. Engine Installation Lifecycle

1.  **Request:** User runs `aegis install [engine]`.
2.  **Resolution:** Query registry; build dependency tree.
3.  **Download:** Pull tarball to `/temporary/downloads/`.
4.  **Security Verification:** Check sha256 checksum and verify cryptographic signature against kernel public certificates.
5.  **Extraction:** Unpack target build to `packages/aegis-engines/[engine-name]`.
6.  **Binding Configuration:** Inject metadata into `autoloadEngines` array in `config/runtime.json`.
7.  **Dynamic Boot:** The next runtime boot loader execution loads the engine.

---

## 26. Update Lifecycle

-   **Stage 1: Check:** Queries current engine version against registry catalog.
-   **Stage 2: Backup:** Renames the active directory to `[engine-name].bak`.
-   **Stage 3: Extract:** Extracts the new package.
-   **Stage 4: Migration:** Executes `migration.ts` to adjust config parameters or transactional databases.
-   **Stage 5: Verification:** Runs test boots. If the diagnostics boot fails, rolls back immediately by restoring `[engine-name].bak`.

---

## 27. Repair Lifecycle

1.  **Audit:** Reads all package records from `runtime.json`.
2.  **Verify Integrity:** Performs SHA256 checksum validations on all package files.
3.  **Re-download:** Identifies missing or altered files (e.g. from disk corruption) and downloads replacements from the Registry.
4.  **Restore Links:** Re-establishes workspace bindings and certificate permissions.

---

## 28. Verification Lifecycle

Runs diagnostic asserts on all mounted paths, filesystems, and encryption states:
-   Validates workspace path sandbox constraints.
-   Verifies RSA verification certificate chains.
-   Checks active session write leases.

---

## 29. Diagnostics Lifecycle (`aegis doctor`)

1.  **System Audit:** Reads CPU cores, RAM space, GPU cuda status, and temp write permissions.
2.  **Config Scan:** Inspects `runtime.json` syntax and schema compliance.
3.  **Integrity Scan:** Asserts checksum hashes on all core kernel and engine files.
4.  **Network Check:** Pings Registry endpoints.
5.  **Output Report:** Emits diagnostic checklist detailing status (PASS, WARNING, FAIL) and actionable recovery instructions.

---

## 30. Workspace Initialization Lifecycle (`aegis init`)

1.  **Path Resolution:** Determines the target directory pathway (uses default or custom override).
2.  **Folder Scaffolding:** Scaffolds sandboxed folders (`sessions/`, `temporary/`, `quarantine/`, `logs/`).
3.  **Config Synthesis:** Generates standard `runtime.json` configurations.
4.  **Credential Scaffolding:** Creates local RSA key pairs inside `config/keys/`.

---

## 31. Platform Maintenance Commands

Exposes the official platform CLI commands:
-   `aegis install <package>`: Download and install an engine/plugin.
-   `aegis remove <package>`: Delete an engine and remove config bindings.
-   `aegis update <package>`: Upgrade package with fallback rollback.
-   `aegis doctor`: Run diagnostics checklist.
-   `aegis init`: Provision a clean workspace environment.
-   `aegis repair`: Force check and download corrupted/missing packages.

---

## 32. Cross-Platform Deployment Strategy

-   **Operating Systems:** Isolates path delimiters using `path.sep` to support Windows, Linux, and macOS.
-   **Embedded Nodes (Jetson, Raspberry Pi):** The installer configures lightweight single-node execution configs, bypassing REST servers and scaling back RAM cache thresholds.
-   **Docker / Kubernetes VM:** Deploys using multi-arch Dockerfiles (`arm64` and `amd64`) mapping workspace directories to external persistent volumes (PVs).

---

## 33. Release Engineering Strategy

-   **Workspaces Build:** Uses monorepo workspace builds ensuring dependencies (like `@aegis/sdk`) are linked before compiling engines.
-   **Signed Releases:** Releases are cryptographically signed at build time using the platform's private key. The public key is embedded in `@aegis/runtime` for package manager validation.

---

## 34. Long-Term Compatibility Guarantees

-   **Interface Immutability:** `@aegis/sdk` major interfaces are locked. Subclass modifications or extensions are version-tagged (e.g. `IKernelAPI_v2`) to allow legacy engines to run concurrently.
-   **Backward Compatibility Guard:** Any newer microkernel version must execute engines compiled against legacy SDK versions.

---

## 35. Executable Distribution Architecture

The platform is compiled and distributed as a self-contained, architecture-specific package (e.g. `AEGIS-v1.0.0-windows-x64.zip`, `AEGIS-v1.0.0-linux-amd64.tar.gz`). It requires no runtime source code to execute. The output directory structure is organized as follows:

```text
AEGIS/
├── bin/
│   ├── aegis.exe         # User-facing CLI client
│   ├── aegis-runtime.exe # Microkernel runtime daemon
│   ├── aegis-boot.exe    # Bootloader bootstrap execution tool
│   └── aegis-pkg.exe     # Pluggable package manager client
├── config/               # runtime.json configuration schemas
├── workspace/            # Sandboxed runspace databases
└── installer/            # install.ps1 / install.sh installation scripts
```

---

## 36. Executable Responsibilities

-   **`aegis.exe` (Platform CLI):** Standard user-facing CLI client. Communicates with `aegis-runtime.exe` via stable IPC layers. Commands include: `aegis start`, `aegis stop`, `aegis restart`, `aegis status`, `aegis doctor`, `aegis logs`, `aegis verify`, `aegis repair`, `aegis update`, `aegis install [engine]`, `aegis remove [engine]`, `aegis list`, `aegis search`, `aegis init`.
-   **`aegis-runtime.exe` (Kernel Daemon):** Runs as a background service. Manages Layer 4 runtime systems (DI registries, EventBuses, thread supervisors, transactional checkpoints, and sandboxes).
-   **`aegis-boot.exe` (Bootloader Tool):** The execution entrypoint. It performs Platform and OS checks, loads configurations, resolves DI container mappings, verifies storage states, and starts `aegis-runtime.exe`.
-   **`aegis-pkg.exe` (Package Manager Binary):** Decoupled tool that manages package downloads, validates GPG signatures and SHA256 checksums, extracts `.tar.gz` engines, and updates autoload settings.

---

## 37. Runtime Communication (Stable IPC Layer)

Applications and the CLI (`aegis.exe`) communicate with the background runtime daemon (`aegis-runtime.exe`) using stable, versioned IPC mechanisms:
-   **Windows:** Named Pipes (`\\.\pipe\aegis_kernel_v1`).
-   **Linux/macOS:** Unix Domain Sockets (`/var/run/aegis_kernel_v1.sock`).
-   **General Fallback:** Local WebSocket/REST server restricted to `localhost:3005`.

No application is permitted to access the internal memory space or import classes of `aegis-runtime.exe` directly.

---

## 38. Platform Service Registry

-   **Windows:** Enrolls `aegis-runtime.exe` as `AEGIS Runtime Service` (configured for Automatic startup).
-   **Linux:** Installs systemd configuration `/etc/systemd/system/aegis.service`.
-   **macOS:** Registers plist configuration `/Library/LaunchDaemons/com.aegis.runtime.plist`.
-   **Docker:** Starts via container `ENTRYPOINT ["bin/aegis-runtime.exe"]`.

---

## 39. Platform Identity

AEGIS is distributed under three formal operational editions:
-   **AEGIS Community:** Standard open-source edition containing core runtime modules, package managers, and base planner/memory engines for edge nodes and developer setups.
-   **AEGIS Professional:** Includes extended diagnostics libraries, advanced local DP-RAG optimizations, and local HIPAA-compliant logging formatters.
-   **AEGIS Enterprise:** Adds decentralized cluster registry routing, multi-node federated agreement consensus controllers, and GPG certificate signing automation.

---

## 40. Distribution Manifest Schema (`manifest.json`)

Every official distribution contains a signed `manifest.json` at its root, defining structural validation versions:

```json
{
  "distributionName": "AEGIS Enterprise",
  "distributionVersion": "1.0.0",
  "runtimeVersion": "1.0.0",
  "sdkVersion": "1.0.0",
  "bootloaderVersion": "1.0.0",
  "packageManagerVersion": "1.0.0",
  "installerVersion": "1.0.0",
  "registryUrl": "https://registry.aegis.health",
  "releaseChannel": "Stable",
  "supportedPlatforms": ["win32", "linux", "darwin"],
  "supportedArchitectures": ["x64", "arm64"],
  "buildDate": "2026-07-11T12:00:00Z",
  "buildHash": "a90f23d8c1...",
  "digitalSignature": "MEYCIQ...",
  "compatibilityMatrixVersion": "1.0.0"
}
```

---

## 41. Platform Service Lifecycle

The system service (systemd, launchd, Windows Service) transitions through the following formal states:

```
[Installed] ➔ [Registered] ➔ [Configured] ➔ [Starting] ➔ [Running] ➔ [Stopping] ➔ [Stopped]
                                             ▲   │        ▲   │
                                       Resume│   │Pause   │   │(Fault detected)
                                             │   ▼        │   ▼
                                           [Paused]     [Recovering] ➔ [Failed] (Recovery fails)
```

---

## 42. Release Channels & Compatibility Matrix

-   **Stable:** Production deployment standard. Minor/Patch updates guarantee 100% backward compatibility.
-   **Beta:** Release candidates. Undergoes API regression test suites before pushing to nodes.
-   **Nightly:** Development snapshot builds.
-   **Development:** Local build configurations.

On update, the package manager checks the `compatibilityMatrixVersion` map. If target components fall outside compatible limits, the update is blocked.

---

## 43. Digital Trust & GPG Signed Releases

-   **Signing Process:** Platform binaries and package archives are signed with the AEGIS Release GPG private key during release builds.
-   **Verification Process:** The package manager (`aegis-pkg.exe`) verifies GPG signatures against the public release key stored in `/config/keys/aegis_release_pub.gpg` before unpacking.
-   **Revocation:** Compromised keys are revoked by downloading a signed revocation list from the registry or checking CRL files.

---

## 44. Offline & Portable Installations

-   **Offline Execution:** The platform is fully operable without internet access. Pluggable packages and models are read from local disk archives (`.tar.gz`) and verified against the local manifest database.
-   **Portable Deployments:** Supports installation on external storage media (e.g. USB keys, SSDs). Portable installations use relative workspace path resolving and execute without administrator privileges.

---

## 45. Enterprise Operations & Mass Deployment

-   **Silent Installs:** Installers support quiet execution (`install.ps1 -Quiet -WorkspacePath D:\aegis`) for configuration automation tools (Ansible, SCCM).
-   **Corporate Certs:** Supports custom CA root certificates to route package downloads through enterprise proxy servers.
-   **Centralized Telemetry:** Exposes resource statistics (uptime, crash count, restart logs, memory load) through the local REST API (`GET /api/diagnostics/telemetry`).

---

## 46. Safe Uninstallation & Cleanup

Uninstallation offers three standard profiles:
-   **Remove Platform Only:** Deletes binaries in `/bin/` but retains workspaces and configuration keys.
-   **Full Purge:** Deletes binaries, configuration files, environment variables, local certificates, and database workspaces.
-   **Export Configuration & Purge:** Packages configurations and session keys into `/workspace_backup.zip` before purging.
