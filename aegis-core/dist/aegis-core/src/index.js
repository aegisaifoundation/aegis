import { Bootloader } from '@aegis/runtime';
import { engineManager } from '@aegis/runtime/dist/managers/EngineManager.js';
import { DummyEngine } from '@aegis/runtime/dist/test/DummyEngine.js';
import { AgentEngine } from '@aegis/agent';
import { MemoryEngine } from '@aegis/memory';
import { ApiEngine } from '@aegis/api';
// Register pluggable engines before boot
engineManager.register(new DummyEngine());
engineManager.register(new AgentEngine());
engineManager.register(new MemoryEngine());
engineManager.register(new ApiEngine());
Bootloader.boot()
    .then(() => {
    console.log('[AEGIS] Platform Microkernel booted successfully.');
})
    .catch(err => {
    console.error('[AEGIS] Fatal error during platform bootstrap:', err);
    process.exit(1);
});
