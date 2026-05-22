import initialize from './initialize.js';
import shutdown from './shutdown.js';

export default {
  name: "telemetry",
  category: "shared",
  description: "Runtime metrics and performance tracking",
  version: "1.0.0",
  initialize,
  shutdown
};
