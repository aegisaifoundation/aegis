import initialize from './initialize.js';
import shutdown from './shutdown.js';

export default {
  name: "monitoring",
  category: "shared",
  description: "Runtime health monitoring",
  version: "1.0.0",
  initialize,
  shutdown
};
