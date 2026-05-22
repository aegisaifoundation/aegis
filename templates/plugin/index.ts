import initialize from './initialize.js';
import shutdown from './shutdown.js';

export default {
  name: "TemplatePlugin",
  category: "shared",
  description: "Boilerplate description for the Template Plugin",
  version: "1.0.0",
  initialize,
  shutdown
};
