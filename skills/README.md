# AEGIS Skills

Welcome to the **AEGIS Skills** directory. This folder houses the modular, reusable intelligence behaviors that drive the AEGIS agent runtime.

---

## 💡 What is a Skill?

In the AEGIS architecture, **Skills** represent modular intelligence capabilities. Unlike **Tools** (which execute specific actions on the filesystem or APIs) or **Plugins** (which extend core background infrastructure), Skills encapsulate conversational workflows, LLM-based parsing and generation, schema enforcement, and structured diagnostic tasks.

For example, a skill might:
- Summarize a clinical report.
- Extract structured entities from conversational inputs.
- Format text according to strict medical markdown structures.
- Generate template-based referral letters.

---

## 📁 Directory Structure

All active skills are categorized under subdirectories (typically `shared/` or institutional categories):

```
skills/
└── shared/
    ├── summarize/     # Reusable text summarization skill
    ├── extract/       # Structured clinical entity extraction skill
    ├── format/        # Output normalizing and cleaning skill
    └── generate/      # Controlled template-based LLM generation skill
```

### Typical Skill Folder Layout
Every skill is a self-contained module consisting of:
*   `skill.json`: Metadata configuration defining its name, category, and entrypoint.
*   `permissions.json`: Declares sandbox permissions (e.g. `provider` to call LLM models).
*   `index.ts`: Module entrypoint that exports the skill manifest.
*   `execute.ts`: Core executable logic implementing the skill's functionality.
*   `prompts/`: Standard prompt template configurations.

---

## 🚀 Dynamic Capability Management

Skills are dynamically loaded, updated, and unloaded without restarting the AEGIS runtime. From the AEGIS CLI, use these commands:

*   **List Active Skills:**
    ```bash
    /skills
    ```
*   **Add/Load a Skill:**
    ```bash
    /add skill shared/my-custom-skill
    ```
*   **Remove/Unload a Skill:**
    ```bash
    /remove skill shared/my-custom-skill
    ```
*   **Update/Reload a Skill:**
    ```bash
    /update skill shared/my-custom-skill
    ```

---

## 🛠️ Building Custom Skills

To build your own skill, refer to the step-by-step instructions and templates in:
👉 [Skill Development Guide & Template](../templates/skill/README.md)
