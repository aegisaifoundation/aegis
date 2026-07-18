# Platform Concepts: Packages & Transaction Integrity

The AEGIS microkernel relies on a robust packaging architecture and a transactional installation pipeline. This system guarantees that installing or updating engines never leaves the operating system in an unstable or corrupted state.

---

## 1. The Packaging Format

Every engine in the AEGIS ecosystem is distributed as an independent archive:
* **Package Extension**: `.aeg` (a standard ZIP container).
* **Package Structure**:
  - `engine.json`: Manifest configuration containing ID, version, entry file path, dependencies, and requested permissions.
  - `dist/`: Compiled JavaScript files and native compiled binaries.
  - `assets/`: Required static images, schemas, or templates.

---

## 2. Platform Bundle Format

To deploy multiple engines simultaneously, packages can be aggregated into a bundle:
* **Bundle Extension**: `.aegbundle` (a ZIP container referencing multiple `.aeg` packages).
* **Manifest**: A root-level manifest indexing the included package locations.

---

## 3. Transactional Installation Pipeline

Installing an engine is an **atomic transaction**. If compilation, dependency checks, or file copy tasks fail during installation, the entire transaction is rolled back.

```
       Start Transaction (UUID)
                  │
                  ▼
         Topological Sort
    (Dependency validation check)
                  │
                  ▼
         Backup Stage Files
 (Copy existing configurations if modifying)
                  │
                  ▼
         Extract & Copy Files
                  │
                  ▼
    Write Transaction Recovery Journal
                  │
                  ▼
          Commit / Rollback
```

### Key Stages

1. **Topological Check**: The Package Manager resolves all engine dependencies (`aegis-runtime/src/config/package-manager/manifests`). If a dependency is missing, the installation is aborted immediately.
2. **File Backup**: If modifying an existing engine, the active folder is moved to the transaction backup cache (`packages/aegis-runtime/src/config/package-manager/backups`).
3. **Transaction Recovery Journal**: A journal file containing the actions, target directories, added files, and backup paths is written to disk (`packages/aegis-runtime/src/config/package-manager/transactions/<txId>_journal.json`).
4. **Validation & Registry Commit**: If the system verifies the package builds and exports are valid constructable classes, the transaction changes state to `COMMITTED` and `workspace/registry/engines.json` is updated.

---

## 4. Recovery & Safe Mode Booting

On boot, the microkernel's `TransactionManager` runs a recovery scan:
* **Active Journals Check**: Looks for any journals whose state is not `COMMITTED`.
* **Rollback Action**: If an uncommitted journal is found (due to a power failure or system crash mid-install), it automatically deletes newly added files and restores files from the backup directory.
* **Safe Mode Fallback**: If an installed engine fails during startup (e.g. missing dependencies), the microkernel isolates the failed engine and boots the rest of the ecosystem in **Safe Mode**, preventing a single faulty package from crashing the entire cluster.
