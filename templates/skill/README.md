# AEGIS Skill Development Guide & Template

Welcome to the AEGIS Skill development template. This guide explains how to construct, configure, and register custom skills to define reusable intelligence behaviors in the AEGIS runtime.

---

## 💡 What is a Skill?

In the AEGIS architecture, **Skills** represent reusable, modular intelligence behaviors. Unlike **Tools** (which perform concrete actions like writing files or reading databases) or **Plugins** (which extend runtime infrastructure like telemetry or event logging), Skills encapsulate conversational logic, LLM-based parsing/generation, and schema-enforcement tasks.

- Skills are orchestrated by the agent to make decisions or process information.
- Skills must **never** contain provider routing/fallback settings (e.g. host configuration). They delegate model execution directly to the central `ModelProvider`.
- Skills are executed via `executeSkill` dynamically.

---

## 📁 File Structure

A standard AEGIS skill contains the following files:

```
templates/skill/
├── skill.json          # Skill metadata configuration
├── permissions.json    # Requested permissions (e.g., "provider")
├── index.ts            # Entrypoint exporting the skill manifest
├── execute.ts          # Core execution logic
├── prompts/
│   └── template.prompt # LLM prompt template file
└── README.md           # This guide
```

---

## ⚙️ Configuration & Metadata

### 1. `skill.json`
Defines metadata about the skill module.
- `name`: Unique name for the skill.
- `category`: Category of the skill (normally `"shared"`).
- `description`: A brief summary of what the skill does.
- `version`: SemVer version string.
- `entry`: Entrypoint file path (usually `"index.ts"`).

```json
{
  "name": "TemplateSkill",
  "category": "shared",
  "description": "Boilerplate description for the Template Skill",
  "version": "1.0.0",
  "entry": "index.ts"
}
```

### 2. `permissions.json`
To run LLM generation or interact with system components, skills must declare permissions:
- `provider`: Required if the skill needs to invoke the LLM model provider (`getModelProvider().generate()`).

```json
{
  "permissions": [
    "provider"
  ]
}
```

---

## ⚠️ Important Note on Import Path Errors

If you copy files from this directory directly, you may notice TypeScript import errors.

### Why this happens:
1. **Relative Path Traversal Difference**:
   - This template is stored at `c:\aegis\templates\skill\`, which is **2 directories deep** from the repository root. Therefore, it imports types using `../../aegis-core/...`.
   - Active skills are placed in `c:\aegis\skills\shared\<SkillName>\`, which is **3 directories deep** from the repository root.
   - When you copy these template files into your active skill folder, you **must adjust the relative paths** to go up three levels: change `../../aegis-core/...` to `../../../aegis-core/...` in `execute.ts`.

2. **TypeScript ESM Resolution (`.js` extensions)**:
   - Always append `.js` to relative imports (e.g., `import execute from './execute.js'`) even though the source file on disk is `.ts`.

---

## 🛠️ Accessing Core Services

The `context` parameter passed to `execute` provides safe access to permitted services:
```typescript
import type { SkillContext } from '../../../aegis-core/src/skills/SkillContext.js';

export default async function execute(input: any, context: SkillContext): Promise<any> {
  // Call the permitted LLM provider
  const modelProvider = context.services.getModelProvider();
  
  // Access centralized event bus
  const eventBus = context.services.getEventBus();
  
  // Read skill-specific configuration
  const skillConfig = context.config;
}
```

---

## 🔄 Dynamic Management Commands

To run your skill, copy its folder into the `skills/` directory (e.g., `skills/shared/my-skill`).

From the AEGIS command line, manage it dynamically:

- **Add/Load a Skill:**
  ```bash
  /add skill shared/my-skill
  ```
- **Remove/Unload a Skill:**
  ```bash
  /remove skill shared/my-skill
  ```
- **Update/Reload a Skill:**
  ```bash
  /update skill shared/my-skill
  ```
- **View Active Skills:**
  ```bash
  /skills
  ```
