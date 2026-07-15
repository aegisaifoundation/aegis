# Phase 2: Node Platform & Package Manager Specification

The Node Platform and Package Manager govern how code units (engines, tools, skills, agents) are safely validated, unpacked, and executed on a sovereign AEGIS node.

---

## 1. The `.aeg` Package Format

A package is wrapped as a secure `.aeg` archive. Each archive contains:
*   **`package.json`**: Standard descriptor detailing package metadata, dependencies, entrypoint files, and requested permission scopes (e.g. `fs:read`, `network`).
*   **`manifest.json`**: Complete cryptographic hash map of every file in the package.
*   **`signature.sig`**: Cryptographic signature of the manifest, signed using the publisher's private ECC/RSA keys.
*   **`dist/`**: Pre-compiled execution modules.

---

## 2. Cryptographic Verification & Signatures

Before any package is installed, the Package Manager performs the following checks:
1.  **Integrity Validation**: Computes hashes for all files and matches them against `manifest.json`.
2.  **Signature Verification**: Decrypts the signature using the publisher's public key (retrieved from trusted certificate authorities or the node trust network).
3.  **Permissions Audit**: Compares the package's requested permissions against the node's active security policies. If a package requests root or unauthorized access, installation is blocked.

---

## 3. Sandboxed Installation

Packages are extracted into isolated sandbox folders inside the node's workspace:
```
/workspace/packages/
  └── [package-id]/
        ├── manifest.json
        ├── signature.sig
        └── dist/
```
The runtime uses module virtualization to restrict sandboxed packages from importing unauthorized system modules, accessing directories outside their workspace boundary, or spawning arbitrary subprocesses.
