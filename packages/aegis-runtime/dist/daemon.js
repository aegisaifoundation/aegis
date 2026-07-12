import { Bootloader } from './boot/Bootloader.js';
console.log('[Daemon] Initializing Aegis Runtime Daemon...');
Bootloader.boot()
    .then(() => {
    console.log('[Daemon] Aegis Runtime Daemon is fully initialized and active.');
})
    .catch(err => {
    console.error('[Daemon] Fatal error during startup:', err);
    process.exit(1);
});
