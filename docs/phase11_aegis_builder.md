# Phase 11: AEGIS Builder (AEB)

The **AEGIS Builder (AEB)** is the official production build, packaging, and release system for the AEGIS ecosystem. It transforms the monorepo source tree into signed release artifacts ready for distribution.

---

## High-Level Pipeline

```
 Source Code ➔ Source Analyzer ➔ TypeScript/C++ Compilers ➔ Package Builder (.aeg)
                                                                 │
                                                                 ▼
 GitHub Releases ➔ GitHub Publisher ➔ Digital Signer ➔ Bundle Builder (.aegbundle)
```

---

## Key Stages

1. **Source & Dependency Analyzer**: Performs static scans of package manifests (`package.json`, `engine.json`) to compile a topological build schedule, preventing circular imports.
2. **Workspace Builder**: Manages isolated clean and incremental build trees, protecting source repositories from compilation noise.
3. **Compiler**: Runs parallel TypeScript builds and spawns native compiler toolchains (such as `g++`) to build binary utilities (`die-service.exe`, `dataset-indexer.exe`).
4. **Package Builder**: Compiles modules, entry files, and configuration files into compressed `.aeg` ZIP files containing package manifests.
5. **Bundle Builder**: Groups references of `.aeg` packages into target bundles like `developer.aegbundle`, `enterprise.aegbundle`, or `community.aegbundle` (minimizing duplicated files).
6. **Digital Signer**: Simulates cryptographically secure RSA/ECDSA routines, sealing all packages and manifests with SHA-256 hashes and verification signatures.
7. **SBOM Generator**: Builds Software Bill of Materials (SBOM) sheets in SPDX / CycloneDX format, capturing licenses, files, and dependencies for supply chain auditing.

---

## CLI Interface Reference

```bash
# Verify system compiler availability
aegis-builder doctor

# Clean up release workspaces
aegis-builder clean

# Compile all modules and C++ executables
aegis-builder build [profile]

# Generate .aeg packages for all components
aegis-builder package

# Compile platform bundle distributions
aegis-builder bundle

# Package, sign, and build release manifests
aegis-builder release [version] [buildNumber]

# Publish compiled assets to GitHub Releases
aegis-builder publish [tag]
```
