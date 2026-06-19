import { bootstrapManager } from './runtime/BootstrapManager.js';
import { startApiServer } from './api/ApiServer.js';

bootstrapManager.bootstrap()
  .then(() => {
    startApiServer();
  })
  .catch(err => {
    console.error('Fatal Error during AEGIS bootstrap:', err);
    process.exit(1);
  });

