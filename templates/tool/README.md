# Step-by-Step Guide: Creating a Custom Tool

Tools are execution units in AEGIS that perform actions (e.g., file writing, database queries, network requests).

---

## ⚠️ Important Note on Import Path Errors

If you open the template files (`execute.ts`) directly inside this `templates/tool/` directory, or copy them directly to your destination folder, you may notice import errors on the type imports from `aegis-core`.

### Why this happens:
1. **Relative Path Traversal Difference**:
   - This template is stored at `c:\aegis\templates\tool\`, which is **2 directories deep** from the repository root. Therefore, it imports from `aegis-core` using `../../aegis-core/...`.
   - Active tools are placed in `c:\aegis\tools\shared\<ToolName>\`, which is **3 directories deep** from the repository root.
   - When you copy these template files into your active tool folder, you **must adjust the relative paths** to go up three levels: change `../../aegis-core/...` to `../../../aegis-core/...` in `execute.ts`.

2. **TypeScript ESM Resolution (`.js` extensions)**:
   - AEGIS uses `NodeNext` ESM module resolution. In the import statements (e.g., `import sampleAction from './execute.js'`), you must write `.js` even though the source file is `.ts`. The TypeScript compiler and runtime (`tsx`) resolve this correctly.

---

## Step-by-Step Instructions

### Step 1: Create the Folder
Create a new directory under `c:\aegis\tools\shared/` naming it after your tool:
```bash
mkdir c:\aegis\tools\shared\MyCustomTool
```

### Step 2: Copy the Template Files
Copy all files from `c:\aegis\templates\tool/` into your new folder:
- `tool.json`
- `permissions.json`
- `index.ts`
- `execute.ts`

*(Note: Do not copy this README.md file itself to the destination folder).*

### Step 3: Fix the Relative Imports
Open `execute.ts` in your new tool folder, and update the import of `ToolContext` to use three levels of directory traversal:
```typescript
// Change this:
import type { ToolContext } from '../../aegis-core/src/types/Tool.js';

// To this:
import type { ToolContext } from '../../../aegis-core/src/types/Tool.js';
```

### Step 4: Configure Metadata (`tool.json` and `index.ts`)
*   Update `tool.json` to define:
    - `"name"`: The exact name of your tool class (e.g., `MyCustomTool`).
    - `"actions"`: Array of actions your tool supports (e.g., `["myAction"]`).
*   Update `index.ts` to matching exports and description:
    - Set `name: 'MyCustomTool'`
    - Define actions mappings pointing to your implementation functions.

### Step 5: Implement Your Actions
Implement your custom logic inside `execute.ts` (or create separate action files and import them in `index.ts`).

### Step 6: Build the Project
Compile the TypeScript code from the core folder:
```bash
cd c:\aegis\aegis-core
npm run build
```

### Step 7: Register and Test
Boot the AEGIS agent or run your command to register the new tool dynamically:
```
/register shared/MyCustomTool
```
Verify it is loaded by typing `/tools`.
