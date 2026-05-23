# Step-by-Step Guide: Creating a Custom Model Provider

Providers are inference bridges in AEGIS that perform LLM prompt generations and token streaming (e.g., local llama.cpp wrappers, OpenAI-compatible APIs, or custom simulation nodes).

---

## ⚠️ Important Note on Import Path Errors

If you open the template files (`index.ts`) directly inside this `templates/provider/` directory, or copy them directly to your destination folder, you may notice import errors on the type imports from `aegis-core`.

### Why this happens:
1. **Relative Path Traversal Difference**:
   - This template is stored at `c:\aegis\templates\provider\`, which is **2 directories deep** from the repository root. Therefore, it imports from `aegis-core` using `../../aegis-core/...`.
   - Active providers are typically placed in `c:\aegis\providers\<category>\<ProviderName>\`, which is **3 directories deep** from the repository root (e.g., `local/ollama`, `api/openai-compatible`).
   - When you copy these template files into your active provider folder, you **must adjust the relative paths** to go up three levels: change `../../aegis-core/...` to `../../../aegis-core/...` in `index.ts`.

2. **TypeScript ESM Resolution (`.js` extensions)**:
   - AEGIS uses `NodeNext` ESM module resolution. In the import statements (e.g., `import { Provider } from '../../aegis-core/.../Provider.js'`), you must write `.js` even though the source file is `.ts`. The TypeScript compiler and runtime (`tsx`) resolve this correctly.

---

## Step-by-Step Instructions

### Step 1: Create the Folder
Create a new directory under `c:\aegis\providers/` matching your provider category and name (e.g., `local/my-provider` or `api/my-api`):
```bash
mkdir c:\aegis\providers\local\my-provider
```

### Step 2: Copy the Template Files
Copy all files from `c:\aegis\templates\provider/` into your new folder:
- `provider.json`
- `permissions.json`
- `index.ts`

*(Note: Do not copy this README.md file itself to the destination folder).*

### Step 3: Fix the Relative Imports
Open `index.ts` in your new provider folder, and update the imports to use three levels of directory traversal:
```typescript
// Change this:
import { Provider, ChatMessage } from '../../aegis-core/src/providers/Provider.js';
import { ProviderContext } from '../../aegis-core/src/providers/ProviderContext.js';

// To this:
import { Provider, ChatMessage } from '../../../aegis-core/src/providers/Provider.js';
import { ProviderContext } from '../../../aegis-core/src/providers/ProviderContext.js';
```

### Step 4: Configure Metadata (`provider.json` and `index.ts`)
*   Update `provider.json` to define:
     - `"name"`: The exact identifier name of your provider (e.g., `local/my-provider`).
     - `"category"`: The classification of your provider (e.g., `local`, `api`, or `custom`).
*   Update `index.ts` to matching exports and description:
     - Set the name, category, and version in the class properties.
     - Implement the `initialize`, `shutdown`, `checkAvailability`, `streamChat`, and `generate` methods.

### Step 5: Build the Project
Compile the TypeScript code from the core folder:
```bash
cd c:\aegis\aegis-core
npm run build
```

### Step 6: Register and Test
Boot the AEGIS agent and register the new provider dynamically:
```
/add provider local/my-provider
```
Verify it is loaded and query active options:
```
/provider
```
Switch active execution to it:
```
/switch local/my-provider
```
