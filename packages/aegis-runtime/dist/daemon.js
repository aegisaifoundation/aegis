import { Bootloader } from './boot/Bootloader.js';
// Keep the process alive and log any uncaught errors
process.on('uncaughtException', (err) => {
    console.error('[Daemon] Uncaught Exception:', err.message, err.stack);
});
process.on('unhandledRejection', (reason) => {
    console.error('[Daemon] Unhandled Promise Rejection:', reason?.message || reason, reason?.stack || '');
});
console.log('[Daemon] Initializing Aegis Runtime Daemon...');
Bootloader.boot()
    .then(() => {
    console.log('[Daemon] Aegis Runtime Daemon is fully initialized and active.');
})
    .catch(err => {
    console.error('[Daemon] Fatal error during startup:', err);
    process.exit(1);
});
