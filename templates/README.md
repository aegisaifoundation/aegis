# AEGIS Extension Templates

Welcome to the AEGIS extension development templates. This directory contains boilerplate templates and step-by-step guides to help developers create and integrate new capabilities into the AEGIS runtime.

Select one of the guides below to get started:

---

## 🛠️ [Tool Development Guide & Template](./tool/README.md)
Learn how to build custom executing capabilities (Tools) for the agent. Tools perform actions such as interacting with databases, file systems, external APIs, or other system utilities.
- **Location:** [templates/tool/](./tool/)
- **Includes:** Boilerplate configuration (`tool.json`), permissions model (`permissions.json`), and executable implementation files.

---

## 💻 [Command Development Guide & Template](./command/README.md)
Learn how to build custom modular slash commands (Commands) to orchestrate and control the AEGIS agent runtime.
- **Location:** [templates/command/](./command/)
- **Includes:** Action schemas (`command.json`), permissions model (`permissions.json`), and runtime execution hooks.

---

## 💡 Quick Tips
- When copying files from these templates to their active directories under `tools/shared/` or `commands/shared/`, remember to adjust the relative type imports from `../../aegis-core/...` to `../../../aegis-core/...`.
- Never import live singleton registry instances directly into dynamic commands or tools; instead, always query them via `context.services` to maintain module isolation and state synchronization.
