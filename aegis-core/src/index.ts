import { Bootloader } from '@aegis/runtime';

Bootloader.boot()
  .then(() => {
    console.log('[AEGIS] Platform Microkernel booted successfully.');
  })
  .catch(err => {
    console.error('[AEGIS] Fatal error during platform bootstrap:', err);
    process.exit(1);
  });

