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

## 🔌 [Plugin Development Guide & Template](./plugin/README.md)
Learn how to build background infrastructure extensions (Plugins) to observe the runtime lifecycle, manage caches, persist state, or track telemetry.
- **Location:** [templates/plugin/](./plugin/)
- **Includes:** Core plugin configuration (`plugin.json`), permissions model (`permissions.json`), and lifecycle hooks (`initialize`, `shutdown`).

---

## 💡 [Skill Development Guide & Template](./skill/README.md)
Learn how to build modular, reusable intelligence behaviors (Skills) that define LLM-based logic, prompt template parsing, and structured data handling.
- **Location:** [templates/skill/](./skill/)
- **Includes:** Core skill configuration (`skill.json`), permissions model (`permissions.json`), execution logic (`execute.ts`), and sample prompts.

---

## 🔮 [Provider Development Guide & Template](./provider/README.md)
Learn how to build custom model inference bridges (Providers) to connect AEGIS to new LLM APIs, local runtimes, edge device execution environments, or testing simulator nodes.
- **Location:** [templates/provider/](./provider/)
- **Includes:** Core provider metadata (`provider.json`), permissions model (`permissions.json`), and provider execution lifecycle methods.

---

## 💡 Quick Tips
- When copying files from these templates to their active directories under `tools/shared/`, `commands/shared/`, `plugins/shared/`, `skills/shared/`, or `providers/`, remember to adjust the relative type imports from `../../aegis-core/...` to `../../../aegis-core/...`.
- Never import live singleton registry instances directly into dynamic extensions; instead, always query them via `context.services` to maintain module isolation and state synchronization.
