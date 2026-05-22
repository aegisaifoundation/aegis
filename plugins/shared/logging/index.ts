import initialize from './initialize.js';
import shutdown from './shutdown.js';

export default {
  name: "logging",
  category: "shared",
  description: "Centralized runtime logging infrastructure",
  version: "1.0.0",
  initialize,
  shutdown
};
