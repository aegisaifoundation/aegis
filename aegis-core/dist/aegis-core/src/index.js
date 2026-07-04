import { bootstrapManager } from './runtime/BootstrapManager.js';
import { startApiServer } from './api/ApiServer.js';
bootstrapManager.bootstrap()
    .then(() => {
    // Starts the core API HTTP server once the system is fully bootstrapped
    startApiServer();
})
    .catch(err => {
    console.error('Fatal Error during AEGIS bootstrap:', err);
    process.exit(1);
});
