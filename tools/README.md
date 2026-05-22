# AEGIS Tools

Welcome to the **AEGIS Tools** directory. This folder houses the execution capabilities (Tools) that the agent uses to interact with external environments, local filesystems, APIs, and OS processes.

---

## 💡 What is a Tool?

In the AEGIS architecture, **Tools** represent the "hands" of the agent. While the LLM handles reasoning and planning, and **Skills** handle specialized intelligence tasks, **Tools** are called dynamically during agent execution to run code, write configuration, parse text, query databases, or execute terminal processes.

### Available Core Tools:
- **FileTool**: Read, write, append, and delete files inside the workspace sandbox.
- **FolderTool**: List files, check directories, and manage directories.
- **MemoryTool**: Read, write, search, and manage persistent agent conversation context/memory.
- **SystemTool**: Check system diagnostics, retrieve system information, and monitor execution parameters.
- **TerminalTool**: Execute isolated sub-commands or run script files within the host OS sandbox.

---

## 📁 Directory Structure

Tools are categorized in subdirectories under `tools/shared/` or other domain-specific namespaces:

```
tools/
└── shared/
    ├── FileTool/      # Performs actions like createFile, read, write, append, delete
    ├── FolderTool/    # Performs actions like list, search, checkFolder
    ├── MemoryTool/    # Interacts with session memory persistence
    ├── SystemTool/    # Interacts with system telemetry and status metrics
    └── TerminalTool/  # Performs actions like runScript, executeCommand
```

### Typical Tool Folder Layout
Each tool contains:
*   `tool.json`: Metadata configuration defining its name, category, and entrypoint.
*   `permissions.json`: Declares sandbox permissions (e.g. `filesystem` or `workspace`).
*   `index.ts`: Module entrypoint mapping specific tool action names to their executable action handlers.
*   `action files (e.g., createFile.ts)`: Sub-actions containing the implementation logic of specific operations.

---

## 🚀 Dynamic Tool Management

Tools can be registered, unregistered, and monitored dynamically from the AEGIS CLI interface:

*   **List Active Tools:**
    ```bash
    /tools
    ```
*   **Add/Load a Tool:**
    ```bash
    /add tool shared/MyNewTool
    ```
*   **Remove/Unload a Tool:**
    ```bash
    /remove tool MyNewTool
    ```
*   **Update/Reload a Tool:**
    ```bash
    /update tool shared/MyNewTool
    ```

---

## 🛠️ Building Custom Tools

To develop custom executing capabilities, follow the guidelines and copy the template:
👉 [Tool Development Guide & Template](../templates/tool/README.md)
