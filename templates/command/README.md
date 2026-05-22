# Step-by-Step Guide: Creating a Custom Command

Commands are interactive inputs prefixed by a slash (e.g., `/tools`, `/register`) that orchestrate or control the AEGIS runtime.

---

## ⚠️ Important Note on Import Path Errors

If you open the template files (`execute.ts`) directly inside this `templates/command/` directory, or copy them directly to your destination folder, you may notice import errors on the type imports from `aegis-core`.

### Why this happens:
1. **Relative Path Traversal Difference**:
   - This template is stored at `c:\aegis\templates\command\`, which is **2 directories deep** from the repository root. Therefore, it imports from `aegis-core` using `../../aegis-core/...`.
   - Active commands are placed in `c:\aegis\commands\shared\<CommandName>\`, which is **3 directories deep** from the repository root.
   - When you copy these template files into your active command folder, you **must adjust the relative paths** to go up three levels: change `../../aegis-core/...` to `../../../aegis-core/...` in `execute.ts`.

2. **Decoupled Architecture singleton imports**:
   - Always resolve runtime singletons and managers (like `toolRegistry`, `config`, etc.) via `context.services` instead of relative path value imports. This ensures that the command uses the exact same instance in the running compiled process.

---

## Step-by-Step Instructions

### Step 1: Create the Folder
Create a new directory under `c:\aegis\commands\shared/` naming it after your slash trigger:
```bash
mkdir c:\aegis\commands\shared\mycommand
```

### Step 2: Copy the Template Files
Copy all files from `c:\aegis\templates\command/` into your new folder:
- `command.json`
- `permissions.json`
- `index.ts`
- `execute.ts`

*(Note: Do not copy this README.md file itself to the destination folder).*

### Step 3: Fix the Relative Imports
Open `execute.ts` in your new command folder, and update the type imports to use three levels of directory traversal:
```typescript
// Change this:
import type { CommandContext, CommandResult } from '../../aegis-core/src/commands/index.js';

// To this:
import type { CommandContext, CommandResult } from '../../../aegis-core/src/commands/index.js';
```

### Step 4: Configure Metadata (`command.json` and `index.ts`)
*   Update `command.json` to define:
    - `"name"`: The command trigger word (e.g., `mycommand` for `/mycommand`).
    - `"category"`: The command category (e.g., `shared`).
*   Update `index.ts` to matching exports and description:
    - Set `name: 'mycommand'`
    - Provide a descriptive text for `/help`.

### Step 5: Implement Your Logic
Write your command logic inside `execute.ts`. Leverage `context.services` to execute or query runtime states.

### Step 6: Build and Test
Compile the TypeScript code:
```bash
cd c:\aegis\aegis-core
npm run build
```
Boot the agent and trigger your new command (e.g., `/mycommand`) to verify it works!
