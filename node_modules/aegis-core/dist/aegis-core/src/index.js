import { bootstrapManager } from './runtime/BootstrapManager.js';
bootstrapManager.bootstrap().catch(err => {
    console.error('Fatal Error during AEGIS bootstrap:', err);
    process.exit(1);
});
