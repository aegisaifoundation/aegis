# Step-by-Step Guide: Creating a Custom Tool

Tools are execution units in AEGIS that perform actions (e.g., file reading/writing, database queries, network requests).

---

## Quick Start

### Step 1: Create the Tool Folder

Create a new directory under `c:\aegis\tools\shared\` named after your tool:
```
c:\aegis\tools\shared\MyCustomTool\
```

### Step 2: Copy the Template Files

Copy all files from this `templates/tool/` folder into your new folder:
- `tool.json`
- `permissions.json`
- `index.ts`
- `execute.ts`

> ⚠️ Do **not** copy this `README.md` into the destination folder.

### Step 3: Configure Metadata

**`tool.json`** — Describes the tool:
```json
{
  "name": "MyCustomTool",
  "version": "1.0.0",
  "description": "What this tool does",
  "permissions": ["filesystem"],
  "actions": ["myAction"]
}
```

**`index.ts`** — Exports the tool and maps action names to functions:
```typescript
import myAction from './myAction.js';

export default {
  name: 'MyCustomTool',
  version: '1.0.0',
  description: 'What this tool does. Actions: myAction.',
  actions: {
    myAction
  }
};
```

**`permissions.json`** — Declares what the tool needs:
```json
["filesystem"]
```

### Step 4: Implement Your Action

Edit `execute.ts` to implement your logic. The imports are already correct:

```typescript
import type { ToolContext } from '@aegis/runtime';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  // Your logic here
  return 'result';
}
```

**Key imports you can use:**
| Import | Package | Purpose |
|--------|---------|---------|
| `ToolContext` | `@aegis/runtime` | Type for the context parameter |
| `safeResolve` | `@aegis/runtime` | Safely resolve file paths inside workspace |
| `memoryManager` | `@aegis/memory` | Read/write agent memory |

**Example with file access:**
```typescript
import type { ToolContext } from '@aegis/runtime';
import { safeResolve } from '@aegis/runtime';
import fs from 'fs/promises';

export default async function execute(input: any, context: ToolContext): Promise<string> {
  const filePath = input.path;
  const target = safeResolve(context.workspacePath, filePath);
  return await fs.readFile(target, 'utf-8');
}
```

### Step 5: No Build or Registration Needed 🎉

You do **not** need to:
- Compile your tool — AEGIS loads `.ts` files directly via `tsx`
- Register the tool in any core file — just use the UI

To activate your tool:
1. Open the AEGIS Desktop UI
2. Go to **Agent → Tools**
3. Toggle **MyCustomTool** to enable it

---

## Directory Structure

```
tools/shared/MyCustomTool/
├── tool.json          # Metadata (name, version, actions)
├── permissions.json   # Required permissions
├── index.ts           # Entry point — maps action names to functions
└── execute.ts         # Action implementation (rename as needed)
```

---

## Important Notes

- **ESM resolution**: Use `.js` extensions in import statements (e.g., `import myAction from './myAction.js'`). TypeScript/tsx resolves these correctly.
- **Type imports**: Always use `import type { ... }` for types to avoid ESM runtime errors.
- **Never import from `aegis-core`** — that path does not exist. Use `@aegis/runtime`, `@aegis/skills`, `@aegis/tools`, `@aegis/plugins`, or `@aegis/memory`.
