import initialize from './initialize.js';
import shutdown from './shutdown.js';

export default {
  name: "analytics",
  category: "shared",
  description: "Runtime behavioral analytics",
  version: "1.0.0",
  initialize,
  shutdown
};
