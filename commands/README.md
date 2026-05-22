# AEGIS Commands

Welcome to the **AEGIS Commands** directory. This folder houses the modular slash commands used to orchestrate, control, and interact with the AEGIS Core runtime.

---

## 💡 What is a Command?

In the AEGIS CLI, **Commands** allow developers and users to issue orchestration instructions to the agent kernel. Commands are prefaced with a forward slash (e.g., `/status`, `/help`) and are dynamically registered at startup or loaded dynamically.

Unlike **Tools** (which are called by the LLM agent to execute actions) or **Skills** (which perform reusable LLM/prompt analysis), Commands are executed directly by the user via the CLI REPL or terminal execution shell to configure runtime states and register capabilities.

---

## 📁 Directory Structure

Commands are categorized inside subdirectories under `commands/shared/` or other domain-specific namespaces:

```
commands/
└── shared/
    ├── add/       # Add a capability dynamically (tool, plugin, skill)
    ├── remove/    # Remove a capability dynamically (tool, plugin, skill)
    ├── update/    # Update/reload a capability dynamically
    ├── help/      # Display available commands and CLI usage
    ├── status/    # Show runtime status, loaded plugins, skills, tools, and model configuration
    ├── tools/     # List all currently active tools
    ├── plugins/   # List all loaded plugins and their status
    ├── skills/    # List all loaded skills and their current state
    ├── clear/     # Clear active conversation memory
    ├── reload/    # Reload a registered command or all commands dynamically
    └── exit/      # Gracefully shut down the AEGIS runtime
```

### Typical Command Layout
Every command module contains:
*   `command.json`: Metadata configuration defining command name, description, category, and version.
*   `permissions.json`: Sandbox permissions required by the command.
*   `index.ts`: Module entrypoint exporting the command manifest.
*   `execute.ts`: Executable code defining command parameters and outputs.

---

## ⚙️ How Commands are Loaded

Commands are loaded during the AEGIS Core boot process by reading the `autoloadCommands` array in [runtime.json](file:///c:/aegis/aegis-core/src/config/runtime.json). New commands must have their relative paths (e.g., `"shared/my-command"`) manually added to this file to autoload on start.

---

## 🛠️ Building Custom Commands

To develop custom CLI slash commands, follow the guidelines and copy the template:
👉 [Command Development Guide & Template](../templates/command/README.md)
